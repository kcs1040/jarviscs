// lib/auth.ts
import "@/types/next-auth"   // ✅ 타입 보강을 컴파일에 확실히 포함
import NextAuth, { type NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import type { JWT } from "next-auth/jwt"

/** 우리 앱에서 사용할 JWT 확장 타입 */
type AppJWT = JWT & {
  access_token?: string
  refresh_token?: string
  /** 초 단위(Epoch seconds) */
  expires_at?: number
  error?: "RefreshAccessTokenError"
}

/** Google 액세스 토큰 갱신 */
async function refreshAccessToken(token: AppJWT): Promise<AppJWT> {
  try {
    if (!token.refresh_token) return token

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    })

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    })

    const data: {
      access_token?: string
      expires_in?: number
      refresh_token?: string
      error?: unknown
    } = await res.json()

    if (!res.ok || !data.access_token) {
      throw new Error(
        typeof data.error === "string" ? data.error : JSON.stringify(data)
      )
    }

    return {
      ...token,
      access_token: data.access_token,
      // 구글은 expires_in(초)을 주므로 현재 시각 기준 만료시각 계산
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      // 보통 refresh_token은 최초 로그인시에만 오므로 기존 값 유지
      refresh_token: token.refresh_token,
    }
  } catch {
    return { ...token, error: "RefreshAccessTokenError" }
  }
}

export const authConfig: NextAuthConfig = {
  // Vercel 프록시 뒤에서도 호스트 자동 인식
  trustHost: true,
  // 문제 발생 시 함수 로그에 자세한 정보
  debug: true,
  // v5 권장: AUTH_SECRET, 없으면 NEXTAUTH_SECRET 사용
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // 캘린더 읽기 권한 포함
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          // refresh_token 발급 유도
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
        },
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    /** 로그인 직후/요청마다 JWT 갱신 */
    async jwt({ token, account }): Promise<AppJWT> {
      // 최초 로그인 직후: account가 존재
      if (account?.provider === "google") {
        const acc = account as unknown as {
          access_token?: string
          refresh_token?: string
          expires_at?: number
          expires_in?: number
        }

        const expiresAtSec =
          typeof acc.expires_at === "number"
            ? acc.expires_at
            : Math.floor(Date.now() / 1000) + (acc.expires_in ?? 3600)

        return {
          ...token,
          access_token: acc.access_token,
          refresh_token: acc.refresh_token ?? (token as AppJWT).refresh_token,
          expires_at: expiresAtSec,
        }
      }

      const t = token as AppJWT
      // 액세스 토큰이 아직 유효하면 그대로 사용
      if (t.expires_at && Date.now() / 1000 < t.expires_at - 60) {
        return t
      }
      // 만료되었고 refresh_token이 있으면 갱신
      if (t.refresh_token) {
        return await refreshAccessToken(t)
      }
      // 갱신 수단이 없으면 그대로 반환
      return t
    },

    /** 클라이언트로 전달할 세션 조정 */
    async session({ session, token }) {
      const t = token as AppJWT
      // 타입 보강 덕분에 안전하게 할당 가능
      session.hasGoogle = Boolean(t.access_token || t.refresh_token)

      // (선택) 클라이언트에서 액세스 토큰도 써야 한다면 아래 줄 유지
      session.access_token = t.access_token

      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
