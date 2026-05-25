import { describe, expect, it } from 'vitest';
import * as browserCore from './browser.js';

describe('browser entrypoint', () => {
  it('exposes browser-safe tokenometer APIs without filesystem config loading', () => {
    expect(browserCore.parseConfig('models: [gpt-4o]\n')).toEqual({ models: ['gpt-4o'] });
    expect('loadConfig' in browserCore).toBe(false);
  });
});
