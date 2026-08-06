import { NextRequest, NextResponse } from "next/server";

/*
 * POST /api/generate-comment
 * Body: {
 *   postText: string;
 *   name: string;
 *   niche: string;
 *   experience: string;
 *   link: string;
 *   email: string;
 *   platform: "linkedin" | "twitter" | "threads";
 *   contactPreference: "dm" | "email" | "comment";
 * }
 * Returns: {
 *   comment: string;
 *   followUpDm: string;
 *   nicheMatch: boolean;   // false when the post asked for something
 *                          // other than the sender's niche and the
 *                          // reply had to pivot honestly instead of
 *                          // pretending to be a fit
 *   contacts: { emails: string[]; phones: string[] };
 * }
 *
 * Changes from the previous version:
 *  - The model is now explicitly told to compare what the POST is
 *    asking for against the sender's niche, and to write an honest
 *    pivot ("not a graphic designer, but I do video editing — here's
 *    my stuff if it's ever useful") when they don't match, instead of
 *    sending the same generic pitch regardless of what the post asked
 *    for. `nicheMatch` reports which branch it took.
 *  - Platform now shapes tone/length (LinkedIn vs X/Twitter vs
 *    Threads have different norms).
 *  - contactPreference now shapes the CTA — DM, plain email, or an
 *    invite to just reply in the comments — instead of always pushing
 *    a link.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?\d{10}\b|\+\d{1,3}\s?\d{4,14}/g;

function extractContacts(text: string) {
  const emails = Array.from(new Set(text.match(EMAIL_RE) ?? []));
  const phones = Array.from(new Set(text.match(PHONE_RE) ?? [])).filter(
    (p) => p.replace(/\D/g, "").length >= 10
  );
  return { emails, phones };
}

type Platform = "linkedin" | "twitter" | "threads";
type ContactPreference = "dm" | "email" | "comment";

const PLATFORMS: Platform[] = ["linkedin", "twitter", "threads"];
const CONTACT_PREFERENCES: ContactPreference[] = ["dm", "email", "comment"];

const PLATFORM_GUIDE: Record<Platform, string> = {
  linkedin:
    "Platform: LinkedIn. Casual but still semi-professional — this is a comment on a hiring post, not a DM to a friend. 2-4 short line breaks, blank line between chunks. No hashtags.",
  twitter:
    "Platform: X/Twitter. Much shorter and punchier than LinkedIn — closer to a fragment than a paragraph. Under 40 words total for the reply. No hashtags. At most one emoji, only if it lands naturally.",
  threads:
    "Platform: Threads. Loose, conversational, a little meme-adjacent is fine — reads like a reply in a group chat, not a pitch. Short lines, very low-pressure tone.",
};

const CONTACT_GUIDE: Record<ContactPreference, string> = {
  dm: "The sender wants people to DM them. End with a low-pressure DM invite. If a link is provided, weave it in naturally (don't just paste a raw URL with no context).",
  email:
    "The sender wants people to email them. End by giving the email address plainly (e.g. 'shoot me an email at {email} if useful'). Do not mention DMs.",
  comment:
    "The sender wants people to just reply in the comments/thread instead of DMing or emailing. End with a low-pressure invite to reply here, e.g. 'happy to share more in the replies if useful'. Do not push a DM or a link.",
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const record = typeof body === "object" && body !== null ? body : {};
  const postText = String((record as { postText?: unknown }).postText ?? "").trim();
  const name = String((record as { name?: unknown }).name ?? "").trim();
  const niche = String((record as { niche?: unknown }).niche ?? "").trim();
  const experience = String((record as { experience?: unknown }).experience ?? "").trim();
  const link = String((record as { link?: unknown }).link ?? "").trim();
  const email = String((record as { email?: unknown }).email ?? "").trim();

  const rawPlatform = String((record as { platform?: unknown }).platform ?? "");
  const platform: Platform = (PLATFORMS as string[]).includes(rawPlatform)
    ? (rawPlatform as Platform)
    : "linkedin";

  const rawContactPreference = String((record as { contactPreference?: unknown }).contactPreference ?? "");
  const contactPreference: ContactPreference = (CONTACT_PREFERENCES as string[]).includes(rawContactPreference)
    ? (rawContactPreference as ContactPreference)
    : "dm";

  if (!postText) {
    return NextResponse.json({ error: "Paste the post text first." }, { status: 400 });
  }
  if (!name || !niche) {
    return NextResponse.json({ error: "Name and niche are required." }, { status: 400 });
  }
  if (contactPreference === "email" && !email) {
    return NextResponse.json(
      { error: "Add an email, or choose DM / Comment instead." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set on the server." }, { status: 500 });
  }

  const contacts = extractContacts(postText);

  const systemPrompt = `You write short REPLIES for a freelancer trying to land a client from a hiring/lookout post. The reply must NOT sound AI-generated — match how a real person types fast on their phone: skip a comma here, contractions, no corporate words like "leverage", "synergy", "passionate about", no hashtag spam.

STEP 1 — read the post and figure out what role/skill/service it's actually asking for.
STEP 2 — compare that against the sender's stated niche below.
  - If they clearly match (or the post is broad enough that the niche fits), write a normal reply: quick intro with name + what you do + experience -> one line showing you get their SPECIFIC need (reference something concrete from the post, not a generic phrase) -> CTA per the contact instructions below. Set nicheMatch to true.
  - If they clearly DON'T match (e.g. the post wants a graphic designer and the sender does video editing), do NOT pretend to be a fit. Write an honest, friendly pivot instead — name + "not a [what the post wants], but I do [sender's niche]" + one line on why that might still be useful to them (or that you know people who do that, if it fits naturally) -> CTA per the contact instructions below, kept extra low-pressure since this is an unsolicited pivot. Set nicheMatch to false.

${PLATFORM_GUIDE[platform]}

CTA rules: ${CONTACT_GUIDE[contactPreference]}

Keep the reply under 60 words total (this is a comment/reply, not an email). Never use the words "AI", "generated", or sound like a pitch deck.

Also write a short followUpDm: a casual message template to send IF the poster responds or DMs back interested. Same humanized rules apply, under 50 words, should ask 1-2 qualifying questions (budget/timeline/what exactly they need) so the freelancer knows what to say next.`;

  const userPrompt = `Sender name: ${name}
Sender's niche/skill: ${niche}
Experience: ${experience || "a couple years"}
Contact preference: ${contactPreference}${contactPreference === "dm" ? ` (link to share: ${link || "(none given, skip it)"})` : ""}${contactPreference === "email" ? ` (email: ${email})` : ""}

Hiring/lookout post to reply to:
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
        max_completion_tokens: 550,
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
                nicheMatch: { type: "boolean" },
              },
              required: ["comment", "followUpDm", "nicheMatch"],
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
    let nicheMatch = true;
    try {
      const parsed = JSON.parse(raw);
      comment = typeof parsed.comment === "string" ? parsed.comment : "";
      followUpDm = typeof parsed.followUpDm === "string" ? parsed.followUpDm : "";
      nicheMatch = typeof parsed.nicheMatch === "boolean" ? parsed.nicheMatch : true;
    } catch {
      // fall through with empty strings — handled below
    }

    if (!comment) {
      return NextResponse.json({ error: "Model returned an empty reply, try again." }, { status: 502 });
    }

    return NextResponse.json({ comment, followUpDm, nicheMatch, contacts });
  } catch {
    return NextResponse.json({ error: "Unexpected error contacting Groq." }, { status: 500 });
  }
}