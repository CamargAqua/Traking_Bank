import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const releve = await prisma.releve.findUnique({
    where: { id },
    include: { transactions: { orderBy: { date: 'desc' } } },
  })
  if (!releve) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(releve)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.releve.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
