"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, Users, Info } from "lucide-react";
import {
  getOrganizationActors,
  linkActorToOrganization,
  type OrganizationActor,
} from "@/lib/api/organization";
import { getKnownActors, findActor } from "@/lib/api/actor-directory";
import type { Organization } from "@/types/organization";

/**
 * Valeurs de `type` réellement utilisées en base (`organization.organization_actor`).
 * Ce champ est un simple libellé d'appartenance : il **n'accorde aucune permission**.
 */
const MEMBER_TYPES = ["OWNER", "EMPLOYEE"] as const;

/** Valeur du <Select> pour basculer en saisie manuelle d'UUID. */
const MANUAL_ENTRY = "__manual__";

/**
 * Panneau de gestion des membres (acteurs) d'une organisation.
 *
 * Rattache un utilisateur à l'organisation via son `actorId`. Ce rattachement fournit le
 * contexte `X-Organization-Id`, sans lequel les écrans « organization-scoped » (comme les
 * catégories de banques) échouent.
 *
 * ⚠️ Ne pas confondre avec les rôles : les **permissions** viennent du rôle assigné à
 * l'utilisateur (`roles_core.user_role_assignment`, ex. « QA Tresorier »), pas d'ici. La table
 * `organization_actor` n'a aucun lien vers les rôles — son champ `type` (OWNER/EMPLOYEE) ne
 * décrit que l'appartenance.
 *
 * Les noms proviennent d'un annuaire local ([lib/api/actor-directory.ts]) : le kernel n'expose
 * aucun moyen de résoudre un `actorId` en nom. Un acteur inconnu s'affiche en UUID raccourci.
 */
export function OrganizationMembers({
  organization,
  open,
  onClose,
}: {
  organization: Organization | null;
  open: boolean;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<OrganizationActor[]>([]);
  const [loading, setLoading] = useState(false);
  /** Acteur choisi dans l'annuaire, ou MANUAL_ENTRY pour saisir un UUID à la main. */
  const [picked, setPicked] = useState<string>("");
  const [manualId, setManualId] = useState("");
  const [type, setType] = useState<string>("EMPLOYEE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Annuaire lu au montage : localStorage n'existe pas au rendu serveur.
  const [known, setKnown] = useState<ReturnType<typeof getKnownActors>>([]);
  useEffect(() => setKnown(getKnownActors()), []);

  const actorId = picked === MANUAL_ENTRY ? manualId.trim() : picked;

  const fetchMembers = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    setError(null);
    try {
      setMembers(await getOrganizationActors(organization.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Impossible de charger les membres.");
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    if (open) {
      setPicked("");
      setManualId("");
      setType("EMPLOYEE");
      setError(null);
      setSuccess(null);
      fetchMembers();
    }
  }, [open, fetchMembers]);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId);
  const alreadyMember = members.some((m) => m.actorId === actorId);

  const handleLink = async () => {
    if (!organization || !isUuid || alreadyMember) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await linkActorToOrganization(organization.id, actorId, type);
      const label = findActor(actorId)?.name ?? "L'utilisateur";
      setSuccess(`${label} a été rattaché à ${organization.displayName}.`);
      setPicked("");
      setManualId("");
      await fetchMembers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Échec du rattachement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membres de {organization?.displayName ?? "l'organisation"}
          </DialogTitle>
          <DialogDescription>
            Rattachez un utilisateur à cette organisation via son identifiant d&apos;acteur.
          </DialogDescription>
        </DialogHeader>

        {/* Rappel : ce panneau ne distribue pas de droits. */}
        <div className="flex gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Le rattachement définit l&apos;<strong>appartenance</strong> à l&apos;organisation, ce
            qui donne accès aux écrans liés à celle-ci. Il n&apos;accorde{" "}
            <strong>aucune permission</strong> : les droits proviennent du rôle de
            l&apos;utilisateur (ex. « QA Tresorier »), défini dans{" "}
            <em>Rôles &amp; Permissions</em>.
          </p>
        </div>

        {/* Formulaire de rattachement */}
        <div className="space-y-3 border-b border-border pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="actorPick">Utilisateur</Label>
            <Select value={picked} onValueChange={setPicked}>
              <SelectTrigger id="actorPick">
                <SelectValue placeholder="Sélectionner un utilisateur…" />
              </SelectTrigger>
              <SelectContent>
                {known.map((a) => (
                  <SelectItem key={a.actorId} value={a.actorId}>
                    {a.name}
                    {a.email ? ` — ${a.email}` : ""}
                    {a.role ? ` (${a.role})` : ""}
                  </SelectItem>
                ))}
                <SelectItem value={MANUAL_ENTRY}>Saisir un actorId manuellement…</SelectItem>
              </SelectContent>
            </Select>
            {picked === MANUAL_ENTRY && (
              <Input
                id="actorId"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="mt-2"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Seuls les utilisateurs créés depuis ce navigateur apparaissent ici : le backend
              n&apos;expose pas la liste des utilisateurs. Sinon, saisir l&apos;actorId à la main
              (il est renvoyé à la création d&apos;un utilisateur).
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="memberType">Type d&apos;appartenance</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="memberType" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleLink}
              disabled={!isUuid || alreadyMember || saving}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Rattacher
            </Button>
          </div>
          {picked === MANUAL_ENTRY && manualId.trim() && !isUuid && (
            <p className="text-xs text-amber-600">Format d&apos;UUID invalide.</p>
          )}
          {alreadyMember && (
            <p className="text-xs text-amber-600">
              Cet utilisateur est déjà membre de cette organisation.
            </p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
        </div>

        {/* Liste des membres */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Membres actuels
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun membre rattaché.</p>
          ) : (
            members.map((m) => {
              const known = findActor(m.actorId);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" title={m.actorId}>
                      {known?.name ?? `${m.actorId.slice(0, 8)}…`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {known?.email ?? "Utilisateur inconnu de cet annuaire"}
                      {known?.role ? ` · ${known.role}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {m.type ?? "MEMBRE"}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
