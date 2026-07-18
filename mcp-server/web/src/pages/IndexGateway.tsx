/**
 * Index route gateway (LAUNCH-FE, 2026-06-23, slot:quebec).
 *
 * The root URL "/" must show the PUBLIC marketing LandingPage to an anonymous
 * visitor (the funnel entry -- "Try the free Speed/Feed Calculator"), and the
 * internal ShellGatewayPage (employee workspace picker) only to a signed-in user.
 * Previously "/" rendered ShellGatewayPage unconditionally, so an anonymous
 * visitor hit an employee workspace picker with no idea what PRISM is -- the
 * single biggest funnel killer per the 2026-06-23 launch audit.
 *
 * selectIndexPage is pure + unit-tested; the component is a thin renderer.
 */
import { Suspense, lazy } from 'react';
import { useAuthOptional } from '../contexts/AuthContext';

const LandingPage = lazy(() => import('./LandingPage'));
const ShellGatewayPage = lazy(() =>
  import('./ShellGatewayPage').then((m) => ({ default: m.ShellGatewayPage })),
);

export type IndexAuthLike = { isLoading?: boolean; isAuthenticated?: boolean } | null;

/**
 * Which index surface to show:
 *   - `loading` while auth resolves (avoids a landing->shell flash for a
 *     returning signed-in user),
 *   - `shell` when authenticated,
 *   - `landing` for everyone else (anonymous visitor = the public funnel).
 */
export function selectIndexPage(auth: IndexAuthLike): 'landing' | 'shell' | 'loading' {
  if (auth && auth.isLoading) return 'loading';
  return auth && auth.isAuthenticated ? 'shell' : 'landing';
}

export function IndexGateway() {
  const auth = useAuthOptional();
  const which = selectIndexPage(auth);
  if (which === 'loading') return null;
  return (
    <Suspense fallback={null}>
      {which === 'shell' ? <ShellGatewayPage /> : <LandingPage />}
    </Suspense>
  );
}
