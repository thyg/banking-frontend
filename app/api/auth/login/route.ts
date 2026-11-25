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
import { KERNEL_BASE_URL, kernelHeaders, type KernelSession } from "@/lib/server/kernel";
import { mfaStepResponse, openSessionFromKernel } from "@/lib/server/login-session";

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

  // MFA requis : pas de session, on renvoie l'étape (le client saisit le code reçu).
  if (res.status === 202 || data?.nextStep === "CONFIRM_MFA") {
    return mfaStepResponse(data);
  }

  if (!res.ok) {
    // Les messages explicites du kernel sont relayés (ex. « cette adresse n'est plus un
    // identifiant de connexion, votre identifiant Yowyob vous a été envoyé ») ; seul l'échec
    // d'authentification générique garde un message neutre.
    const explicit = json?.errorCode && json.errorCode !== "AUTH_INVALID_CREDENTIALS" && json?.message;
    const message = explicit
      ? json.message
      : res.status === 401
        ? "Identifiant ou mot de passe incorrect."
        : data?.message || "Erreur de connexion.";
    return NextResponse.json({ message, errorCode: json?.errorCode }, { status: res.status || 500 });
  }

  return openSessionFromKernel(data, tenantId, email ?? principal);
}
