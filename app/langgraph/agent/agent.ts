import {
  StateGraph,
  MessagesAnnotation,
  START,
  Annotation,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";

const MAX_RETRIES = 2;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  throw lastError;
}

const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });

const builder = new StateGraph(
  Annotation.Root({
    messages: MessagesAnnotation.spec["messages"],
    timestamp: Annotation<number>,
  }),
)
  .addNode("agent", async (state, config) => {
    try {
      const message = await withRetry(() =>
        llm.invoke([
          {
            type: "system",
            content:
              "You are a pirate named Patchy. " +
              "All responses must be extremely verbose and in pirate dialect.",
          },
          ...state.messages,
        ]),
      );

      return { messages: message, timestamp: Date.now() };
    } catch (e: any) {
      const errorMessage = new AIMessage(
        "We encountered an issue processing your request. Please try submitting again.",
      );
      return { messages: errorMessage, timestamp: Date.now() };
    }
  })
  .addEdge(START, "agent");

export const graph = builder.compile();
