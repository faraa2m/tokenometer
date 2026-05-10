import { KNOWN_MODELS, MODELS } from '@tokenometer/core';

const DEFAULT_MODEL = 'claude-opus-4-7';

const firstGoogleGeminiModel = (): string => {
  for (const id of KNOWN_MODELS) {
    if (!id.startsWith('gemini-')) continue;
    const desc = MODELS[id];
    if (desc?.provider === 'google') return id;
  }
  return 'gemini-2.5-pro';
};

export interface AutoDetectInput {
  env?: NodeJS.ProcessEnv;
}

export interface AutoDetectResult {
  /** The chosen default model id. */
  modelId: string;
  /** Optional human-readable note for stderr (e.g. multi-key conflict). */
  note: string | null;
}

/**
 * When the user has not passed `--model`, pick a default based on which
 * provider API key is present in the environment.
 *
 * - Exactly one provider key set → that provider's canonical model.
 * - Multiple keys set → fall back to the existing default with a stderr note.
 * - No keys set → existing default behavior.
 */
export const autoDetectDefaultModel = (input: AutoDetectInput = {}): AutoDetectResult => {
  const env = input.env ?? process.env;
  const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY);
  const hasOpenAi = Boolean(env.OPENAI_API_KEY);
  const hasGoogle = Boolean(env.GOOGLE_API_KEY ?? env.GEMINI_API_KEY);

  const setCount = [hasAnthropic, hasOpenAi, hasGoogle].filter(Boolean).length;
  if (setCount === 0) return { modelId: DEFAULT_MODEL, note: null };
  if (setCount > 1) {
    return {
      modelId: DEFAULT_MODEL,
      note: `Multiple provider API keys detected; defaulting to ${DEFAULT_MODEL}. Pass --model to override.`,
    };
  }
  if (hasAnthropic) return { modelId: 'claude-opus-4-7', note: null };
  if (hasOpenAi) return { modelId: 'gpt-4o', note: null };
  return { modelId: firstGoogleGeminiModel(), note: null };
};
