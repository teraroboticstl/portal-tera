import React from 'react';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import ProjectsManagement from '@/components/admin/ProjectsManagement';

function Content({user}){
 return <InternalPageLayout user={user} currentPage="InternalProjects" title="Projetos"><ProjectsManagement user={user} /></InternalPageLayout>;
}
export default function InternalProjects(){return <ProtectedRoute requireApproved><Content /></ProtectedRoute>;}
