import { Auth } from '@auth/core';
import GitHub from '@auth/core/providers/github';
import type { AuthConfig } from '@auth/core';
import type { AstroGlobal, APIContext } from 'astro';

export const ADMIN_GITHUB_USERNAME = 'winding-lines';

export async function getSession(astro: AstroGlobal | APIContext) {
  const runtime = (astro.locals as any).runtime;
  const env = runtime?.env || {};

  const config: AuthConfig = {
    basePath: '/api/auth',
    trustHost: true,
    secret: env.AUTH_SECRET || import.meta.env.AUTH_SECRET,
    providers: [
      GitHub({
        clientId: env.GITHUB_CLIENT_ID || import.meta.env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET || import.meta.env.GITHUB_CLIENT_SECRET,
      }),
    ],
    callbacks: {
      async jwt({ token, profile }) {
        // Store GitHub username from profile on initial sign-in
        if (profile) {
          token.username = (profile as any).login;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user && token.sub) {
          session.user.id = token.sub;
          (session.user as any).username = token.username;
        }
        return session;
      },
    },
  };

  // Create a session request
  const url = new URL('/api/auth/session', astro.request.url);
  const sessionRequest = new Request(url, {
    headers: astro.request.headers,
  });

  const response = await Auth(sessionRequest, config);
  const data = await response.json();

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return data;
}
