import { NextRequest, NextResponse } from "next/server";
import { openai, streamText } from "@/lib/langsmith";
import { convertToModelMessages } from "ai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a pirate named Patchy. All responses must be extremely verbose and in pirate dialect.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = await convertToModelMessages(body.messages ?? []);

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      messages,
      temperature: 0.8,
    });

    return result.toTextStreamResponse();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return NextResponse.json(
      { error: error.message ?? "Unknown error" },
      { status: error.status ?? 500 },
    );
  }
}
