import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export const callMessages = async () => {
  const r = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    system: 'You answer in fewer than 100 words.',
    messages: [{ role: 'user', content: 'What is consistent hashing?' }],
  });
  return r;
};
