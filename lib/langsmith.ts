import { openai } from "@ai-sdk/openai";
import { wrapAISDK } from "langsmith/experimental/vercel";
import * as ai from "ai";
import { tool, convertToModelMessages, stepCountIs } from "ai";

// Wrap AI SDK functions with LangSmith tracing
const { streamText, generateText, generateObject } = wrapAISDK(ai);

export { openai, streamText, generateText, generateObject, tool, convertToModelMessages, stepCountIs };
