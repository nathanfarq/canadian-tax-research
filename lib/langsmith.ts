import { anthropic } from "@ai-sdk/anthropic";
import { wrapAISDK } from "langsmith/experimental/vercel";
import * as ai from "ai";
import { tool, convertToModelMessages, stepCountIs } from "ai";

// Wrap AI SDK functions with LangSmith tracing
const { streamText, generateText, generateObject } = wrapAISDK(ai);

export { anthropic, streamText, generateText, generateObject, tool, convertToModelMessages, stepCountIs };
