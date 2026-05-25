import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = resolve(__dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
  icon?: string;
};

describe('VS Code extension package metadata', () => {
  it('declares a bundled marketplace icon', () => {
    expect(packageJson.icon).toBe('images/icon.png');
    expect(existsSync(resolve(packageRoot, packageJson.icon ?? ''))).toBe(true);
  });
});
