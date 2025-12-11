import Groq from "groq-sdk";

// Initialize Groq client with retry logic
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
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
