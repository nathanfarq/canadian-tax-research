import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversations });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const title = body.title || null;

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title })
      .select("id, title, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
