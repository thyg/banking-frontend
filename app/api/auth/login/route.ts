/**
 * @file app/api/auth/login/route.ts
 * @description BFF — connexion. Relaie vers POST /api/auth/login du kernel,
 * dépose la session (accessToken + refreshToken) dans un cookie httpOnly
 * chiffré, et ne renvoie au navigateur que le profil utilisateur (jamais de
 * secret ni de token brut).
 *
 * Gère le cas MFA : si le kernel répond 202 avec nextStep=CONFIRM_MFA, on
 * renvoie l'étape au front sans créer de session.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  KERNEL_BASE_URL,
  kernelHeaders,
  setSession,
  type KernelSession,
} from "@/lib/server/kernel";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, principal, password, tenantId } = body ?? {};

  let res: Response;
  try {
    res = await fetch(`${KERNEL_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: kernelHeaders(
        tenantId ? ({ tenantId } as KernelSession) : null,
        { "Content-Type": "application/json" },
      ),
      body: JSON.stringify({ principal: principal ?? email, password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Kernel injoignable." }, { status: 502 });
  }

  const json = await res.json().catch(() => ({}));
  const data = json?.data ?? json;

  // MFA requis : pas de session, on renvoie l'étape.
  if (res.status === 202 || data?.nextStep === "CONFIRM_MFA") {
    return NextResponse.json(
      { nextStep: "CONFIRM_MFA", mfaToken: data?.mfaToken },
      { status: 202 },
    );
  }

  if (!res.ok) {
    const message =
      res.status === 401
        ? "Email ou mot de passe incorrect."
        : data?.message || "Erreur de connexion.";
    return NextResponse.json({ message }, { status: res.status || 500 });
  }

  const accessToken = data.accessToken ?? data.token ?? data.sessionToken;
  if (!accessToken) {
    return NextResponse.json(
      { message: "Réponse du kernel sans token." },
      { status: 502 },
    );
  }

  const session: KernelSession = {
    accessToken,
    refreshToken: data.refreshToken,
    tenantId: data.tenantId ?? tenantId,
    organizationId: data.organizationId,
    userId: data.id ?? data.userId,
    email: email ?? data.email,
    expiresAt: data.expiresInSeconds
      ? Date.now() + data.expiresInSeconds * 1000
      : undefined,
  };
  await setSession(session);

  // Profil non sensible renvoyé au client.
  return NextResponse.json({
    user: {
      userId: session.userId,
      tenantId: session.tenantId,
      organizationId: session.organizationId,
      actorId: data.actorId,
      email: session.email,
    },
  });
}
