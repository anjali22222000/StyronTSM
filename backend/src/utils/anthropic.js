import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config();

let client = null;
export function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw httpError(503, "Chatbot is not configured (missing ANTHROPIC_API_KEY).");
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function askClaude({ system, messages, maxTokens = 600 }) {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system,
    messages,
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
