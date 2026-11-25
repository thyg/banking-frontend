/**
 * @file app/(auth)/select-organization/page.tsx
 * @description Choix de l'organisation de travail après la connexion.
 *
 * Le kernel n'attribue pas d'organisation au login : sans elle, le BFF n'envoie pas
 * `X-Organization-Id` et toutes les routes trésorerie sont refusées. On liste donc les
 * organisations de l'utilisateur pour le service Trésorerie (avec, pour celles qui n'y ont pas
 * accès, le motif), puis on fixe l'organisation choisie dans la session.
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, AlertCircle, ArrowRight, LogOut, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import {
  listTreasuryWorkspaces,
  selectOrganization,
  type Workspace,
} from "@/lib/api/session-organization";

export const dynamic = "force-dynamic";

export default function SelectOrganizationPage() {
  const router = useRouter();
  const logout = useAuth((s) => s.logout);
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const choose = useCallback(async (organizationId: string) => {
    setPending(organizationId);
    setError(null);
    try {
      await selectOrganization(organizationId);
      router.replace("/banking");
    } catch (e: any) {
      setError(e.message || "Impossible de sélectionner cette organisation.");
      setPending(null);
    }
  }, [router]);

  useEffect(() => {
    listTreasuryWorkspaces()
      .then((list) => {
        setWorkspaces(list);
        const granted = list.filter((w) => w.accessGranted && w.organizationId);
        // Une seule organisation accessible : inutile de faire choisir.
        if (granted.length === 1) void choose(granted[0].organizationId as string);
      })
      .catch((e) => setError(e.message));
  }, [choose]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    logout();
    router.replace("/login");
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-border/60 rounded-2xl overflow-hidden py-0 gap-0">
      <CardHeader className="bg-gradient-to-br from-primary to-primary/70 p-8 text-center space-y-2 border-b-0">
        <div className="mx-auto w-14 h-14 bg-primary-foreground/15 rounded-xl flex items-center justify-center mb-2">
          <Building2 className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary-foreground">Choisir une organisation</h1>
        <p className="text-primary-foreground/80 text-sm">Organisation dans laquelle vous allez travailler</p>
      </CardHeader>

      <CardContent className="p-8 space-y-4">
        {error && (
          <Alert variant="destructive" className="py-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {workspaces === null && !error && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement de vos organisations…
          </div>
        )}

        {workspaces !== null && workspaces.length === 0 && (
          <Alert className="py-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Votre compte n&apos;est rattaché à aucune organisation. Demandez à un administrateur de vous y ajouter.
            </AlertDescription>
          </Alert>
        )}

        {workspaces?.map((w) => {
          const id = w.organizationId ?? `${w.tenantId}-sans-organisation`;
          const selectable = w.accessGranted && !!w.organizationId;
          return (
            <button
              key={id}
              type="button"
              disabled={!selectable || pending !== null}
              onClick={() => selectable && choose(w.organizationId as string)}
              className={`w-full text-left rounded-lg border p-4 flex items-center gap-3 transition-colors ${
                selectable ? "hover:border-primary hover:bg-primary/5" : "opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                {selectable ? <Building2 className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {w.organizationName ?? w.organizationCode ?? (w.organizationId ? "Organisation" : "Espace sans organisation")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectable
                    ? (w.roleName ? `Rôle : ${w.roleName}` : "Accès au service Trésorerie")
                    : !w.organizationId && w.scopeType === "TENANT"
                      ? `Votre rôle « ${w.roleName ?? "?"} » n'est rattaché à aucune organisation : demandez à un administrateur de vous l'attribuer sur une organisation.`
                      : w.accessDeniedReason}
                </p>
              </div>
              {pending === w.organizationId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                selectable && <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          );
        })}

        <Button variant="ghost" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Se déconnecter
        </Button>
      </CardContent>
    </Card>
  );
}
