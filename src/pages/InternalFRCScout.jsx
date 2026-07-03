import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import FastScoutInterface from '@/components/frc/FastScoutInterface';

function FRCScoutContent({ user }) {
  const qc = useQueryClient();

  const createScoutMutation = useMutation({
    mutationFn: (data) => base44.entities.FRCScout.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['frc-scouts'] }),
  });

  return (
    <InternalPageLayout user={user} currentPage="InternalFRCScout" title="Scout FRC – REBUILT 2026">
      <FastScoutInterface 
        onSave={(data) => createScoutMutation.mutate(data)}
        isSaving={createScoutMutation.isPending}
      />
    </InternalPageLayout>
  );
}

export default function InternalFRCScout() {
  return (
    <ProtectedRoute requireApproved={true}>
      <FRCScoutContent />
    </ProtectedRoute>
  );
}