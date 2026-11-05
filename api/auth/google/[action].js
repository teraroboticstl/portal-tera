import { google } from 'googleapis';
import { validateUserAuth } from '../../_lib/supabaseServer.js';
import { googleOAuthStore } from '../../_lib/googleOAuthStore.js';
import { createGoogleOAuthHandler } from '../../_lib/googleOAuthSecurity.js';

// Never expose token responses or provider error objects to the browser or logs.
export default createGoogleOAuthHandler({
  env: process.env,
  validateAuth: validateUserAuth,
  makeOAuth: (id, secret, redirect) => new google.auth.OAuth2(id, secret, redirect),
  store: googleOAuthStore,
});
