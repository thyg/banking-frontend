/**
 * @file app/api/auth/logout/route.ts
 * @description BFF — déconnexion. Notifie le kernel (best-effort) puis efface
 * la session côté serveur.
 */
import { NextResponse } from "next/server";
import {
  KERNEL_BASE_URL,
  getSession,
  kernelHeaders,
  clearSession,
} from "@/lib/server/kernel";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (session) {
    // Best-effort : on ignore l'échec côté kernel.
    await fetch(`${KERNEL_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: kernelHeaders(session, { "Content-Type": "application/json" }),
      cache: "no-store",
    }).catch(() => undefined);
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
