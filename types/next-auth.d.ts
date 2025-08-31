// types/next-auth.d.ts
import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    hasGoogle?: boolean
    access_token?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token?: string
    refresh_token?: string
    expires_at?: number
    error?: "RefreshAccessTokenError"
  }
}

export {} // ✅ 중요: 이 파일을 모듈로 인식하게 함
