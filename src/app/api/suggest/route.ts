import { NextRequest, NextResponse } from "next/server";

/*
 * POST /api/suggest
 * Body: { keyword: string }
 * Returns: { suggestions: string[] }
 *
 * Uses GROQ_API_KEY from .env.local (server-side only — never exposed
 * to the client). Requires no other setup on your end.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// llama-3.3-70b-versatile was deprecated by Groq — openai/gpt-oss-120b
// is the current recommended production model for general text tasks.
// openai/gpt-oss-20b is a faster/cheaper fallback if you hit rate limits.
const GROQ_MODEL = "openai/gpt-oss-120b";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON." },
      { status: 400 }
    );
  }

  const keyword =
    typeof body === "object" && body !== null && "keyword" in body
      ? String((body as { keyword: unknown }).keyword ?? "")
      : "";

  if (!keyword.trim()) {
    return NextResponse.json(
      { error: "A keyword is required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  try {
    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.6,
        // gpt-oss models spend part of the budget on an internal
        // reasoning pass before writing the final answer — 250 tokens
        // let reasoning eat the whole budget and leave nothing for the
        // actual JSON, which is what produced the empty
        // `failed_generation`. Give it real headroom.
        max_completion_tokens: 600,
        reasoning_effort: "low",
        // json_object is "best effort" and gpt-oss models on Groq
        // frequently fail to close valid JSON under it. json_schema
        // with strict: true uses constrained decoding, so the output
        // is guaranteed to match the schema — it can't fail this way.
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "keyword_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 6,
                  maxItems: 6,
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You generate short, high-signal LinkedIn search keywords for lead generation. Given a seed keyword, return 6 closely related variations a recruiter or salesperson would actually search for on LinkedIn (adjacent job titles, niches, tech stacks, or industries). Each suggestion must be 1-4 words, no hashtags, no numbering, no explanations.",
          },
          {
            role: "user",
            content: `Seed keyword: "${keyword.trim()}"`,
          },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return NextResponse.json(
        { error: `Groq request failed (${groqRes.status}): ${errText}` },
        { status: 502 }
      );
    }

    const data = await groqRes.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "{}";

    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions
          .filter((s: unknown): s is string => typeof s === "string")
          .map((s: string) => s.trim())
          .filter(Boolean)
          .slice(0, 6);
      }
    } catch {
      suggestions = [];
    }

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error contacting Groq." },
      { status: 500 }
    );
  }
}