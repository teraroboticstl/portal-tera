import React from 'react';
import {Navigate} from 'react-router-dom';

// Old bookmarks no longer mount scouting or load its data. The destination
// retains the existing authentication and FRC modality checks.
export default function InternalFRCScout() {
  return <Navigate to="/InternalFRC" replace />;
}
