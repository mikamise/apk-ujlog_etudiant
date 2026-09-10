import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * SÉCURITÉ : l'ancienne garde "Super Admin" ne faisait que vérifier
 * qu'un cookie commençait par le préfixe "superadmin_session_" — un
 * cookie entièrement falsifiable depuis le navigateur (DevTools).
 * Elle a été supprimée. La protection des routes /super-admin et
 * /dashboard passe maintenant par la session Supabase réelle
 * (lib/supabase/middleware.ts), et l'autorisation par rôle est
 * revérifiée côté serveur dans chaque route (jamais seulement ici).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.redirect(new URL('/super-admin', request.url));
  }

  const response = await updateSession(request);

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/super-admin',
    '/super-admin/:path*',
    '/admin',
    '/admin/:path*',
  ],
};
