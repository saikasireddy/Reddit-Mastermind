import Groq from "groq-sdk";
import { ConversationScript, Persona } from "./conversation-drafter";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 1. The Core Humanizer (Text Level)
async function humanizeText(text: string, persona?: Persona) {
  if (!persona) return text;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are a text humanizer.
          Persona Context: ${persona.writing_style}

          Task: Rewrite the text to match the persona.
          - If they are "lazy", use lowercase and no punctuation.
          - If they are "angry", use short sentences.
          - Randomly add a typo (10% chance).
          - Remove any "marketing" fluff.

          Return ONLY the new text.`
        },
        { role: "user", content: text },
      ],
      temperature: 0.6,
    });

    return response.choices[0]?.message?.content || text;
  } catch (e) {
    return text;
  }
}

// 2. The Wrapper (Conversation Level) - THIS WAS MISSING
export async function humanizeConversation(
  conversation: ConversationScript,
  personas: Persona[]
) {
  const humanizedScript = await Promise.all(
    conversation.script.map(async (turn) => {
      // Find the persona object for this actor
      const actor = personas.find((p) => p.reddit_username === turn.actor);

      // rewrite the text
      const newText = await humanizeText(turn.text, actor);

      return {
        ...turn,
        text: newText
      };
    })
  );

  return {
    ...conversation,
    script: humanizedScript
  };
}
