import { GoogleGenerativeAI } from '@google/generative-ai';

const genai = new GoogleGenerativeAI('FAKE_KEY');
const model = genai.getGenerativeModel({ model: 'gemini-1.5-pro' });

export const callGemini = async () => {
  const r = await model.generateContent({
    contents: 'Explain Raft in two paragraphs.',
  });
  return r;
};
