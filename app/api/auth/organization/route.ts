/**
 * @file app/api/auth/organization/route.ts
 * @description BFF — organisation de travail de la session.
 *
 * Le kernel ne renvoie pas d'`organizationId` au login : c'est au client de choisir dans
 * quelle organisation il travaille. Ce choix est conservé **côté serveur**, dans la session,
 * pour que le BFF puisse injecter `X-Organization-Id` sur chaque appel au kernel — jamais
 * dans un cookie ou un en-tête que le navigateur pourrait forger.
 *
 * GET  → { organizationId } de la session (null si non défini)
 * PUT  { organizationId }  → fixe l'organisation (null pour l'effacer)
 */
import { NextResponse } from "next/server";
import { kernelFetch, readSession, setSessionOrganization } from "@/lib/server/kernel";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sessionRequired() {
  return NextResponse.json(
    {
      success: false,
      message: "Vous n'êtes pas connecté. Veuillez vous authentifier.",
      errorCode: "SESSION_REQUIRED",
    },
    { status: 401 },
  );
}

export async function GET() {
  const { session, state } = await readSession();
  if (state !== "valid" || !session) return sessionRequired();
  return NextResponse.json({ organizationId: session.organizationId ?? null });
}

/**
 * L'organisation demandée doit être l'un des espaces de l'utilisateur, avec un accès accordé
 * (même règle que l'écran de choix). Sans ce contrôle, le navigateur pouvait faire porter à la
 * session n'importe quelle organisation du tenant, que le BFF relayait ensuite au kernel en
 * X-Organization-Id. La liste vient du kernel, interrogé avec le token de la session.
 */
async function isGrantedOrganization(
  session: NonNullable<Awaited<ReturnType<typeof readSession>>["session"]>,
  sid: string | undefined,
  organizationId: string,
): Promise<boolean> {
  // Sans l'organisation éventuellement déjà choisie : la liste ne doit pas dépendre de l'ancien choix.
  const res = await kernelFetch(
    "/api/auth/me/workspaces?serviceCode=TREASURY",
    { method: "GET" },
    { ...session, organizationId: undefined },
    sid,
  ).catch(() => null);
  if (!res || !res.ok) return false;
  const json = await res.json().catch(() => null);
  const workspaces: Array<{ organizationId?: string | null; accessGranted?: boolean }> =
    (json?.data ?? json ?? []) as any[];
  return Array.isArray(workspaces) && workspaces.some(
    (w) => w.accessGranted === true && !!w.organizationId
      && String(w.organizationId).toLowerCase() === organizationId.toLowerCase());
}

export async function PUT(req: Request) {
  const { session, state, sid } = await readSession();
  if (state !== "valid" || !session) return sessionRequired();

  const body = await req.json().catch(() => null);
  const organizationId = body?.organizationId ?? null;

  if (organizationId !== null && !UUID_RE.test(String(organizationId))) {
    return NextResponse.json(
      { success: false, message: "organizationId invalide.", errorCode: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  if (organizationId !== null && !(await isGrantedOrganization(session, sid, String(organizationId)))) {
    return NextResponse.json(
      {
        success: false,
        message: "Vous n'avez pas accès à cette organisation.",
        errorCode: "ORGANIZATION_FORBIDDEN",
      },
      { status: 403 },
    );
  }

  const ok = await setSessionOrganization(organizationId);
  if (!ok) return sessionRequired();

  return NextResponse.json({ organizationId });
}
