const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const { ToolMessage } = require("@langchain/core/messages");
const agent = require("../agent/agent");

/**
 * Names of the tools the assistant actually ran this turn.
 *
 * The assistant changes things through its own tools — it fills the cart by
 * calling the cart service directly — so the browser has no idea anything
 * happened. Telling it which tools ran lets it refresh exactly what changed
 * instead of the user finding a stale cart and reaching for reload.
 */
function toolsUsedIn(messages = []) {
  return [
    ...new Set(
      messages
        .filter((message) => message instanceof ToolMessage)
        .map((message) => message.name)
        .filter(Boolean),
    ),
  ];
}

async function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    path: "/api/socket/socket.io/",
    cors: {
      origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(","),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const cookies = socket.handshake.headers?.cookie;

    const { token } = cookies ? cookie.parse(cookies) : {};

    if (!token) {
      return next(new Error("Token not provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.user = decoded;
      socket.token = token;

      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("message", async (data) => {
      // Node treats an unhandled rejection as fatal, so without this catch any
      // failure inside the agent — a bad key, a retired model, an exhausted
      // quota, an upstream service being asleep — took the whole process down
      // rather than disappointing one conversation.
      try {
        const agentResponse = await agent.invoke(
          {
            messages: [
              {
                role: "user",
                content: data,
              },
            ],
          },
          {
            metadata: {
              token: socket.token,
            },
          },
        );

        const lastMessage =
          agentResponse.messages[agentResponse.messages.length - 1];

        // Announced before the reply so the cart is already refreshing by the
        // time the user has read "added it for you" and gone to look.
        const used = toolsUsedIn(agentResponse.messages);
        if (used.length) socket.emit("assistant-actions", used);

        socket.emit("message", lastMessage.content);
      } catch (error) {
        console.error("Assistant could not answer:", error.message);

        socket.emit(
          "assistant-error",
          error.code === "AGENT_NOT_CONFIGURED"
            ? "The assistant is not configured on this deployment yet."
            : "The assistant could not answer that. Please try again.",
        );
      }
    });
  });
}

module.exports = { initSocketServer };
