/**
 * @file app/api/kernel/[...path]/route.ts
 * @description BFF — proxy générique authentifiant vers le kernel.
 *
 * Le navigateur appelle  /api/kernel/<chemin>  ; ce handler relaie vers
 * KERNEL_BASE_URL/api/<chemin> en injectant côté serveur les secrets de la
 * ClientApplication (X-Client-Id / X-Api-Key) et le Bearer token lu depuis la
 * session chiffrée. Les query-strings sont préservées.
 *
 * Exemple : front `GET /api/kernel/treasury/banks`
 *        -> kernel `GET /api/treasury/banks`
 */
import { NextRequest, NextResponse } from "next/server";
import { readSession, clearSession, kernelFetch } from "@/lib/server/kernel";

export const dynamic = "force-dynamic";

/**
 * Routes relayées qui n'exigent PAS de session utilisateur (l'authentification par
 * clé d'application suffit, ou le kernel gère lui-même l'accès public).
 * Tout le reste requiert une session : sans elle, le kernel répondrait un 403
 * « Access Denied » trompeur — on renvoie donc un 401 explicite à la place.
 */
const PUBLIC_PREFIXES = ["auth/"];

function requiresSession(path: string[]): boolean {
  const joined = path.join("/");
  return !PUBLIC_PREFIXES.some((prefix) => joined.startsWith(prefix));
}

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const search = req.nextUrl.search; // inclut le "?" éventuel
  const kernelPath = `/api/${path.join("/")}${search}`;

  const { session, state, sid } = await readSession();

  // Session absente ou illisible sur une route protégée : le dire clairement au front
  // plutôt que de laisser partir un appel sans Bearer (qui reviendrait en 403 opaque).
  if (state !== "valid" && requiresSession(path)) {
    // Cookie mort : on le supprime pour ne pas bloquer l'utilisateur à chaque rechargement.
    if (state === "invalid") await clearSession();
    const message =
      state === "invalid"
        ? "Session expirée ou invalide. Veuillez vous reconnecter."
        : "Vous n'êtes pas connecté. Veuillez vous authentifier.";
    return NextResponse.json(
      { success: false, message, errorCode: "SESSION_REQUIRED" },
      { status: 401 },
    );
  }

  // Corps : on relaie tel quel pour les méthodes qui en ont un.
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const contentType = req.headers.get("content-type") || "application/json";
  // Multipart (import de relevé) : corps relayé en binaire, la conversion texte pouvant altérer
  // le fichier ; le Content-Type d'origine porte la frontière (boundary).
  const isMultipart = contentType.startsWith("multipart/");
  const init: RequestInit = {
    method: req.method,
    headers: { "Content-Type": contentType },
    body: hasBody ? (isMultipart ? await req.arrayBuffer() : await req.text()) : undefined,
  };

  let res: Response;
  try {
    res = await kernelFetch(kernelPath, init, session, sid);
  } catch {
    // Kernel injoignable (réseau, kernel éteint…).
    return NextResponse.json(
      { message: "Kernel injoignable.", path: kernelPath },
      { status: 502 },
    );
  }

  // 401 renvoyé par le kernel malgré une session : le token est mort et le refresh a échoué.
  // On purge le cookie et on renvoie un message actionnable plutôt que l'erreur brute du kernel.
  if (res.status === 401 && state === "valid") {
    await clearSession();
    return NextResponse.json(
      {
        success: false,
        message: "Session expirée. Veuillez vous reconnecter.",
        errorCode: "SESSION_EXPIRED",
      },
      { status: 401 },
    );
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/json",
    },
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
