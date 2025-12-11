import Groq from "groq-sdk";

// Safe initialization - won't fail during build if env var missing
let groqInstance: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqInstance) {
    groqInstance = new Groq({
      apiKey: process.env.GROQ_API_KEY || "placeholder-for-build",
    });
  }
  return groqInstance;
}

// Export getter function instead of instance to defer initialization
export const groq = new Proxy({} as Groq, {
  get: (target, prop) => {
    const client = getGroqClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// Helper: Retry wrapper for LLM calls
export async function callGroqWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes("invalid_api_key")) {
        throw error;
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw new Error(
    `Failed after ${maxRetries} attempts: ${lastError?.message}`
  );
}
