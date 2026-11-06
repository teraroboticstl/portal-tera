import React from 'react';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import MemberPdis from '@/components/internal/MemberPdis';
function Content({ user }) {
  return <InternalPageLayout user={user} currentPage="MyPDI" title="Meu PDI"><MemberPdis /></InternalPageLayout>;
}
export default function MyPDI() {
  return <ProtectedRoute requireApproved={true}><Content /></ProtectedRoute>;
}
