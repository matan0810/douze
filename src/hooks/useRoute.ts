import { useEffect, useState } from 'react';
import { parseRoute, routeHash, type Route } from '../domain/routes';

/** Reads the address; an unknown one is shown as its screen and written back as such. */
function current(): Route {
  const route = parseRoute(window.location.hash);
  const canonical = routeHash(route);
  if (window.location.hash !== canonical)
    window.history.replaceState(window.history.state, '', canonical);
  return route;
}

/**
 * The current screen, from the address hash. Links are plain `<a href="#/...">`. A new
 * screen opens at its top; a player's breakdown opens over the table, which keeps its place.
 */
export function useRoute(): Route {
  const [route, setRoute] = useState(current);

  useEffect(() => {
    let shown = current();
    const onChange = () => {
      const next = current();
      const overlay = next.name === 'player' || shown.name === 'player';
      if (!overlay) window.scrollTo({ top: 0 });
      shown = next;
      setRoute(next);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(route: Route) {
  window.location.hash = routeHash(route);
}

/** The full address of a screen, to send to someone. */
export function absoluteUrl(hash: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}${hash}`;
}
