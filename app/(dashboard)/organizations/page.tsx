"use client";

import React, { useState, useEffect, useCallback } from "react";
import { OrganizationList } from "@/components/organizations/organization-list";
import { OrganizationForm } from "@/components/organizations/organization-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
} from "@/lib/api/organization";
import type { Organization, CreateOrganizationPayload, UpdateOrganizationPayload } from "@/types/organization";

export const dynamic = "force-dynamic";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Organization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getOrganizations();
      setOrganizations(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (org: Organization) => {
    setEditTarget(org);
    setFormOpen(true);
  };

  const handleSave = async (payload: CreateOrganizationPayload | UpdateOrganizationPayload) => {
    setSaving(true);
    try {
      if (editTarget) {
        await updateOrganization(editTarget.id, payload as UpdateOrganizationPayload);
      } else {
        await createOrganization(payload as CreateOrganizationPayload);
      }
      setFormOpen(false);
      await fetchOrganizations();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOrganization(deleteTarget.id);
      await fetchOrganizations();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleApprove = async (org: Organization) => {
    try {
      await approveOrganization(org.id);
      await fetchOrganizations();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleReject = async (org: Organization) => {
    try {
      await rejectOrganization(org.id);
      await fetchOrganizations();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSuspend = async (org: Organization) => {
    try {
      await suspendOrganization(org.id);
      await fetchOrganizations();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-shrink-0">
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Organisations</h1>
        <p className="text-muted-foreground text-sm">
          Gérez les organisations et leurs statuts de gouvernance.
        </p>
        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <OrganizationList
          organizations={organizations}
          isLoading={isLoading}
          onAdd={openCreate}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onApprove={handleApprove}
          onReject={handleReject}
          onSuspend={handleSuspend}
          onRefresh={fetchOrganizations}
        />
      </div>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) setFormOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Modifier l'organisation" : "Nouvelle organisation"}
            </DialogTitle>
          </DialogHeader>
          <OrganizationForm
            organization={editTarget}
            onSave={handleSave}
            onCancel={() => setFormOpen(false)}
            loading={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmationDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title={`Supprimer "${deleteTarget.displayName}" ?`}
          description="Cette action est irréversible. L'organisation sera définitivement supprimée."
        />
      )}
    </div>
  );
}
