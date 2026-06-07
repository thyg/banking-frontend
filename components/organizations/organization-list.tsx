"use client";

import React, { useState } from "react";
import {
  Building2,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  PauseCircle,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Organization } from "@/types/organization";
import {
  GOVERNANCE_STATUS_LABELS,
  GOVERNANCE_STATUS_COLORS,
  ORGANIZATION_TYPES,
} from "@/types/organization";

interface Props {
  organizations: Organization[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
  onApprove: (org: Organization) => void;
  onReject: (org: Organization) => void;
  onSuspend: (org: Organization) => void;
  onRefresh: () => void;
}

function StatusBadge({ status }: { status: Organization["governanceStatus"] }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${GOVERNANCE_STATUS_COLORS[status]}`}
    >
      {GOVERNANCE_STATUS_LABELS[status]}
    </span>
  );
}

function OrgTypeBadge({ type }: { type: string }) {
  const label = ORGANIZATION_TYPES.find((t) => t.value === type)?.label ?? type;
  return (
    <Badge variant="outline" className="text-xs">
      {label}
    </Badge>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 5 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function OrganizationList({
  organizations,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onSuspend,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = organizations.filter((o) =>
    [o.code, o.legalName, o.displayName].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nouvelle organisation
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden flex-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Code</TableHead>
              <TableHead>Raison sociale</TableHead>
              <TableHead>Nom affiché</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-slate-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search
                    ? "Aucune organisation ne correspond à votre recherche"
                    : "Aucune organisation"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((org) => (
                <TableRow key={org.id} className="group">
                  <TableCell className="font-mono text-sm font-medium">{org.code}</TableCell>
                  <TableCell className="font-medium">{org.legalName}</TableCell>
                  <TableCell className="text-slate-600">{org.displayName}</TableCell>
                  <TableCell>
                    <OrgTypeBadge type={org.organizationType} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={org.governanceStatus} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(org)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {org.governanceStatus === "PENDING" && (
                          <>
                            <DropdownMenuItem
                              className="text-green-600"
                              onClick={() => onApprove(org)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approuver
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => onReject(org)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Rejeter
                            </DropdownMenuItem>
                          </>
                        )}
                        {org.governanceStatus === "APPROVED" && (
                          <DropdownMenuItem
                            className="text-yellow-600"
                            onClick={() => onSuspend(org)}
                          >
                            <PauseCircle className="h-4 w-4 mr-2" />
                            Suspendre
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(org)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
