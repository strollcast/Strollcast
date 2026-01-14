import type { APIRoute } from 'astro';
import { getSession, ADMIN_GITHUB_USERNAME } from '../../../../lib/auth';

export const PATCH: APIRoute = async (context) => {
  const session = await getSession(context);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const username = (session.user as any)?.username;
  if (username !== ADMIN_GITHUB_USERNAME) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const runtime = (context.locals as any).runtime;
  const env = runtime?.env || {};
  const apiKey = env.STROLLCAST_API_KEY || import.meta.env.STROLLCAST_API_KEY;
  const apiUrl = env.STROLLCAST_API_URL || import.meta.env.STROLLCAST_API_URL || 'https://api.strollcast.com';

  const userId = context.params.id;

  try {
    const body = await context.request.json();

    const response = await fetch(`${apiUrl}/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return new Response(JSON.stringify({ error: 'Failed to update user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
