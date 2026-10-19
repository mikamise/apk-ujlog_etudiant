import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabaseUrl } from '@/lib/supabase/config';
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
    getSupabaseUrl(),
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
  const isDelegateRoute = path.startsWith('/dashboard/delegue');

  if (!user && (isSuperAdminRoute || isDashboardRoute)) {
    const loginPath = '/login';
    const redirectUrl = new URL(loginPath, request.url);
    redirectUrl.searchParams.set('redirectTo', path);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value, c);
    });
    return redirectResponse;
  }

  // Les pages sensibles ont une garde serveur en plus des API. Le rôle est
  // relu depuis profiles, jamais depuis localStorage ou un paramètre client.
  if (user && (isSuperAdminRoute || isDelegateRoute)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle();

    const role = String(profile?.role || '').toLowerCase();
    const status = String(profile?.status || '').toLowerCase();
    const allowed = status === 'active' && (
      (isSuperAdminRoute && (role === 'admin' || role === 'super_admin')) ||
      (isDelegateRoute && role === 'delegate')
    );

    if (!allowed) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return supabaseResponse;
}
