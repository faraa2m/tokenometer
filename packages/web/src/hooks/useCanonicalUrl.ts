import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const CANONICAL_ORIGIN = 'https://www.tokenometer.dev';

const setHref = (selector: string, href: string): void => {
  const element = document.querySelector<HTMLLinkElement | HTMLMetaElement>(selector);
  if (!element) return;
  if (element instanceof HTMLLinkElement) {
    element.href = href;
    return;
  }
  element.content = href;
};

export const useCanonicalUrl = (): void => {
  const { pathname } = useLocation();

  useEffect(() => {
    const canonicalPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const canonicalUrl = `${CANONICAL_ORIGIN}${canonicalPath}`;

    setHref('link[rel="canonical"]', canonicalUrl);
    setHref('meta[property="og:url"]', canonicalUrl);
  }, [pathname]);
};
