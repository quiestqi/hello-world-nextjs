// Apply the same login gate regardless of query parameters, including old previews.
export function requiresSignIn(pathname: string): boolean {
  return pathname !== '/login' && pathname !== '/auth/callback'
    && !pathname.startsWith('/_next/') && !pathname.startsWith('/fonts/')
    && pathname !== '/favicon.ico' && pathname !== '/icon.svg';
}
