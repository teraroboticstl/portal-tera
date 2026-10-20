import { supabase } from './supabaseClient.js';
import { createUltronReadOnlySearch } from './ultronReadOnlyClient.js';

// Independent of operational CRUD: opening ULTRON does not load rosters or forms.
export const searchUltronReadOnly = createUltronReadOnlySearch(supabase);
