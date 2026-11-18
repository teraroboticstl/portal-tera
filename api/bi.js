import {createClient} from '@supabase/supabase-js';
import {serverSupabaseConfig} from './_lib/supabaseConfig.js';
import {supabaseServer,validateUserAuth,createScopedUserSupabaseClient} from './_lib/supabaseServer.js';
import {createBiFilesHandler} from './_lib/biAnalysisFiles.js';
import {createBiTransferHandler} from './_lib/biFileTransfer.js';
import {getGoogleDriveClient,getGoogleDriveTransport,resolveTargetFolder} from './_lib/googleDrive.js';
import {createBiHandler} from './_lib/teraBi.js';
const {publicConfig}=serverSupabaseConfig(process.env);
// Public reporting always uses anon RLS, even when the visitor is an administrator.
const publicClient=createClient(publicConfig.url,publicConfig.publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
// Restrict the privileged adapter to the existing server-only round table.
const roundsClient={from(table){if(table!=='fll_round_simulations')throw Error('SOURCE_DENIED');return supabaseServer.from(table);}};
const dashboard=createBiHandler({publicClient,scopedClient:createScopedUserSupabaseClient,roundsClient,authenticate:validateUserAuth});

const fileDeps={authenticate:validateUserAuth,scopedClient:createScopedUserSupabaseClient,getDrive:getGoogleDriveClient};
const library=createBiFilesHandler(fileDeps);
const transfer=createBiTransferHandler({...fileDeps,getTransport:getGoogleDriveTransport,resolveFolder:resolveTargetFolder,key:()=>process.env.GOOGLE_OAUTH_ENCRYPTION_KEY});
export const config={api:{bodyParser:false}};
export default function handler(req,res){if(req.query?.scope==='analysis')return library(req,res);if(['analysis-upload','analysis-download'].includes(req.query?.scope))return transfer(req,res);return dashboard(req,res);}
