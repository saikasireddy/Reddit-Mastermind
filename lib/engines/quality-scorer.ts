import Groq from "groq-sdk";
import { ConversationScript } from "./conversation-drafter";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function scoreConversation(
  script: ConversationScript,
  subreddit: string
): Promise<number> {
  try {
    const prompt = `
      You are a cynical Reddit moderator. Rate this conversation from 0-10 based on REALISM.
      Subreddit: ${subreddit}

      Conversation:
      ${script.script.map(s => `${s.actor}: ${s.text}`).join("\n")}

      Scoring Criteria:
      - 10: Indistinguishable from real humans. Messy, slang, typos, natural flow.
      - 8: Good, but slightly too helpful or polite.
      - 5: Obviously AI-generated (perfect grammar, "delve", "seamless").
      - 1: Pure marketing spam.

      Return JSON only: { "score": number, "reason": "string" }
    `;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Use the big brain for judging
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1, // Strict, deterministic
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return result.score || 5; // Default to 5 if fail

  } catch (e) {
    console.error("Scoring failed:", e);
    return 7.5; // Fallback score
  }
}
