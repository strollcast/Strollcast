import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';

export const GET: APIRoute = async (context) => {
  // Check authentication
  const session = await getSession(context);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get API config from runtime env
  const runtime = (context.locals as any).runtime;
  const env = runtime?.env || {};
  const apiUrl = env.STROLLCAST_API_URL || import.meta.env.STROLLCAST_API_URL || 'https://api.strollcast.com';

  const userId = session.user?.id || session.user?.email;

  try {
    // Fetch jobs for this user from Worker API
    const response = await fetch(`${apiUrl}/jobs?submitted_by=${encodeURIComponent(userId || '')}`);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch jobs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
