import { NextRequest, NextResponse } from "next/server";

/*
 * POST /api/generate-links
 * Body: { keyword: string; existing?: string[] }
 * Returns: { links: { label: string; query: string; hint: string }[] }
 *
 * Unlike /api/suggest (which suggests adjacent keywords), this route
 * suggests full lead-intent search PHRASES for the given keyword —
 * things people actually write when they're hiring for or looking for
 * that skill, which is what surfaces warm leads instead of just people
 * who happen to mention the skill.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
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

  const record = typeof body === "object" && body !== null ? body : {};
  const keyword = String((record as { keyword?: unknown }).keyword ?? "");
  const existing = Array.isArray((record as { existing?: unknown }).existing)
    ? ((record as { existing?: unknown[] }).existing as unknown[])
        .filter((s): s is string => typeof s === "string")
        .slice(0, 20)
    : [];

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
        temperature: 0.8,
        max_completion_tokens: 700,
        reasoning_effort: "low",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "lead_search_links",
            strict: true,
            schema: {
              type: "object",
              properties: {
                links: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      query: { type: "string" },
                      hint: { type: "string" },
                    },
                    required: ["label", "query", "hint"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["links"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You write short LinkedIn search phrases that surface warm leads for a seed keyword — phrases people actually post when they are HIRING for, LOOKING FOR, or URGENTLY NEEDING that skill or service, not just posts that mention the skill. For each phrase return: query (2-6 words, natural, no hashtags, no quotes), label (a short 2-4 word name for this lead type, e.g. 'Urgent hires', 'Freelance seekers'), and hint (a 4-8 word one-line explanation of who this finds). Return exactly 3, each meaningfully different from one another and from any phrases already used.",
          },
          {
            role: "user",
            content: `Seed keyword: "${keyword.trim()}"${
              existing.length
                ? `\nAlready used, do not repeat these: ${existing.join(", ")}`
                : ""
            }`,
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

    let links: { label: string; query: string; hint: string }[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.links)) {
        links = parsed.links
          .filter(
            (l: unknown): l is { label: string; query: string; hint: string } =>
              typeof l === "object" &&
              l !== null &&
              typeof (l as { label?: unknown }).label === "string" &&
              typeof (l as { query?: unknown }).query === "string" &&
              typeof (l as { hint?: unknown }).hint === "string"
          )
          .slice(0, 3);
      }
    } catch {
      links = [];
    }

    return NextResponse.json({ links });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error contacting Groq." },
      { status: 500 }
    );
  }
}