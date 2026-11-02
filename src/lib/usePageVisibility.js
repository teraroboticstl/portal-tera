import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { supabase } from '@/api/supabaseClient';
import { createPageVisibilityClient } from '@/api/pageVisibilityClient';
import { canDisplayPage } from './internalPageVisibility';

export const pageVisibilityClient = createPageVisibilityClient(supabase);
export const pageVisibilityQueryKey = actor => ['page-visibility', actor];
export function usePageVisibility() {
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
  return { ...query, actor, snapshot, canShow: page => canDisplayPage(page, snapshot, actor) };
}
