import { NextRequest, NextResponse } from "next/server";

/*
 * POST /api/generate-comment
 * Body: {
 *   postText: string;        // the hiring post/thread they're replying to
 *   name: string;            // sender's name
 *   niche: string;           // e.g. "meme pages", "logo design", "video editing"
 *   experience: string;      // e.g. "2+ years"
 *   link: string;            // portfolio / booking / whatsapp link
 * }
 * Returns: {
 *   comment: string;
 *   followUpDm: string;
 *   contacts: { emails: string[]; phones: string[] };
 * }
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

// Deterministic contact extraction — don't trust the LLM for this, regex is exact.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?\d{10}\b|\+\d{1,3}\s?\d{4,14}/g;

function extractContacts(text: string) {
  const emails = Array.from(new Set(text.match(EMAIL_RE) ?? []));
  const phones = Array.from(new Set(text.match(PHONE_RE) ?? [])).filter(
    (p) => p.replace(/\D/g, "").length >= 10
  );
  return { emails, phones };
}

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
  const postText = String((record as { postText?: unknown }).postText ?? "").trim();
  const name = String((record as { name?: unknown }).name ?? "").trim();
  const niche = String((record as { niche?: unknown }).niche ?? "").trim();
  const experience = String((record as { experience?: unknown }).experience ?? "").trim();
  const link = String((record as { link?: unknown }).link ?? "").trim();

  if (!postText) {
    return NextResponse.json({ error: "Paste the post text first." }, { status: 400 });
  }
  if (!name || !niche) {
    return NextResponse.json(
      { error: "Name and niche are required." },
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

  const contacts = extractContacts(postText);

  const systemPrompt = `You write short LinkedIn/Twitter/thread REPLIES for a freelancer trying to land a client from a hiring post. The reply must NOT sound AI-generated. Match how a real person types fast on their phone:

- Short lines, broken into 2-4 line chunks with a blank line between chunks (like someone hitting enter instead of writing one paragraph).
- Casual, slightly imperfect grammar — skip a comma here, lowercase "i" sometimes is fine, contractions, no corporate words like "leverage", "synergy", "passionate about".
- No emojis spam — at most one, and only if it fits naturally. No hashtags.
- Reference something SPECIFIC from their post (the role, the niche, a detail they mentioned) so it doesn't read like a copy-paste template.
- Structure loosely: quick intro with name + what you do + years of experience -> one line showing you get their specific need -> soft CTA with the link, low-pressure ("lmk if you wanna check it out" style, not "contact me now").
- Keep it under 60 words total. This is a comment/reply, not an email.
- Never use the words "AI", "generated", or sound like a pitch deck.

Also write a short followUpDm: a casual DM template to send IF the poster replies or DMs back interested. Same humanized rules apply, under 50 words, should ask 1-2 qualifying questions (budget/timeline/what exactly they need) so the freelancer knows what to say next — this is the "what do I do if they reply" step.`;

  const userPrompt = `Sender name: ${name}
Niche/skill: ${niche}
Experience: ${experience || "a couple years"}
Link to share: ${link || "(no link given, skip it)"}

Hiring post to reply to:
"""
${postText.slice(0, 2000)}
"""`;

  try {
    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.9,
        max_completion_tokens: 500,
        reasoning_effort: "low",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "humanized_reply",
            strict: true,
            schema: {
              type: "object",
              properties: {
                comment: { type: "string" },
                followUpDm: { type: "string" },
              },
              required: ["comment", "followUpDm"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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

    let comment = "";
    let followUpDm = "";
    try {
      const parsed = JSON.parse(raw);
      comment = typeof parsed.comment === "string" ? parsed.comment : "";
      followUpDm = typeof parsed.followUpDm === "string" ? parsed.followUpDm : "";
    } catch {
      // fall through with empty strings — handled below
    }

    if (!comment) {
      return NextResponse.json(
        { error: "Model returned an empty reply, try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ comment, followUpDm, contacts });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error contacting Groq." },
      { status: 500 }
    );
  }
}