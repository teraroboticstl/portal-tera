import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { teamNumber, username, token } = body;

    if (!teamNumber) return Response.json({ error: 'teamNumber required' }, { status: 400 });
    if (!username || !token) return Response.json({ name: null, status: 'no_key' });

    const basicAuth = btoa(`${username}:${token}`);
    const season = new Date().getFullYear();

    const res = await fetch(
      `https://ftc-api.firstinspires.org/v2.0/${season}/teams?teamNumber=${teamNumber}`,
      {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Accept': 'application/json',
        },
      }
    );

    if (res.status === 429) return Response.json({ name: null, status: 'rate_limit' });
    if (res.status === 401 || res.status === 403) return Response.json({ name: null, status: 'auth_error' });
    if (!res.ok) return Response.json({ name: null, status: 'error' });

    const data = await res.json();
    const teams = data.teams || [];
    const team = teams.find(t => String(t.teamNumber) === String(teamNumber));
    const name = team?.nameShort || team?.nameFull || null;

    if (name) return Response.json({ name, status: 'found' });
    return Response.json({ name: null, status: 'not_found' });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});