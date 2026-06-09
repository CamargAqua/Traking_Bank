import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      categorie: body.categorie,
      verifie: true,
      notes: body.notes,
      ...(body.exclure !== undefined ? { exclure: body.exclure } : {}),
    },
  })

  // Mémoriser la règle si demandé
  if (body.memoriser && body.pattern) {
    await prisma.regleCategorie.upsert({
      where: { pattern: body.pattern.toLowerCase() },
      update: { categorie: body.categorie },
      create: { pattern: body.pattern.toLowerCase(), categorie: body.categorie },
    })
  }

  return NextResponse.json(updated)
}
