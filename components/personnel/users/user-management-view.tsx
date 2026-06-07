"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { registerApi, type RegisteredUser } from '@/lib/api/auth';
import { getRoles, assignRoleToUser } from '@/lib/api/role';
import { NewUserDialog, type NewUserPayload } from './new-user-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle2, UserCheck } from 'lucide-react';
import type { Role } from '@/types/role';

interface CreatedUser extends RegisteredUser {
  createdAt: string;
  roleLabel?: string;
}

export function UserManagementView() {
  const [users, setUsers] = useState<CreatedUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<RegisteredUser | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    getRoles().then(setRoles).catch(() => {});
  }, []);

  const handleCreate = useCallback(async (data: NewUserPayload) => {
    setError(null);
    setSuccess(null);
    const created = await registerApi({
      username: data.username,
      email: data.email,
      password: data.password,
    });
    setPendingUser(created);
    setSelectedRoleId('');
  }, []);

  const handleAssignRole = async () => {
    if (!pendingUser || !selectedRoleId) return;
    setError(null);
    try {
      await assignRoleToUser(pendingUser.id, selectedRoleId);
      const role = roles.find(r => r.id === selectedRoleId);
      setUsers(prev => [...prev, {
        ...pendingUser,
        createdAt: new Date().toISOString(),
        roleLabel: role?.label,
      }]);
      setSuccess(`Utilisateur "${pendingUser.username}" créé et rôle "${role?.label}" assigné.`);
      setPendingUser(null);
      setSelectedRoleId('');
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de l'assignation du rôle.");
    }
  };

  const handleSkipRole = () => {
    if (!pendingUser) return;
    setUsers(prev => [...prev, { ...pendingUser, createdAt: new Date().toISOString() }]);
    setSuccess(`Utilisateur "${pendingUser.username}" créé. Aucun rôle assigné pour l'instant.`);
    setPendingUser(null);
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex gap-4">
      {/* Liste */}
      <Card className="w-1/3 flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Utilisateurs créés</CardTitle>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Nouveau
            </Button>
          </div>
          <Input
            className="mt-2"
            placeholder="Filtrer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Aucun utilisateur dans cette session.
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((u, i) => (
                <div key={i} className="p-2 rounded-md hover:bg-accent">
                  <p className="font-semibold text-sm">{u.username}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  {u.roleLabel && (
                    <p className="text-xs text-blue-500 mt-0.5">Rôle : {u.roleLabel}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panneau droite */}
      <div className="w-2/3">
        {/* Étape 2 : assigner un rôle au nouvel utilisateur */}
        {pendingUser ? (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <UserCheck className="h-5 w-5" />
              <span className="font-medium">
                Utilisateur <strong>{pendingUser.username}</strong> créé avec succès !
              </span>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Étape 2 — Assigner un rôle (optionnel)</p>
              <p className="text-xs text-muted-foreground">
                Sans rôle, l'utilisateur pourra se connecter mais verra <strong>403 Forbidden</strong> sur toutes les pages.
              </p>

              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un rôle…" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label} <span className="text-muted-foreground text-xs ml-1">({r.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2">
                <Button onClick={handleAssignRole} disabled={!selectedRoleId}>
                  Assigner le rôle
                </Button>
                <Button variant="outline" onClick={handleSkipRole}>
                  Passer cette étape
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
            {success && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 px-4 py-3 rounded-md w-full max-w-sm">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{success}</span>
              </div>
            )}
            <p className="text-muted-foreground text-sm max-w-xs">
              Cliquez sur <strong>Nouveau</strong> pour créer un utilisateur.<br />
              Vous pourrez lui assigner un rôle immédiatement après.
            </p>
          </Card>
        )}
      </div>

      <NewUserDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
