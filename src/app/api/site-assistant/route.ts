import { NextRequest, NextResponse } from "next/server";

/*
 * POST /api/site-assistant
 * Body: { message: string; history?: { role: "user" | "assistant"; content: string }[] }
 * Returns: { message: string; options?: string[] }
 *
 * Powers the site-wide help widget (ChatWidget). Separate from
 * /api/chat (Leadly's AI Guide, which coaches on finding clients) —
 * this one only answers questions about how ClueFind/Leadly itself
 * works: its pages, features, and where to find things.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

type Role = "user" | "assistant";

interface MessageHistory {
  role: Role;
  content: string;
}

const SYSTEM_PROMPT = `You are the ClueFind (Leadly) site assistant — a concise help widget that explains how to use the website. You are NOT the AI Guide (that's a separate page that coaches on finding clients); you only help people understand and navigate the product itself.

What the site offers:
- **Link Generator** ("/new"): turn a single keyword into several angled LinkedIn search links — direct mentions, "hiring <keyword>", and "looking for <keyword>" — each filterable by how recently posted (1h up to 30d). Users can generate 3 more AI-suggested angles, copy any link, or open it straight in LinkedIn.
- **Reply Generator** ("/leads/comment-generator"): paste a hiring/lookout post plus your name, niche, experience, and a link. Pick the platform (LinkedIn / X / Threads) and how you want to be contacted (DM / email / comments-only). It writes a reply comment plus a follow-up DM to send once someone responds, and flags if the post doesn't actually match your niche.
- **AI Guide** ("/chat"): a coaching chatbot with saved conversation history for outreach strategy, pricing, positioning, and general "how do I get clients" advice.
- Privacy Policy and Terms pages explain data handling — chat history is stored locally in the browser, no LinkedIn scraping or automation happens, no data is sold.

Rules:
- Only answer questions about using ClueFind/Leadly itself — what a feature does, where to find it, how the filters/options work, what happens to their data. If asked something else (general LinkedIn strategy, coding help, unrelated topics), briefly redirect: for outreach/client-finding strategy, point them to the AI Guide at /chat; otherwise say it's outside what this widget covers.
- Be brief: 1-3 short sentences, or a tight 2-4 item bulleted list for multi-step answers. No filler, no "Great question!".
- Never invent a feature, price, or policy detail that isn't listed above.`;

function isMessageHistory(value: unknown): value is MessageHistory {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { role?: unknown }).role !== undefined &&
    ((value as { role?: unknown }).role === "user" ||
      (value as { role?: unknown }).role === "assistant") &&
    typeof (value as { content?: unknown }).content === "string"
  );
}

/** Same lightweight follow-up extraction used by /api/chat, tuned to
 *  site-navigation questions instead of outreach coaching questions. */
function extractFollowUpQuestions(text: string): string[] {
  const questions: string[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.includes("?") || trimmed.includes("Would you like")) {
      if (trimmed.length > 10 && trimmed.length < 100) {
        const cleaned = trimmed.replace(/^[^\w]+/, "").replace(/\s+/g, " ");
        if (cleaned && !questions.includes(cleaned)) questions.push(cleaned);
      }
    }
  }

  return questions.slice(0, 3);
}

/** Shown before the visitor sends their first message. */
export const DEFAULT_WIDGET_OPTIONS = [
  "What does the Link Generator do?",
  "How does the Reply Generator work?",
  "Is my data stored anywhere?",
];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const record = typeof body === "object" && body !== null ? body : {};
  const message = String((record as { message?: unknown }).message ?? "").trim();
  const rawHistory = (record as { history?: unknown }).history;

  const history: MessageHistory[] = Array.isArray(rawHistory)
    ? rawHistory.filter(isMessageHistory).slice(-6)
    : [];

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY not set");
    return NextResponse.json(
      { error: "API configuration error - please contact support." },
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
        temperature: 0.4,
        max_completion_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: message },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errorData = await groqRes.json().catch(() => ({}));
      console.error("Groq API error:", errorData);

      if (groqRes.status === 429) {
        return NextResponse.json(
          { error: "Too many requests. Please wait a moment and try again." },
          { status: 429 }
        );
      }
      if (groqRes.status === 401) {
        return NextResponse.json({ error: "Authentication error - API key invalid." }, { status: 401 });
      }
      return NextResponse.json({ error: "Failed to get response from AI service." }, { status: groqRes.status });
    }

    const data = await groqRes.json();
    const assistantMessage: string =
      data?.choices?.[0]?.message?.content ?? "I couldn't generate a response. Please try again.";

    const options = extractFollowUpQuestions(assistantMessage);

    return NextResponse.json({
      message: assistantMessage,
      options: options.length > 0 ? options : undefined,
    });
  } catch (error) {
    console.error("Site assistant API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: `Failed to process request: ${errorMessage}` }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Site assistant API is ready", provider: "Groq Cloud" });
}