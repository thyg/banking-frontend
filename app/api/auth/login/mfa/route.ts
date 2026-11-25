/**
 * @file app/api/auth/login/mfa/route.ts
 * @description BFF — confirmation du code MFA de connexion. Relaie vers
 * POST /api/auth/login/mfa/confirm du kernel puis ouvre la session, comme un login direct.
 */
import { NextRequest, NextResponse } from "next/server";
import { KERNEL_BASE_URL, kernelHeaders, type KernelSession } from "@/lib/server/kernel";
import { openSessionFromKernel } from "@/lib/server/login-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { mfaToken, code, tenantId } = (await req.json().catch(() => ({}))) ?? {};
  if (!mfaToken || !code) {
    return NextResponse.json({ message: "Code de vérification requis." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${KERNEL_BASE_URL}/api/auth/login/mfa/confirm`, {
      method: "POST",
      headers: kernelHeaders(
        tenantId ? ({ tenantId } as KernelSession) : null,
        { "Content-Type": "application/json" },
      ),
      body: JSON.stringify({ mfaToken, code: String(code).trim() }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Kernel injoignable." }, { status: 502 });
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Les messages du kernel sont en anglais (« Invalid MFA challenge. ») : message utilisateur.
    const message =
      res.status === 401 || res.status === 400
        ? "Code invalide ou expiré. Vérifiez le code reçu ou recommencez la connexion."
        : res.status === 429
          ? "Trop de tentatives. Patientez avant de réessayer."
          : "Erreur lors de la vérification du code.";
    return NextResponse.json({ message, errorCode: json?.errorCode }, { status: res.status });
  }
  return openSessionFromKernel(json?.data ?? json, tenantId);
}
