import { NextRequest, NextResponse } from "next/server";



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

  const keyword =
    typeof body === "object" && body !== null && "keyword" in body
      ? String((body as { keyword: unknown }).keyword ?? "")
      : "";

  const trimmed = keyword.trim();

  if (!trimmed) {
    return NextResponse.json(
      { error: "A keyword is required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Don't hard-fail the UX over a missing key — just say "no change".
    return NextResponse.json({
      original: trimmed,
      corrected: trimmed,
      wasCorrected: false,
    });
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
        temperature: 0.2,
        max_completion_tokens: 200,
        reasoning_effort: "low",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "keyword_correction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                corrected: { type: "string" },
              },
              required: ["corrected"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You fix spelling and obvious typos in short job-title / skill / keyword phrases used for LinkedIn search (e.g. 'flutr devloper' -> 'Flutter developer', 'reactjs dev' -> 'React.js developer'). Preserve the user's intent and length — do not expand into a sentence, do not add extra words, do not change meaning. If the input already looks correct, return it unchanged. Return only the corrected phrase, no punctuation wrapping, no explanation.",
          },
          {
            role: "user",
            content: `Keyword: "${trimmed}"`,
          },
        ],
      }),
    });

    if (!groqRes.ok) {
      return NextResponse.json({
        original: trimmed,
        corrected: trimmed,
        wasCorrected: false,
      });
    }

    const data = await groqRes.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "{}";

    let corrected = trimmed;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.corrected === "string" && parsed.corrected.trim()) {
        corrected = parsed.corrected.trim();
      }
    } catch {
      corrected = trimmed;
    }

    // Guard against the model going rogue and returning something wildly
    // different in length (a sign it "helpfully" expanded the phrase).
    if (corrected.length > trimmed.length * 3 + 20) {
      corrected = trimmed;
    }

    const wasCorrected =
      corrected.toLowerCase() !== trimmed.toLowerCase() && corrected.length > 0;

    return NextResponse.json({
      original: trimmed,
      corrected: wasCorrected ? corrected : trimmed,
      wasCorrected,
    });
  } catch {
    return NextResponse.json({
      original: trimmed,
      corrected: trimmed,
      wasCorrected: false,
    });
  }
}