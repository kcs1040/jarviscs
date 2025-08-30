// lib/auth.ts
import NextAuth, { type NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

async function refreshAccessToken(token: any) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token as string,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(JSON.stringify(data))
    return {
      ...token,
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      refresh_token: token.refresh_token,
    }
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' as const }
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === 'google') {
        const expiresAt =
          typeof (account as any).expires_at === 'number'
            ? (account as any).expires_at
            : Math.floor(Date.now() / 1000) + 3600
        return {
          ...token,
          access_token: (account as any).access_token,
          expires_at: expiresAt,
          refresh_token: (account as any).refresh_token ?? (token as any).refresh_token,
        }
      }
      if (token.expires_at && Date.now() / 1000 < (token.expires_at as number) - 60) return token
      if ((token as any).refresh_token) return await refreshAccessToken(token)
      return token
    },
    async session({ session, token }) {
      ;(session as any).hasGoogle = Boolean((token as any).access_token || (token as any).refresh_token)
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
