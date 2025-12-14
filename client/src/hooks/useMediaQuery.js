// client/src/hooks/useMediaQuery.js
import { useState, useEffect } from 'react';

export const breakpoints = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
};

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

export function useIsMobile() {
  return useMediaQuery(breakpoints.mobile);
}

export function useIsTablet() {
  return useMediaQuery(breakpoints.tablet);
}

export function useIsDesktop() {
  return useMediaQuery(breakpoints.desktop);
}