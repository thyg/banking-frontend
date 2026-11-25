/**
 * @file middleware.ts
 * @description Garde d'accès aux pages applicatives.
 *
 * Sans cookie de session BFF, une page du tableau de bord s'affichait quand même (coquille vide,
 * « aucun compte configuré », toasts d'erreur) : on redirige vers la connexion. La validité réelle
 * de la session reste contrôlée par le BFF ; une session refusée renvoie aussi vers /login.
 */
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/register", "/select-organization", "/api", "/_next", "/favicon", "/images", "/public"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || /\.[a-z0-9]+$/i.test(pathname)) {
    return NextResponse.next();
  }
  if (!req.cookies.get("ksm-session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
