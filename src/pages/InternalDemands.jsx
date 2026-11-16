import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import DemandBoard from '@/components/internal/DemandBoard';
import { DEMAND_BOARDS } from '@/api/demandBoardsClient';

function Content({user}) {
  const [search,setSearch]=useSearchParams();
  const requested=search.get('board')||'personal';
  const board=Object.hasOwn(DEMAND_BOARDS,requested)?requested:'personal';
  const value=search.get('card');const focusCard=/^[0-9a-f-]{36}$/i.test(value||'')?value:null;
  return <InternalPageLayout user={user} currentPage="InternalDemands" title="Demandas">
    <DemandBoard key={`${user.id}:${board}:${focusCard||''}`} actor={user.id} board={board} focusCard={focusCard} onClearFocus={()=>setSearch({board})} onBoardChange={value=>setSearch({board:value})} />
  </InternalPageLayout>;
}
export default function InternalDemands(){return <ProtectedRoute requireApproved><Content /></ProtectedRoute>;}
