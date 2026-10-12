/**
 * Routes live in the URL hash. The site opens on Home; the Playground is the original app, and the
 * share links it writes (#d=, #t=) open it directly.
 */
export const routeOf = (hash) => {
  if (hash.startsWith('#/studio')) return 'studio';
  if (hash.startsWith('#/playground')) return 'playground';
  if (hash === '' || hash === '#' || hash.startsWith('#/')) return 'home';
  return 'playground';
};
