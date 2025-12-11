import { groq, callGroqWithRetry } from "../ai/groq-client";

export interface Persona {
  id: string;
  reddit_username: string;
  archetype: string;
  writing_style: string;
  backstory?: string;
}

export interface ConversationScript {
  title: string;
  script: Array<{
    actor: string;
    text: string;
    reply_to?: number;
  }>;
}

export interface ConversationDraft {
  script: ConversationScript;
  quality_issues: string[];
  passed_critic: boolean;
}

/**
 * The Director + Critic Pattern
 * Stage 1: Director (Llama 3.3 70B) plans the conversation
 * Stage 2: Critic (Llama 3.1 8B) checks for astroturfing
 */
export async function draftConversation(
  sceneAngle: string,
  personas: Persona[],
  subreddit: string
): Promise<ConversationDraft> {
  // STEP 1: The Director (Llama 3.3 70B) - Plans the scene
  const directorPrompt = `
    Cast: ${personas.map((p) => p.reddit_username + " (" + p.archetype + ")").join(", ")}
    Target Subreddit: ${subreddit}
    Scene Goal: Discuss "${sceneAngle}"

    Character Context:
    ${personas.map((p) => `- ${p.reddit_username}: ${p.writing_style}`).join("\n")}

    Requirements:
    - OP is asking a genuine question or sharing a frustration.
    - Commenter 1 is helpful but realistic (not overly promotional).
    - Commenter 2 can mention Slideforge IF it fits naturally with their character.
    - Total length: 3-5 comments.
    - DO NOT use hashtags or excessive emojis.
    - Keep it conversational and natural.
    - Show some disagreement or skepticism (real Reddit isn't all agreement).

    Return JSON format only:
    {
      "title": "Post Title (question or problem statement)",
      "script": [
        { "actor": "${personas[0].reddit_username}", "text": "Post body text...", "reply_to": null },
        { "actor": "${personas[1].reddit_username}", "text": "First comment...", "reply_to": 0 },
        { "actor": "${personas[2]?.reddit_username || personas[0].reddit_username}", "text": "Reply to first comment...", "reply_to": 1 }
      ]
    }
  `;

  const directorResponse = await callGroqWithRetry(async () => {
    return await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // The "Smart" Model
      messages: [
        {
          role: "system",
          content:
            "You write authentic, messy Reddit conversations. You are NOT a marketer. You understand how real people talk on Reddit - casual, sometimes cynical, often brief.",
        },
        { role: "user", content: directorPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });
  });

  const script = JSON.parse(
    directorResponse.choices[0].message.content || "{}"
  );

  // STEP 2: The Critic (Llama 3.1 8B) - Quality Check
  const criticPrompt = `
    Review this Reddit conversation for "Astroturfing" (Fake Marketing).
    Conversation: ${JSON.stringify(script, null, 2)}

    Check for these red flags:
    1. Does it sound like an ad or sales pitch?
    2. AI marketing words: "delve", "game-changer", "seamless", "unlock", "elevate", "leverage"
    3. Product mention is too aggressive or forced
    4. Everyone agrees (no natural skepticism)
    5. Perfect grammar/formal language (real Reddit is casual)
    6. Overly helpful tone (real users are often lazy or snarky)

    Return JSON: {
      "passes": boolean,
      "issues": ["list of specific problems found"],
      "improved_script": { ... } // ONLY if passes=false, provide a rewritten version
    }
  `;

  const criticResponse = await callGroqWithRetry(async () => {
    return await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // The "Fast" Model
      messages: [
        {
          role: "system",
          content:
            "You are a Reddit Moderator with 10 years experience detecting spam and astroturfing. You hate fake engagement.",
        },
        { role: "user", content: criticPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temp for consistent judgment
    });
  });

  const criticism = JSON.parse(
    criticResponse.choices[0].message.content || '{"passes": true, "issues": []}'
  );

  // Return the improved script if critic failed it, otherwise original
  return {
    script: criticism.passes ? script : criticism.improved_script || script,
    quality_issues: criticism.issues || [],
    passed_critic: criticism.passes,
  };
}
