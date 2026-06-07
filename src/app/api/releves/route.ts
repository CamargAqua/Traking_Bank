import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const releves = await prisma.releve.findMany({
    orderBy: { dateDebut: 'desc' },
    include: { _count: { select: { transactions: true } } },
  })
  return NextResponse.json(releves)
}
