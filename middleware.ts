import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

/** Rutas públicas: no requieren sesión. */
const PUBLIC_ROUTES = ["/", "/login", "/chat"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const path = nextUrl.pathname;

  const isPublic =
    PUBLIC_ROUTES.includes(path) ||
    // /chat/<slug>: el chat público de cada empresa.
    path.startsWith("/chat/") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/api/ai/chat");

  // Usuario autenticado en /login -> al dashboard
  if (isLoggedIn && path === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (isPublic) return NextResponse.next();

  // Rutas protegidas sin sesión
  if (!isLoggedIn) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Ejecuta el middleware en todo excepto assets estáticos
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
