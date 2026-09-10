import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rafraîchit la session Supabase à chaque requête et protège
 * les routes privées. Le middleware NE remplace PAS les policies
 * RLS ni les vérifications côté route handler : il gère seulement
 * l'expérience utilisateur (redirections).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isSuperAdminRoute = path.startsWith('/super-admin') && path !== '/super-admin/login';
  const isDashboardRoute = path.startsWith('/dashboard');

  if (!user && (isSuperAdminRoute || isDashboardRoute)) {
    const loginPath = isSuperAdminRoute ? '/super-admin/login' : '/login';
    const redirectUrl = new URL(loginPath, request.url);
    redirectUrl.searchParams.set('redirectTo', path);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value, c);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
