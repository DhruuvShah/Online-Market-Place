const { StateGraph, MessagesAnnotation } = require("@langchain/langgraph");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const {
  ToolMessage,
  AIMessage,
  HumanMessage,
} = require("@langchain/core/messages");
const tools = require("./tools");

// Preview model names get retired, so the name is overridable without a code
// change when that happens.
const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

let model = null;

function isConfigured() {
  return Boolean(process.env.GOOGLE_API_KEY);
}

/**
 * Built on first use rather than at import. The constructor throws when there
 * is no API key, and doing that at module load took the whole service down
 * with it — health checks included — over what is only a config problem.
 */
function getModel() {
  if (model) return model;

  if (!isConfigured()) {
    const error = new Error(
      "GOOGLE_API_KEY is not set, so the assistant cannot answer",
    );
    error.code = "AGENT_NOT_CONFIGURED";
    throw error;
  }

  model = new ChatGoogleGenerativeAI({ model: MODEL, temperature: 0.5 });
  return model;
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("tools", async (state, config) => {
    const lastMessage = state.messages[state.messages.length - 1];

    const toolsCall = lastMessage.tool_calls;

    const toolCallResults = await Promise.all(
      toolsCall.map(async (call) => {
        const tool = tools[call.name];
        if (!tool) {
          throw new Error(`Tool ${call.name} not found`);
        }
        const toolInput = call.args;

        const toolResult = await tool.func({
          ...toolInput,
          token: config.metadata.token,
        });

        return new ToolMessage({ content: toolResult, name: call.name });
      }),
    );

    state.messages.push(...toolCallResults);

    return state;
  })
  .addNode("chat", async (state, config) => {
    const response = await getModel().invoke(state.messages, {
      tools: [tools.searchProduct, tools.addProductToCart],
    });

    state.messages.push(
      new AIMessage({
        content: response.text,
        tool_calls: response.tool_calls,
      }),
    );

    return state;
  })
  .addEdge("__start__", "chat")
  .addConditionalEdges("chat", async (state) => {
    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return "tools";
    } else {
      return "__end__";
    }
  })
  .addEdge("tools", "chat");

const agent = graph.compile();

module.exports = agent;
module.exports.isConfigured = isConfigured;
module.exports.MODEL = MODEL;
