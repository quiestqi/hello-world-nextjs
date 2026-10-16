import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requiresSignIn } from "@/lib/route-access";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const protectedRoute = requiresSignIn(request.nextUrl.pathname);
  if (!protectedRoute) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  function loginRedirect() {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.search = "";
    const redirected = NextResponse.redirect(target);
    for (const cookie of response.cookies.getAll()) redirected.cookies.set(cookie);
    redirected.headers.set("Cache-Control", "private, no-store");
    return redirected;
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return loginRedirect();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) return loginRedirect();
  } catch {
    return loginRedirect();
  }

  response.headers.set("Cache-Control", "private, no-store");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
