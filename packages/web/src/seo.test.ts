import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const webRoot = resolve(__dirname, '..');
const sitemap = readFileSync(resolve(webRoot, 'public/sitemap.xml'), 'utf8');
const robots = readFileSync(resolve(webRoot, 'public/robots.txt'), 'utf8');
const vercelConfig = readFileSync(resolve(webRoot, '../../vercel.json'), 'utf8');
const canonicalSource = readFileSync(resolve(webRoot, 'src/hooks/useCanonicalUrl.ts'), 'utf8');

describe('web SEO metadata', () => {
  it('uses the canonical product title and social metadata', () => {
    expect(html).toContain(
      '<title>Tokenometer - LLM Token Cost CLI, VS Code Extension, and GitHub Action</title>',
    );
    expect(html).toContain('<meta property="og:url" content="https://www.tokenometer.dev/" />');
    expect(html).toContain(
      '<meta property="og:image" content="https://www.tokenometer.dev/og.svg" />',
    );
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toMatch(
      /<meta\s+name="twitter:title"\s+content="Tokenometer - LLM Token Cost CLI, VS Code Extension, and GitHub Action"\s+\/>/,
    );
  });

  it('declares Tokenometer as structured software metadata', () => {
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"@type": "SoftwareApplication"');
    expect(html).toContain('"name": "Tokenometer"');
    expect(html).toContain('"url": "https://www.tokenometer.dev/"');
    expect(html).toContain('"codeRepository": "https://github.com/faraa2m/tokenometer"');
  });

  it('links to a public favicon asset', () => {
    const faviconMatch = html.match(
      /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="([^"]+)"\s+\/>/,
    );

    expect(faviconMatch?.[1]).toBe('/favicon.svg');
    expect(existsSync(resolve(webRoot, 'public/favicon.svg'))).toBe(true);
  });

  it('uses deployed www URLs for canonical, robots, and sitemap signals', () => {
    expect(html).toContain('<link rel="canonical" href="https://www.tokenometer.dev/" />');
    expect(robots).toContain('Sitemap: https://www.tokenometer.dev/sitemap.xml');
    expect(robots).toContain('LLMs: https://www.tokenometer.dev/llms.txt');
    expect(sitemap).toContain('<loc>https://www.tokenometer.dev/</loc>');
    expect(sitemap).toContain('<loc>https://www.tokenometer.dev/models</loc>');
    expect(sitemap).not.toContain('https://tokenometer.dev/');
  });

  it('updates canonical and og:url tags from the current client route', () => {
    expect(canonicalSource).toContain("CANONICAL_ORIGIN = 'https://www.tokenometer.dev'");
    expect(canonicalSource).toContain('document.querySelector<HTMLLinkElement | HTMLMetaElement>(');
    expect(canonicalSource).toContain('link[rel="canonical"]');
    expect(canonicalSource).toContain('meta[property="og:url"]');
  });

  it('redirects alternate Tokenometer hosts to the deployed canonical host', () => {
    expect(vercelConfig).toContain('"type": "host"');
    expect(vercelConfig).toContain('"value": "tokenometer.dev"');
    expect(vercelConfig).toContain('"value": "tokenometer.io"');
    expect(vercelConfig).toContain('"value": "www.tokenometer.io"');
    expect(vercelConfig).toContain('"destination": "https://www.tokenometer.dev/:path*"');
    expect(vercelConfig).toContain('"permanent": true');
  });
});
