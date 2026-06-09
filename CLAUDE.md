# CLAUDE.md — Tracking_Bank

> À lire intégralement au démarrage de chaque nouvelle session Claude Code.

---

## Projet
Tracker de relevés bancaires personnels — import PDF → parsing IA (Claude) → catégorisation automatique → dashboard de visualisation.

## Stack
- **Framework** : Next.js 16 (App Router), TypeScript strict
- **UI** : React 19, Tailwind CSS v4, Recharts (charts)
- **ORM** : Prisma + SQLite (`DATABASE_URL` en `.env`)
- **IA** : Anthropic SDK (`@anthropic-ai/sdk`) — Claude pour parsing PDF et catégorisation
- **Parsing PDF** : `pdf-parse`

## Lancement
```bash
npm run dev
# Serveur sur http://localhost:3000
```

## Fichiers clés
| Fichier | Rôle |
|---|---|
| `src/lib/parsePdf.ts` | Parse le PDF du relevé → texte brut |
| `src/lib/claude.ts` | Appels Claude API — extraction + catégorisation transactions |
| `src/lib/categories.ts` | Référentiel des catégories + règles |
| `src/lib/db.ts` | Accès Prisma DB |
| `prisma/schema.prisma` | Schéma : Releve, Transaction, RegleCategorie, BulletinSalaire |
| `src/app/import/` | Route import des relevés PDF |
| `src/app/api/` | Routes API |

## Modèles DB (Prisma/SQLite)
- **Releve** — période, solde début/fin, n° relevé
- **Transaction** — libellé, montant, catégorie, confiance (haute/moyenne/basse), verifie, exclure
- **RegleCategorie** — patterns regex → catégorie auto
- **BulletinSalaire** — salaire brut/net + cotisations par période

## Zones à ne pas casser
- `prisma/schema.prisma` — toute migration doit être testée avec `prisma migrate dev` avant commit
- Routes API existantes — vérifier les contrats avant refacto

---

## Mémoire projet

> Décisions et apprentissages accumulés session après session.

- [2026-06-09] — Initialisation : repo cloné depuis `CamargAqua/Traking_Bank`, stack Next.js 16 + Prisma SQLite + Anthropic SDK

---

## Guidelines de codage (Karpathy)

### 1. Think Before Coding
Avant d'implémenter : énoncer les hypothèses explicitement. Si plusieurs interprétations, les présenter. Pousser en arrière si une approche plus simple existe.

### 2. Simplicity First
Minimum de code qui résout le problème. Pas de features spéculatives. Pas d'abstractions pour du code à usage unique.

### 3. Surgical Changes
Toucher uniquement ce qui est nécessaire. Correspondre au style existant. Signaler le code mort sans le supprimer.

### 4. Goal-Driven Execution
Transformer les tâches en objectifs vérifiables. Pour les tâches multi-étapes, énoncer un plan bref avec critères de succès.

---

## Fin de session

> À exécuter avant de fermer Claude Code.

1. Mettre à jour `🧠 Mémoire projet` ci-dessus avec les décisions de la session
2. Cocher les tâches terminées dans `tasks/todo.md`, ajouter les tâches restantes
3. Ajouter les erreurs rencontrées dans `tasks/lessons.md`
4. Compléter `memory/context.md` pour les décisions d'architecture
