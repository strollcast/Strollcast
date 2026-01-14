import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';

export const GET: APIRoute = async (context) => {
  const session = await getSession(context);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const runtime = (context.locals as any).runtime;
  const env = runtime?.env || {};
  const apiKey = env.STROLLCAST_API_KEY || import.meta.env.STROLLCAST_API_KEY;
  const apiUrl = env.STROLLCAST_API_URL || import.meta.env.STROLLCAST_API_URL || 'https://api.strollcast.com';

  const userId = session.user?.id;
  const username = (session.user as any)?.username;

  try {
    const response = await fetch(`${apiUrl}/users/me/quota`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-User-Id': userId || '',
        'X-User-Name': username || '',
      },
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching quota:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch quota' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
