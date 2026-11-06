import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/api/supabaseClient';
import { createPageVisibilityClient } from '@/api/pageVisibilityClient';
import { canDisplayPage, canDisplayModality } from './internalPageVisibility';

export const pageVisibilityClient = createPageVisibilityClient(supabase);
export const pageVisibilityQueryKey = actor => ['page-visibility', actor];
export function usePageVisibility() {
  const cache = useQueryClient();
  const previousScope = useRef(null);
  const { user, isAuthenticated } = useAuth();
  const actor = isAuthenticated ? user?.id : null;
  const eligible = Boolean(actor && ((user.status === 'approved' && user.portal_internal !== false) || user.portal_internal === true || user.role === 'admin' || user.member_role === 'admin'));
  const query = useQuery({
    queryKey: pageVisibilityQueryKey(actor), queryFn: () => pageVisibilityClient.read(actor),
    enabled: eligible, staleTime: 0, gcTime: 0, retry: false,
    refetchInterval: 30000, refetchOnWindowFocus: 'always', refetchOnMount: 'always',
  });
  // A failed refresh must not keep granting access from previously cached data.
  const snapshot = !query.isError && eligible ? query.data : null;
  const scope = snapshot ? JSON.stringify([actor,snapshot.all_modalities,snapshot.modalities]) : null;
  useEffect(()=>{
    if (!scope) return;
    const changed = previousScope.current && previousScope.current !== scope;
    previousScope.current = scope;
    if (changed) cache.resetQueries({predicate:q=>q.queryKey[0]!=='page-visibility'});
  },[scope,cache]);
  return { ...query, actor, snapshot, canShow: page => canDisplayPage(page, snapshot, actor), canShowModality: program => canDisplayModality(program,snapshot,actor) };
}
