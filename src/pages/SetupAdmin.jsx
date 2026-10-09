import React from 'react';
import {Navigate} from 'react-router-dom';
import ProtectedRoute from '@/components/internal/ProtectedRoute';

// Bootstrap is complete. Access levels are managed by authorized leaders only.
export default function SetupAdmin(){
  return <ProtectedRoute requireAdmin><Navigate to="/AdminPanel" replace /></ProtectedRoute>;
}
