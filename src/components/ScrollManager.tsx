import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * The one place that decides where the page is scrolled after a navigation.
 *
 * Client-side routing does none of this by itself, which is why the site used to
 * open Docs halfway down whenever you clicked through from halfway down the home
 * page. The rules:
 *
 *   new page, no #section   → top of the page, instantly
 *   new page, #section      → that section, instantly (arriving, not travelling)
 *   same page, #section     → glide if it is close, otherwise go straight there
 *   back / forward          → leave it to the browser, which restores where you were
 */
const MAX_GLIDE_SCREENS = 1.5;

export function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef<string | null>(null);

  useLayoutEffect(() => {
    const samePage = previousPath.current === pathname;
    previousPath.current = pathname;

    if (navigationType === 'POP') return;

    let id = '';
    try { id = decodeURIComponent(hash.slice(1)); } catch { /* malformed hash such as #% */ }
    const target = id ? document.getElementById(id) : null;

    if (!target) {
      // A link to a section that is not on this page leaves you where you are.
      if (!samePage || !hash) window.scrollTo(0, 0);
      return;
    }

    // Glide only for short hops. Browsers stretch a smooth scroll over long
    // distances, and seconds of the page sliding past reads as jumping around.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const distance = Math.abs(target.getBoundingClientRect().top);
    const glide = samePage && !reduced && distance <= window.innerHeight * MAX_GLIDE_SCREENS;
    target.scrollIntoView({ behavior: glide ? 'smooth' : 'auto', block: 'start' });
  }, [pathname, hash, key, navigationType]);

  return null;
}
