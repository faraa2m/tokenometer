import MistralClient from '@mistralai/mistralai';

const mistralClient = new MistralClient('FAKE_KEY');

export const callMistral = async () => {
  const r = await mistralClient.chat({
    model: 'mistral-large-latest',
    messages: [{ role: 'user', content: 'Bonjour, qui es-tu ?' }],
  });
  return r;
};
