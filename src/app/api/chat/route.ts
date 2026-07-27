import { NextRequest, NextResponse } from "next/server";

/*
 * POST /api/chat
 * Body: { message: string; history?: { role: "user" | "assistant"; content: string }[] }
 * Returns: { message: string; options?: string[] }
 *
 * Leadly's AI Guide chat endpoint — powered by Groq.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

type Role = "user" | "assistant";

interface MessageHistory {
  role: Role;
  content: string;
}

const SYSTEM_PROMPT = `You are Leadly's AI Guide - a friendly, positive coach helping freelancers, agencies, and recruiters find clients and grow their business.

Your role:
- Provide actionable guidance on finding clients, outreach strategies, and business growth
- Be encouraging and positive - focus on solutions, not problems
- Give specific, practical tips they can implement immediately
- Ask clarifying questions when needed to give better advice
- Never provide coding help or technical solutions

Topics you specialize in:
- Finding ideal client profiles
- LinkedIn optimization and outreach
- Building trust and credibility
- Pricing strategies
- Portfolio and case study development
- Networking and relationship building
- Handling objections and negotiations
- Time management and scaling
- Common mistakes to avoid

Response format:
- Keep responses concise but valuable (2-4 paragraphs)
- Use a warm, professional tone
- End with 2-3 optional follow-up questions they might ask
- Make suggestions actionable - give them something to do today

Important: Focus on empowering them. Every response should make them feel like they can find great clients.`;

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

/**
 * Extract potential follow-up questions from the assistant's response.
 */
function extractFollowUpQuestions(text: string): string[] {
  const questions: string[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.includes("?") || trimmed.includes("Would you like")) {
      if (trimmed.length > 15 && trimmed.length < 120) {
        const cleanedQuestion = trimmed.replace(/^[^\w]+/, "").replace(/\s+/g, " ");
        if (cleanedQuestion && !questions.includes(cleanedQuestion)) {
          questions.push(cleanedQuestion);
        }
      }
    }
  }

  return questions.slice(0, 3);
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
  const message = String((record as { message?: unknown }).message ?? "").trim();
  const rawHistory = (record as { history?: unknown }).history;

  const history: MessageHistory[] = Array.isArray(rawHistory)
    ? rawHistory.filter(isMessageHistory).slice(-6)
    : [];

  if (!message) {
    return NextResponse.json(
      { error: "Message is required." },
      { status: 400 }
    );
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
        temperature: 0.7,
        max_completion_tokens: 800,
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
        return NextResponse.json(
          { error: "Authentication error - API key invalid." },
          { status: 401 }
        );
      }
      if (groqRes.status === 400) {
        return NextResponse.json(
          { error: "Invalid request to AI service." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to get response from AI service." },
        { status: groqRes.status }
      );
    }

    const data = await groqRes.json();
    const assistantMessage: string =
      data?.choices?.[0]?.message?.content ??
      "I couldn't generate a response. Please try again.";

    const options = extractFollowUpQuestions(assistantMessage);

    return NextResponse.json({
      message: assistantMessage,
      options: options.length > 0 ? options : undefined,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to process request: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "Chat API is ready",
    provider: "Groq Cloud",
  });
}