import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CATEGORIES } from '@/lib/categories'

// PATCH : définit/met à jour le budget cible d'une catégorie
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { categorie, montantCible } = body as { categorie?: string; montantCible?: number }

  if (!categorie || !CATEGORIES.includes(categorie as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })
  }
  if (typeof montantCible !== 'number' || montantCible < 0 || !Number.isFinite(montantCible)) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  }

  const budget = await prisma.budgetCategorie.upsert({
    where: { categorie },
    update: { montantCible },
    create: { categorie, montantCible },
  })

  return NextResponse.json(budget)
}
