import { groq, callGroqWithRetry } from "../ai/groq-client";
import { ConversationScript } from "./conversation-drafter";

export interface QualityScore {
  overall_score: number; // 1-10
  authenticity: number; // Does it sound human?
  naturalness: number; // Would this conversation happen?
  subtlety: number; // Is product mention organic?
  coherence: number; // Does thread flow logically?
  issues: string[];
  recommendation: "approve" | "revise" | "reject";
}

/**
 * The Turing Test - AI Quality Scorer
 * Uses Llama 3.1 8B as independent judge
 */
export async function scoreConversation(
  conversation: ConversationScript,
  context: { subreddit: string; topic: string }
): Promise<QualityScore> {
  const scoringPrompt = `
    You are a Reddit power user and moderator with 10+ years experience.
    Your job is to detect astroturfing, fake engagement, and marketing disguised as conversation.

    Rate this Reddit conversation on a 1-10 scale (10 = indistinguishable from real users).

    SUBREDDIT: ${context.subreddit}
    TOPIC: ${context.topic}

    CONVERSATION:
    ---
    POST: ${conversation.title}
    ${conversation.script
      .map(
        (item, i) =>
          `${item.reply_to === null || item.reply_to === undefined ? "POST" : "COMMENT"} ${i + 1} (by u/${item.actor}):\n${item.text}`
      )
      .join("\n\n")}
    ---

    Scoring criteria:

    1. AUTHENTICITY (1-10): Do these sound like real Reddit users?
       - Deduct points for: perfect grammar, marketing speak, overly helpful tone
       - Award points for: natural disagreement, tangents, realistic brevity, typos

    2. NATURALNESS (1-10): Would this conversation actually happen?
       - Deduct points for: too convenient, forced product mentions, scripted feel
       - Award points for: organic flow, mixed opinions, realistic timing

    3. SUBTLETY (1-10): If a product is mentioned, is it natural?
       - Deduct points for: obvious shilling, sales pitch language, everyone praising it
       - Award points for: casual mention, user-initiated, skepticism exists

    4. COHERENCE (1-10): Does the thread make logical sense?
       - Deduct points for: contradictions, personas breaking character
       - Award points for: consistent voices, logical progressions

    RED FLAGS to watch for:
    - AI words: "delve", "game-changer", "seamless", "unlock", "elevate", "leverage"
    - Perfect grammar/spelling (real users make mistakes)
    - Overly helpful or salesy tone
    - Too many personas agreeing
    - Forced product mentions
    - Lack of personality/voice variation
    - Corporate speak or marketing jargon
    - Unrealistic level of detail
    - No skepticism or disagreement

    Overall score: Average of 4 scores.
    Recommendation:
    - 8-10: Approve
    - 6-7.9: Revise (provide specific feedback)
    - <6: Reject (too risky)

    Return JSON format:
    {
      "authenticity": <number 1-10>,
      "naturalness": <number 1-10>,
      "subtlety": <number 1-10>,
      "coherence": <number 1-10>,
      "overall_score": <average of 4 scores>,
      "issues": ["specific issue 1", "specific issue 2", ...],
      "strengths": ["strength 1", ...],
      "recommendation": "approve" | "revise" | "reject"
    }
  `;

  const scoringResponse = await callGroqWithRetry(async () => {
    return await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a Reddit moderator and expert at detecting fake/marketing content. You have very high standards.",
        },
        { role: "user", content: scoringPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Low temp for consistent scoring
    });
  });

  const result = JSON.parse(
    scoringResponse.choices[0].message.content || "{}"
  );

  return {
    overall_score: result.overall_score || 0,
    authenticity: result.authenticity || 0,
    naturalness: result.naturalness || 0,
    subtlety: result.subtlety || 0,
    coherence: result.coherence || 0,
    issues: result.issues || [],
    recommendation: result.recommendation || "reject",
  };
}

/**
 * Helper to determine if conversation passes quality threshold
 */
export function passesQualityThreshold(score: QualityScore): boolean {
  return score.overall_score >= 6.0;
}
