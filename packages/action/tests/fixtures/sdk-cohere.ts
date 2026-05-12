import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({ token: 'FAKE_KEY' });

export const callCohere = async () => {
  const r = await cohere.chat({
    model: 'command-r-plus',
    content: 'Tell me about retrieval-augmented generation.',
  });
  return r;
};
