import { useSyncExternalStore } from 'react';

export type RouteName =
  | 'overview'
  | 'clients'
  | 'client-detail'
  | 'board'
  | 'ops'
  | 'analytics'
  | 'wip'
  | 'templates'
  | 'template-detail';

export type Route = {
  name: RouteName;
  params: Record<string, string>;
  hash: string;
};

const DEFAULT: Route = { name: 'overview', params: {}, hash: '#overview' };

// Hash → Route. Longest prefixes first so `#clients/<id>` matches before `#clients`.
function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  if (!raw) return DEFAULT;

  const parts = raw.split('/');
  const head = parts[0];
  const rest = parts.slice(1);

  switch (head) {
    case 'overview':
      return { name: 'overview', params: {}, hash };
    case 'clients':
      if (rest.length > 0) return { name: 'client-detail', params: { id: rest[0] }, hash };
      return { name: 'clients', params: {}, hash };
    case 'board':
      if (rest.length > 0) return { name: 'board', params: { id: rest[0] }, hash };
      return { name: 'board', params: {}, hash };
    case 'ops':
      return { name: 'ops', params: {}, hash };
    case 'analytics':
      return { name: 'analytics', params: {}, hash };
    case 'wip':
      // Mockup uses `#wip/agenda`; we treat the sub-path as a pane key for now.
      return { name: 'wip', params: rest[0] ? { pane: rest[0] } : {}, hash };
    case 'templates':
      if (rest.length > 0) return { name: 'template-detail', params: { id: rest[0] }, hash };
      return { name: 'templates', params: {}, hash };
  }

  return DEFAULT;
}

let current = parse(window.location.hash);
const listeners = new Set<() => void>();

function emit() {
  current = parse(window.location.hash);
  listeners.forEach((l) => l());
}

window.addEventListener('hashchange', emit);

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
}

export function navigate(hash: string) {
  const normalized = hash.startsWith('#') ? hash : `#${hash}`;
  if (window.location.hash === normalized) return;
  window.location.hash = normalized;
}
