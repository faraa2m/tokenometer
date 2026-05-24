import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync(fileURLToPath(new URL('./main.tsx', import.meta.url)), 'utf8');

describe('web app entrypoint', () => {
  it('mounts Vercel monitoring with React integrations', () => {
    expect(mainSource).toContain("import { Analytics } from '@vercel/analytics/react';");
    expect(mainSource).toContain("import { SpeedInsights } from '@vercel/speed-insights/react';");
    expect(mainSource).toContain('<Analytics />');
    expect(mainSource).toContain('<SpeedInsights />');
    expect(mainSource).not.toContain('@vercel/analytics/next');
    expect(mainSource).not.toContain('@vercel/speed-insights/next');
  });
});
