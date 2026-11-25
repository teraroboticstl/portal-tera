import React from 'react';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import LinkedFrcScouting from '@/components/frc/LinkedFrcScouting';

function FRCScoutContent({ user }) {

  return (
    <InternalPageLayout user={user} currentPage="InternalFRCScout" title="Tera Scouting — FRC">
      <LinkedFrcScouting user={user}/>
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
