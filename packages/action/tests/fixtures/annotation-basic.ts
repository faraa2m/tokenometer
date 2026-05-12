// @tokenometer-prompt model=claude-opus-4-7
const SYSTEM = 'You are an assistant that answers in fewer than 100 words.';

export function buildPrompt(): string {
  return SYSTEM;
}

/* @tokenometer-prompt model=gpt-4o */
const USER = 'Summarise the changelog.';

export { USER };
