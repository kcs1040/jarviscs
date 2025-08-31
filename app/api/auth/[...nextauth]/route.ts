// app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs'
import { handlers } from '@/lib/auth'
export const GET = handlers.GET
export const POST = handlers.POST
