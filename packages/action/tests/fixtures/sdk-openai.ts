import OpenAI from 'openai';

const openai = new OpenAI();

export const callChat = async () => {
  const r = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a precise summariser.' },
      { role: 'user', content: 'Summarise the GitHub Actions changelog for last month.' },
    ],
  });
  return r;
};

export const callResponses = async () => {
  const r = await openai.responses.create({
    model: 'gpt-4o',
    prompt: 'List three classic distributed-systems concepts.',
  });
  return r;
};
