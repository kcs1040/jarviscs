// app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs'  // v5에서 Node 런타임 강제 (호환성 ↑)

import { handlers } from '../../../../lib/auth'  // ⬅ 상대경로 주의!

export const GET = handlers.GET
export const POST = handlers.POST
