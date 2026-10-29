import { AssemblyAI } from "assemblyai";

export function getAssemblyClient() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing ASSEMBLYAI_API_KEY. Copy .env.example to .env.local and add your key.",
    );
  }
  return new AssemblyAI({ apiKey });
}

export function hasAssemblyKey() {
  return Boolean(process.env.ASSEMBLYAI_API_KEY?.trim());
}
