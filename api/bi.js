import {createClient} from '@supabase/supabase-js';
import {serverSupabaseConfig} from './_lib/supabaseConfig.js';
import {supabaseServer,validateUserAuth,createScopedUserSupabaseClient} from './_lib/supabaseServer.js';
import {createBiHandler} from './_lib/teraBi.js';
const {publicConfig}=serverSupabaseConfig(process.env);
// Public reporting always uses anon RLS, even when the visitor is an administrator.
const publicClient=createClient(publicConfig.url,publicConfig.publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
// Restrict the privileged adapter to the existing server-only round table.
const roundsClient={from(table){if(table!=='fll_round_simulations')throw Error('SOURCE_DENIED');return supabaseServer.from(table);}};
export default createBiHandler({publicClient,scopedClient:createScopedUserSupabaseClient,roundsClient,authenticate:validateUserAuth});
