import { useEffect } from 'react';

const BASE = 'tokenometer';

/**
 * Sets `document.title` to "<title> · tokenometer · <tagline>" on mount; reverts
 * to the base banner on unmount so back-navigation doesn't leak the previous
 * title before the next page mounts.
 */
export const usePageTitle = (title: string, tagline?: string): void => {
  useEffect(() => {
    const previous = document.title;
    const parts = [title, BASE];
    if (tagline) parts.push(tagline);
    document.title = parts.join(' · ');
    return () => {
      document.title = previous;
    };
  }, [title, tagline]);
};
