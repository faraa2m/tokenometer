import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const landingSource = readFileSync(
  fileURLToPath(new URL('./LandingPage.tsx', import.meta.url)),
  'utf8',
);

describe('landing page ecosystem links', () => {
  it('links the creator identity and related LLM tooling projects', () => {
    expect(landingSource).toContain('Faraazuddin Mohammed');
    expect(landingSource).toContain('https://github.com/faraa2m');
    expect(landingSource).toContain('https://www.linkedin.com/in/faraazuddin-mohammed/');
    expect(landingSource).toContain('https://hackernoon.com/u/faraa2m');
    expect(landingSource).toContain('https://github.com/faraa2m/llm-tokens-atlas');
    expect(landingSource).toContain('https://huggingface.co/datasets/faraa2m/llm-tokens-atlas');
    expect(landingSource).toContain('https://github.com/faraa2m/promptc');
    expect(landingSource).toContain('https://github.com/faraa2m/routerlab');
    expect(landingSource).toContain('https://github.com/faraa2m/ast-ai-model-router');
  });

  it('lazy-loads the playground so tokenizer tables are not in the initial page chunk', () => {
    expect(landingSource).toContain("import('../components/Playground.js')");
    expect(landingSource).not.toContain("import { Playground } from '../components/Playground.js'");
  });

  it('reserves calculator space while the playground chunk loads to avoid CLS', () => {
    expect(landingSource).toContain('const PlaygroundFallback');
    expect(landingSource).toContain('min-h-[720px]');
    expect(landingSource).toContain('fallback={<PlaygroundFallback />}');
  });
});
