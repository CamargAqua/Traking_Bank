import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const bulletins = await prisma.bulletinSalaire.findMany({ orderBy: { periode: 'desc' } })
  return NextResponse.json(bulletins)
}
