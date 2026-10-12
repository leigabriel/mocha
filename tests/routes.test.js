import { describe, expect, it } from 'vitest';
import { routeOf } from '../src/routes.js';

describe('routeOf', () => {
  it('opens on Home for an empty hash and Home links', () => {
    for (const h of ['', '#', '#/', '#/home']) expect(routeOf(h)).toBe('home');
  });
  it('maps the Playground and Studio routes', () => {
    expect(routeOf('#/playground')).toBe('playground');
    expect(routeOf('#/studio')).toBe('studio');
    expect(routeOf('#/studio/anything')).toBe('studio');
  });
  it('sends share links straight to the Playground', () => {
    expect(routeOf('#d=abc123')).toBe('playground');
    expect(routeOf('#t=abc123')).toBe('playground');
  });
});
