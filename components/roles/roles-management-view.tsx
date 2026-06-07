"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Shield, Trash2, Edit, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { getRoles, createRole, updateRole, deleteRole } from "@/lib/api/role";
import type { Role, CreateRolePayload, UpdateRolePayload } from "@/types/role";
import { BUILTIN_PERMISSIONS, MODULE_LABELS } from "@/types/role";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

// ─── Role form ────────────────────────────────────────────────────────────────

const roleSchema = z.object({
  code: z.string().min(2, "Code requis"),
  label: z.string().min(2, "Libellé requis"),
  description: z.string().optional(),
});
type RoleFormData = z.infer<typeof roleSchema>;

function RoleForm({
  role,
  selectedPermissions,
  onPermissionsChange,
  onSave,
  onCancel,
  loading,
}: {
  role?: Role | null;
  selectedPermissions: string[];
  onPermissionsChange: (perms: string[]) => void;
  onSave: (data: RoleFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}) {
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      code: role?.code ?? "",
      label: role?.label ?? "",
      description: role?.description ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      code: role?.code ?? "",
      label: role?.label ?? "",
      description: role?.description ?? "",
    });
  }, [role]);

  const grouped = BUILTIN_PERMISSIONS.reduce<Record<string, typeof BUILTIN_PERMISSIONS>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const toggle = (code: string) => {
    onPermissionsChange(
      selectedPermissions.includes(code)
        ? selectedPermissions.filter((p) => p !== code)
        : [...selectedPermissions, code]
    );
  };

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {!role && (
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="role-code">Code</Label>
            <Input id="role-code" placeholder="MANAGER" {...form.register("code")} />
            {form.formState.errors.code && (
              <p className="text-xs text-red-500">{form.formState.errors.code.message}</p>
            )}
          </div>
        )}
        <div className={`space-y-1.5 ${!role ? "col-span-2 sm:col-span-1" : "col-span-2"}`}>
          <Label htmlFor="role-label">Libellé</Label>
          <Input id="role-label" placeholder="Responsable commercial" {...form.register("label")} />
          {form.formState.errors.label && (
            <p className="text-xs text-red-500">{form.formState.errors.label.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role-desc">Description <span className="text-slate-400">(optionnel)</span></Label>
        <Input id="role-desc" placeholder="..." {...form.register("description")} />
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-medium">Permissions</p>
        <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
          {Object.entries(grouped).map(([module, perms]) => (
            <div key={module}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {MODULE_LABELS[module] ?? module}
              </p>
              <div className="space-y-1.5 pl-1">
                {perms.map((p) => (
                  <label key={p.code} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedPermissions.includes(p.code)}
                      onCheckedChange={() => toggle(p.code)}
                    />
                    <span className="text-sm">{p.label}</span>
                    <code className="text-xs text-slate-400 ml-auto">{p.code}</code>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {role ? "Enregistrer" : "Créer le rôle"}
        </Button>
      </div>
    </form>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function RolesManagementView() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Role | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreate = () => {
    setEditTarget(null);
    setFormPermissions([]);
    setFormOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditTarget(role);
    setFormPermissions(role.permissions ?? []);
    setFormOpen(true);
  };

  const handleSave = async (data: RoleFormData) => {
    setSaving(true);
    try {
      if (editTarget) {
        await updateRole(editTarget.id, {
          label: data.label,
          description: data.description,
          permissions: formPermissions,
        } as UpdateRolePayload);
      } else {
        await createRole({
          code: data.code,
          label: data.label,
          description: data.description,
          permissions: formPermissions,
        } as CreateRolePayload);
      }
      setFormOpen(false);
      await fetchRoles();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRole(deleteTarget.id);
      if (selected?.id === deleteTarget.id) setSelected(null);
      await fetchRoles();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const selectedRole = selected ? roles.find((r) => r.id === selected.id) ?? null : null;

  return (
    <div className="flex gap-4 h-full">
      {/* Role list */}
      <div className="w-72 flex-shrink-0 border rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b bg-slate-50">
          <span className="text-sm font-semibold">Rôles</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchRoles}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" className="h-7 text-xs px-2" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nouveau
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Shield className="h-6 w-6 mx-auto mb-1 opacity-30" />
              <p className="text-xs">Aucun rôle</p>
            </div>
          ) : (
            roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelected(role)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors border-b last:border-0 ${
                  selected?.id === role.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium leading-none">{role.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{role.code}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Role detail */}
      <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
        {!selectedRole ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Shield className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Sélectionnez un rôle</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-3.5 border-b bg-slate-50">
              <div>
                <h2 className="font-semibold">{selectedRole.label}</h2>
                <code className="text-xs text-slate-400">{selectedRole.code}</code>
              </div>
              <div className="flex items-center gap-2">
                {!selectedRole.isSystem && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEdit(selectedRole)}>
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(selectedRole)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Supprimer
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {selectedRole.description && (
                <p className="text-sm text-slate-600">{selectedRole.description}</p>
              )}

              {selectedRole.isSystem && (
                <Badge variant="secondary" className="text-xs">Rôle système</Badge>
              )}

              <div>
                <p className="text-sm font-semibold mb-3">Permissions assignées</p>
                {selectedRole.permissions?.length === 0 ? (
                  <p className="text-sm text-slate-400">Aucune permission</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(
                      (selectedRole.permissions ?? []).reduce<Record<string, string[]>>((acc, code) => {
                        const perm = BUILTIN_PERMISSIONS.find((p) => p.code === code);
                        const module = perm?.module ?? "other";
                        if (!acc[module]) acc[module] = [];
                        acc[module].push(code);
                        return acc;
                      }, {})
                    ).map(([module, codes]) => (
                      <div key={module}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          {MODULE_LABELS[module] ?? module}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {codes.map((code) => {
                            const perm = BUILTIN_PERMISSIONS.find((p) => p.code === code);
                            return (
                              <Badge key={code} variant="outline" className="text-xs font-normal">
                                {perm?.label ?? code}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="fixed bottom-4 right-4 bg-red-100 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg shadow">
          {error}
        </p>
      )}

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) setFormOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Modifier le rôle" : "Nouveau rôle"}</DialogTitle>
          </DialogHeader>
          <RoleForm
            role={editTarget}
            selectedPermissions={formPermissions}
            onPermissionsChange={setFormPermissions}
            onSave={handleSave}
            onCancel={() => setFormOpen(false)}
            loading={saving}
          />
        </DialogContent>
      </Dialog>

      {deleteTarget && (
        <ConfirmationDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title={`Supprimer le rôle "${deleteTarget.label}" ?`}
          description="Les utilisateurs assignés à ce rôle perdront les permissions associées."
        />
      )}
    </div>
  );
}
