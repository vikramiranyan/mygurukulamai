export type AppRoute = 'parent' | 'learning';

export interface AppState {
  route: AppRoute;
  activeSubject: string;
  activeChapter: string;
  approvedSources: Record<string, boolean>;
}

export const defaultAppState: AppState = {
  route: 'parent',
  activeSubject: 'Maths',
  activeChapter: 'Addition',
  approvedSources: {},
};

export function routeFromHash(hash: string): AppRoute {
  return hash.replace(/^#\/?/, '') === 'learning' ? 'learning' : 'parent';
}

export function hashForRoute(route: AppRoute): string {
  return route === 'learning' ? '#/learning' : '#/parent';
}
