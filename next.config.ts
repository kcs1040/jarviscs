// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },   // ✅ Vercel 빌드에서 ESLint 스킵
  // 타입 오류까지 막고 싶다면 아래 주석 해제(권장하진 않음)
  // typescript: { ignoreBuildErrors: true },
}

export default nextConfig
