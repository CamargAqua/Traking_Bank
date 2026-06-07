export const CATEGORIES = [
  'SALAIRE',
  'PRIME',
  'NOTE_FRAIS',
  'REMBOURSEMENT_COLOC',
  'REMBOURSEMENT_DIVERS',
  'REVENU_EXCEPTIONNEL',
  'LOGEMENT',
  'EPARGNE',
  'REMBOURSEMENT_DETTE',
  'ASSURANCE',
  'ABONNEMENT',
  'RESTOS_BARS',
  'ALIMENTATION',
  'TRANSPORT',
  'VOYAGE_SORTIES',
  'SHOPPING',
  'SANTE',
  'CASH_DAB',
  'VIREMENT_INTERNE',
  'EXCEPTIONNEL',
  'IMPOTS',
  'NON_CATEGORISE',
] as const

export type Categorie = (typeof CATEGORIES)[number]

export const CATEGORIE_LABELS: Record<Categorie, string> = {
  SALAIRE: 'Salaire',
  PRIME: 'Prime',
  NOTE_FRAIS: 'Note de frais',
  REMBOURSEMENT_COLOC: 'Rembt. Coloc',
  REMBOURSEMENT_DIVERS: 'Rembt. Divers',
  REVENU_EXCEPTIONNEL: 'Revenu exceptionnel',
  LOGEMENT: 'Logement',
  EPARGNE: 'Épargne',
  REMBOURSEMENT_DETTE: 'Rembt. Dette',
  ASSURANCE: 'Assurance',
  ABONNEMENT: 'Abonnement',
  RESTOS_BARS: 'Restos / Bars',
  ALIMENTATION: 'Alimentation',
  TRANSPORT: 'Transport',
  VOYAGE_SORTIES: 'Voyage / Sorties',
  SHOPPING: 'Shopping',
  SANTE: 'Santé',
  CASH_DAB: 'Cash DAB',
  VIREMENT_INTERNE: 'Virement interne',
  EXCEPTIONNEL: 'Exceptionnel',
  IMPOTS: 'Impôts',
  NON_CATEGORISE: 'Non catégorisé',
}

export const CATEGORIE_COLORS: Record<Categorie, string> = {
  SALAIRE: '#00b37e',
  PRIME: '#059669',
  NOTE_FRAIS: '#10b981',
  REMBOURSEMENT_COLOC: '#94a3b8',
  REMBOURSEMENT_DIVERS: '#64748b',
  REVENU_EXCEPTIONNEL: '#0ea5e9',
  LOGEMENT: '#4f46e5',
  EPARGNE: '#06b6d4',
  REMBOURSEMENT_DETTE: '#7c3aed',
  ASSURANCE: '#8b5cf6',
  ABONNEMENT: '#a78bfa',
  RESTOS_BARS: '#f59e0b',
  ALIMENTATION: '#16a34a',
  TRANSPORT: '#ec4899',
  VOYAGE_SORTIES: '#0ea5e9',
  SHOPPING: '#f97316',
  SANTE: '#14b8a6',
  CASH_DAB: '#e2e8f0',
  VIREMENT_INTERNE: '#cbd5e1',
  EXCEPTIONNEL: '#f43f5e',
  IMPOTS: '#dc2626',
  NON_CATEGORISE: '#d97706',
}

export const REVENUS: Categorie[] = [
  'SALAIRE', 'PRIME', 'NOTE_FRAIS', 'REMBOURSEMENT_DIVERS', 'REVENU_EXCEPTIONNEL',
]

export const CHARGES_FIXES: Categorie[] = [
  'LOGEMENT', 'EPARGNE', 'REMBOURSEMENT_DETTE', 'ASSURANCE', 'ABONNEMENT',
]

export const EXCLUS: Categorie[] = ['VIREMENT_INTERNE', 'REMBOURSEMENT_COLOC']
