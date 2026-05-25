import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');

describe('web SEO metadata', () => {
  it('uses the canonical product title and social metadata', () => {
    expect(html).toContain(
      '<title>Tokenometer - LLM Token Cost CLI, VS Code Extension, and GitHub Action</title>',
    );
    expect(html).toContain('<meta property="og:url" content="https://tokenometer.dev/" />');
    expect(html).toContain('<meta property="og:image" content="https://tokenometer.dev/og.svg" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toMatch(
      /<meta\s+name="twitter:title"\s+content="Tokenometer - LLM Token Cost CLI, VS Code Extension, and GitHub Action"\s+\/>/,
    );
  });

  it('declares Tokenometer as structured software metadata', () => {
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"@type": "SoftwareApplication"');
    expect(html).toContain('"name": "Tokenometer"');
    expect(html).toContain('"url": "https://tokenometer.dev/"');
    expect(html).toContain('"codeRepository": "https://github.com/faraa2m/tokenometer"');
  });
});
