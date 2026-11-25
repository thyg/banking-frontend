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
import { readSession, setSessionOrganization } from "@/lib/server/kernel";

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

export async function PUT(req: Request) {
  const { state } = await readSession();
  if (state !== "valid") return sessionRequired();

  const body = await req.json().catch(() => null);
  const organizationId = body?.organizationId ?? null;

  if (organizationId !== null && !UUID_RE.test(String(organizationId))) {
    return NextResponse.json(
      { success: false, message: "organizationId invalide.", errorCode: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const ok = await setSessionOrganization(organizationId);
  if (!ok) return sessionRequired();

  return NextResponse.json({ organizationId });
}
