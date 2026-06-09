# Mémoire — Tracking_Bank

> Contexte long terme. Complément au CLAUDE.md pour les infos volumineuses.

## Décisions d'architecture

- **SQLite** choisi (pas PostgreSQL) — usage personnel local, pas de multi-utilisateur
- **App Router Next.js** — routes dans `src/app/`, Server Components par défaut
- **Claude API** utilisé pour deux tâches : (1) parsing du texte PDF → JSON structuré, (2) catégorisation des transactions
- **RegleCategorie** — système d'apprentissage : si Claude catégorise une transaction, la règle est sauvegardée pour les prochains relevés

## Intégrations externes

- **Anthropic API** — clé dans `.env` (`ANTHROPIC_API_KEY`)
- **Prisma** — `DATABASE_URL=file:./dev.db` en local

## Historique des sessions

### 2026-06-09 — Session initiale
- Clone du repo depuis GitHub (`CamargAqua/Traking_Bank`)
- Stack identifiée : Next.js 16, Tailwind v4, Prisma SQLite, Anthropic SDK, pdf-parse, Recharts
- Structure Claude Code initialisée : CLAUDE.md, tasks/, memory/
- État du code : projet en cours de développement, import PDF + catégorisation probablement partielle
