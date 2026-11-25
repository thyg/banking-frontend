/**
 * @file lib/server/login-session.ts
 * @description Ouverture de session BFF à partir d'une réponse d'authentification du kernel.
 * Partagé par le login direct et par la confirmation MFA : dans les deux cas le kernel renvoie
 * le même profil + jetons, et le navigateur ne reçoit jamais que le profil non sensible.
 */
import { NextResponse } from "next/server";
import { setSession, type KernelSession } from "@/lib/server/kernel";

/** Corps « profil » renvoyé au client après ouverture de la session. */
export async function openSessionFromKernel(
  data: any,
  fallbackTenantId?: string,
  fallbackEmail?: string,
): Promise<NextResponse> {
  const accessToken = data?.accessToken ?? data?.token ?? data?.sessionToken;
  if (!accessToken) {
    return NextResponse.json({ message: "Réponse du kernel sans token." }, { status: 502 });
  }
  const session: KernelSession = {
    accessToken,
    refreshToken: data.refreshToken,
    tenantId: data.tenantId ?? fallbackTenantId,
    organizationId: data.organizationId,
    userId: data.id ?? data.userId,
    email: data.email ?? fallbackEmail,
    expiresAt: data.expiresInSeconds ? Date.now() + data.expiresInSeconds * 1000 : undefined,
  };
  await setSession(session);
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

/**
 * Étape MFA renvoyée au client. Le code de prévisualisation (`codePreview`) que le kernel fournit
 * en développement n'est relayé que hors production, pour pouvoir tester sans boîte mail.
 */
export function mfaStepResponse(data: any): NextResponse {
  return NextResponse.json(
    {
      nextStep: "CONFIRM_MFA",
      mfaToken: data?.mfaToken,
      channel: data?.channel,
      expiresInSeconds: data?.expiresInSeconds,
      devCode: process.env.NODE_ENV !== "production" ? data?.codePreview : undefined,
    },
    { status: 202 },
  );
}
