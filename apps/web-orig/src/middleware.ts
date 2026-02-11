import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Auth routes that redirect to dashboard if already authenticated
const AUTH_ROUTES = ["/sign-in", "/create-account"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // Redirect authenticated users from auth pages to dashboard
  if (isAuthRoute && token !== undefined && token !== "") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users from protected routes to sign in
  if (isDashboardRoute && (token === undefined || token === "")) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Allow public routes and authenticated users on protected routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};
