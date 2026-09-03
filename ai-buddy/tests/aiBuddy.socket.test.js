const http = require("http");
const jwt = require("jsonwebtoken");
const { io: ioClient } = require("socket.io-client");

jest.mock("../src/agent/agent", () => ({
  invoke: jest.fn(async () => ({
    messages: [{ content: "Here are some red sneakers under 2000." }],
  })),
}));

const agent = require("../src/agent/agent");
const { initSocketServer } = require("../src/sockets/socket.server");

const SOCKET_PATH = "/api/socket/socket.io/";

let httpServer;
let baseUrl;

beforeAll(async () => {
  httpServer = http.createServer();
  await initSocketServer(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  baseUrl = `http://localhost:${httpServer.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
});

beforeEach(() => {
  jest.clearAllMocks();
});

function connect(cookie) {
  return ioClient(baseUrl, {
    path: SOCKET_PATH,
    transports: ["websocket"],
    reconnection: false,
    extraHeaders: cookie ? { Cookie: cookie } : {},
  });
}

function settle(socket) {
  return new Promise((resolve) => {
    socket.on("connect", () => resolve({ connected: true }));
    socket.on("connect_error", (err) =>
      resolve({ connected: false, message: err.message }),
    );
  });
}

describe("ai-buddy socket handshake", () => {
  it("rejects a connection with no cookie", async () => {
    const socket = connect(null);
    const result = await settle(socket);
    socket.close();

    expect(result.connected).toBe(false);
    expect(result.message).toBe("Token not provided");
  });

  it("rejects a connection with an invalid token", async () => {
    const socket = connect("token=not.a.real.token");
    const result = await settle(socket);
    socket.close();

    expect(result.connected).toBe(false);
    expect(result.message).toBe("Invalid token");
  });

  it("rejects a token signed with the wrong secret", async () => {
    const forged = jwt.sign({ id: "u1", role: "user" }, "wrong_secret");
    const socket = connect(`token=${forged}`);
    const result = await settle(socket);
    socket.close();

    expect(result.connected).toBe(false);
    expect(result.message).toBe("Invalid token");
  });

  it("accepts a valid token", async () => {
    const token = jwt.sign(
      { id: "u1", role: "user", username: "dhruv" },
      process.env.JWT_SECRET,
    );
    const socket = connect(`token=${token}`);
    const result = await settle(socket);
    socket.close();

    expect(result.connected).toBe(true);
  });

  it("answers a message with the agent's reply", async () => {
    const token = jwt.sign(
      { id: "u1", role: "user", username: "dhruv" },
      process.env.JWT_SECRET,
    );
    const socket = connect(`token=${token}`);
    await settle(socket);

    const reply = await new Promise((resolve) => {
      socket.on("message", resolve);
      socket.emit("message", "find me red sneakers under 2000");
    });
    socket.close();

    expect(reply).toBe("Here are some red sneakers under 2000.");
  });

  it("passes the caller's token to the agent so tools act as that user", async () => {
    const token = jwt.sign(
      { id: "u1", role: "user", username: "dhruv" },
      process.env.JWT_SECRET,
    );
    const socket = connect(`token=${token}`);
    await settle(socket);

    await new Promise((resolve) => {
      socket.on("message", resolve);
      socket.emit("message", "hello");
    });
    socket.close();

    expect(agent.invoke).toHaveBeenCalledTimes(1);
    const [state, config] = agent.invoke.mock.calls[0];
    expect(state.messages[0]).toMatchObject({
      role: "user",
      content: "hello",
    });
    expect(config.metadata.token).toBe(token);
  });
});
