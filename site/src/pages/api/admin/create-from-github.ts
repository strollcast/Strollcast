import type { APIRoute } from 'astro';
import { getSession, ADMIN_GITHUB_USERNAME } from '../../../lib/auth';

export const POST: APIRoute = async (context) => {
  // Check authentication
  const session = await getSession(context);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if user is admin
  const username = (session.user as any)?.username;
  if (username !== ADMIN_GITHUB_USERNAME) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get API key from runtime env
  const runtime = (context.locals as any).runtime;
  const env = runtime?.env || {};
  const apiKey = env.STROLLCAST_API_KEY || import.meta.env.STROLLCAST_API_KEY;
  const apiUrl = env.STROLLCAST_API_URL || import.meta.env.STROLLCAST_API_URL || 'https://api.strollcast.com';

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Forward request to worker API
  try {
    const body = await context.request.json();

    const response = await fetch(`${apiUrl}/admin/create-from-github`, {
      method: 'POST',
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
    console.error('Error creating episode from GitHub:', error);
    return new Response(JSON.stringify({ error: 'Failed to create episode' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
