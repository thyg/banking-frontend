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
import { getSession, kernelFetch } from "@/lib/server/kernel";

export const dynamic = "force-dynamic";

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const search = req.nextUrl.search; // inclut le "?" éventuel
  const kernelPath = `/api/${path.join("/")}${search}`;

  const session = await getSession();

  // Corps : on relaie tel quel pour les méthodes qui en ont un.
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const init: RequestInit = {
    method: req.method,
    headers: { "Content-Type": req.headers.get("content-type") || "application/json" },
    body: hasBody ? await req.text() : undefined,
  };

  let res: Response;
  try {
    res = await kernelFetch(kernelPath, init, session);
  } catch {
    // Kernel injoignable (réseau, kernel éteint…).
    return NextResponse.json(
      { message: "Kernel injoignable.", path: kernelPath },
      { status: 502 },
    );
  }

  // 401 même après refresh : la session est morte, on le signale au front.
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
