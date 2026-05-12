import type { EmpiricalEnv } from '@tokenometer/core';

/**
 * Read provider API keys from process.env into the EmpiricalEnv shape
 * consumed by `@tokenometer/core`. Mirrors the CLI's readEnv() verbatim so
 * both surfaces resolve keys identically.
 */
export const readEnv = (): EmpiricalEnv => {
  const env: EmpiricalEnv = {};
  const {
    ANTHROPIC_API_KEY,
    COHERE_API_KEY,
    GEMINI_API_KEY,
    GOOGLE_API_KEY,
    MISTRAL_API_KEY,
    OPENAI_API_KEY,
  } = process.env;
  if (ANTHROPIC_API_KEY) env.anthropicApiKey = ANTHROPIC_API_KEY;
  if (COHERE_API_KEY) env.cohereApiKey = COHERE_API_KEY;
  const googleKey = GOOGLE_API_KEY ?? GEMINI_API_KEY;
  if (googleKey) env.googleApiKey = googleKey;
  if (MISTRAL_API_KEY) env.mistralApiKey = MISTRAL_API_KEY;
  if (OPENAI_API_KEY) env.openaiApiKey = OPENAI_API_KEY;
  return env;
};
