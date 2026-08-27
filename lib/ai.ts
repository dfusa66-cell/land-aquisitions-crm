import OpenAI from "openai";
import type { Message } from "@prisma/client";
import { z } from "zod";

export const analysisSchema = z.object({
  classification: z.enum(["hot", "warm", "follow_up", "cold", "dnc", "wrong_number"]),
  lead_score: z.number().int().min(0).max(100),
  seller_interest: z.enum(["high", "medium", "low", "none"]),
  motivation: z.enum(["high", "medium", "low", "unknown"]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  asking_price: z.number().nullable(),
  negotiation_stage: z.string(),
  summary: z.string(),
  next_action: z.string(),
  suggested_reply: z.string(),
  follow_up_date: z.string().nullable(),
  requires_human_attention: z.boolean(),
  reasoning_summary: z.string()
});

export type LeadAnalysis = z.infer<typeof analysisSchema>;

function statusFromClassification(classification: LeadAnalysis["classification"]) {
  const map: Record<LeadAnalysis["classification"], string> = {
    hot: "HOT",
    warm: "WARM",
    follow_up: "FOLLOW_UP",
    cold: "COLD",
    dnc: "DNC",
    wrong_number: "WRONG_NUMBER"
  };
  return map[classification];
}

export function toLeadStatus(classification: LeadAnalysis["classification"]) {
  return statusFromClassification(classification);
}

export function fallbackAnalysis(messages: Pick<Message, "content" | "direction">[]): LeadAnalysis {
  const transcript = messages.map((m) => m.content.toLowerCase()).join(" ");
  const hasDnc = /\b(stop|unsubscribe|remove me|do not text|don't text|dont text)\b/i.test(transcript);
  const wrongNumber = /\bwrong number|not mine|don't own|dont own|no longer own\b/i.test(transcript);
  const priceMatch = transcript.match(/\$?\s?([0-9]{2,3}(?:,[0-9]{3})+|[0-9]{4,6})/);
  const asksLater = /\b(next month|later|spring|fall|call me back|follow up)\b/i.test(transcript);
  const interested = /\b(price|offer|sell|selling|depends|consider|how much|number in mind)\b/i.test(transcript);
  const classification = hasDnc ? "dnc" : wrongNumber ? "wrong_number" : priceMatch ? "hot" : asksLater ? "follow_up" : interested ? "warm" : "cold";
  return {
    classification,
    lead_score: classification === "hot" ? 88 : classification === "warm" ? 62 : classification === "follow_up" ? 55 : 8,
    seller_interest: classification === "hot" ? "high" : classification === "warm" || classification === "follow_up" ? "medium" : "none",
    motivation: classification === "hot" ? "medium" : "unknown",
    sentiment: hasDnc ? "negative" : "neutral",
    asking_price: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null,
    negotiation_stage: priceMatch ? "Seller provided an asking price." : interested ? "Seller is open to discussing price." : "No active negotiation yet.",
    summary: hasDnc
      ? "Seller requested no further contact."
      : wrongNumber
        ? "Contact says this is the wrong number or they do not own the property."
        : interested
          ? "Seller has shown some openness to a sale."
          : "No clear selling intent yet.",
    next_action: hasDnc ? "Do not contact." : wrongNumber ? "Mark as wrong number." : "Continue qualifying interest and price expectations.",
    suggested_reply: hasDnc || wrongNumber ? "" : "Gotcha. Do you have a number in mind?",
    follow_up_date: null,
    requires_human_attention: false,
    reasoning_summary: priceMatch ? "Seller provided a price and appears open to discussing terms." : "Classification used message keywords because OpenAI is not configured."
  };
}

export async function analyzeLead(messages: Pick<Message, "content" | "direction" | "timestamp">[], rules: string) {
  if (!process.env.OPENAI_API_KEY) return fallbackAnalysis(messages);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const transcript = messages
    .map((m) => `${m.direction === "SENT" ? "Diego" : "Seller"}${m.timestamp ? ` (${m.timestamp.toISOString()})` : ""}: ${m.content}`)
    .join("\n");
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Analyze land acquisition SMS leads. Return structured JSON only. DNC overrides every other classification. Do not include hidden chain-of-thought. Suggested replies must be short, natural SMS messages and must not accept offers or make binding commitments."
      },
      {
        role: "user",
        content: `Negotiation rules:\n${rules}\n\nTranscript:\n${transcript}\n\nReturn the exact schema requested by the CRM.`
      }
    ]
  });
  const parsed = analysisSchema.parse(JSON.parse(completion.choices[0]?.message.content ?? "{}"));
  const risky = /\b(we accept|deal|agreed|contract|you have a deal|we can do that|i'll pay|we will pay)\b/i.test(parsed.suggested_reply);
  return { ...parsed, requires_human_attention: parsed.requires_human_attention || risky };
}
