"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Client } from '@/types/core';
import { getClients, createClient, updateClient, deleteClient } from '@/lib/api';
import { CustomerListView } from '@/components/customers/customer-list-view';
import { CustomerDetailView } from '@/components/customers/customer-detail-view';
import { useCompose } from '@/hooks/use-compose-store';
import { CustomerForm } from '@/components/customers/customer-form';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export const dynamic = 'force-dynamic';

export default function CustomersPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  
  const { onOpen, onClose: closeCompose } = useCompose();

  const fetchAndSetClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getClients();
      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndSetClients();
  }, [fetchAndSetClients]);

  const handleSave = async (data: Client) => {
    const isNew = !data.id;
    try {
        if (isNew) {
            await createClient(data);
            closeCompose();
        } else {
            await updateClient(data.id, data);
        }
        await fetchAndSetClients();
    } catch (error) {
        console.error("Failed to save client", error);
    }
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    try {
      await deleteClient(clientToDelete.id);
      await fetchAndSetClients();
      if (selectedClientId === clientToDelete.id) {
          setSelectedClientId(null);
      }
    } catch (error) {
      console.error("Failed to delete client:", error);
    } finally {
      setClientToDelete(null);
    }
  };

  const handleOpenCompose = () => {
    onOpen({
      title: "Nouveau Client",
      content: <CustomerForm onSave={handleSave} initialData={null} />
    });
  };

  const handleBackToList = () => {
    setSelectedClientId(null);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  if (selectedClientId && selectedClient) {
    return (
      <CustomerDetailView 
        client={selectedClient} 
        onSave={handleSave} 
        onDelete={() => setClientToDelete(selectedClient)}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <>
      <CustomerListView 
        clients={clients} 
        isLoading={isLoading}
        onSelectClient={setSelectedClientId}
        onEditClient={setSelectedClientId}
        onDeleteClient={setClientToDelete}
        onAddNew={handleOpenCompose}
        onRefresh={fetchAndSetClients}
      />
      {clientToDelete && (
        <ConfirmationDialog
            isOpen={!!clientToDelete}
            onClose={() => setClientToDelete(null)}
            onConfirm={confirmDelete}
            title={`Supprimer ${clientToDelete.companyName} ?`}
            description="Cette action est irréversible. Toutes les données associées à ce client seront perdues."
        />
      )}
    </>
  );
}