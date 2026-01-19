"use server";

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createStreamableValue } from "@ai-sdk/rsc";
// Use zod/v3 for compatibility with langchain and zod-to-json-schema
import { z } from "zod/v3";
import { Runnable } from "@langchain/core/runnables";
import { zodToJsonSchema } from "zod-to-json-schema";
import { JsonOutputKeyToolsParser } from "@langchain/core/output_parsers/openai_tools";

const Weather = z
  .object({
    city: z.string().describe("City to search for weather"),
    state: z.string().describe("State abbreviation to search for weather"),
  })
  .describe("Weather search parameters");

export async function executeTool(
  input: string,
  options?: {
    wso?: boolean;
    streamEvents?: boolean;
  },
) {
  "use server";

  const stream = createStreamableValue();

  (async () => {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are a helpful assistant. Use the tools provided to best assist the user.`,
      ],
      ["human", "{input}"],
    ]);

    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    let chain: Runnable;

    if (options?.wso) {
      chain = prompt.pipe(
        llm.withStructuredOutput(Weather, {
          name: "get_weather",
        }),
      );
    } else {
      // Use type casts to work around zod v3/v4 type conflicts
      const weatherAny: any = Weather;
      const toolDefinition = {
        type: "function" as const,
        function: {
          name: "get_weather",
          description: Weather.description,
          parameters: zodToJsonSchema(weatherAny),
        },
      };
      chain = prompt
        .pipe(llm.bindTools([toolDefinition]))
        .pipe(
          new JsonOutputKeyToolsParser({
            keyName: "get_weather",
            zodSchema: weatherAny,
          }),
        );
    }

    if (options?.streamEvents) {
      const streamResult = chain.streamEvents(
        {
          input,
        },
        {
          version: "v2",
        },
      );

      for await (const item of streamResult) {
        stream.update(JSON.parse(JSON.stringify(item, null, 2)));
      }
    } else {
      const streamResult = await chain.stream({
        input,
      });

      for await (const item of streamResult) {
        stream.update(JSON.parse(JSON.stringify(item, null, 2)));
      }
    }

    stream.done();
  })();

  return { streamData: stream.value };
}
