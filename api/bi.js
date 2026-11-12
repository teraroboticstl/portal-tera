import {createClient} from '@supabase/supabase-js';
import {serverSupabaseConfig} from './_lib/supabaseConfig.js';
import {validateUserAuth,createScopedUserSupabaseClient} from './_lib/supabaseServer.js';
import {createBiHandler} from './_lib/teraBi.js';
const {publicConfig}=serverSupabaseConfig(process.env);
// Public reporting always uses anon RLS, even when the visitor is an administrator.
const publicClient=createClient(publicConfig.url,publicConfig.publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
export default createBiHandler({publicClient,scopedClient:createScopedUserSupabaseClient,authenticate:validateUserAuth});
