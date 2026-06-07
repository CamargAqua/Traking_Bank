-- CreateTable
CREATE TABLE "Releve" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "periode" TEXT NOT NULL,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME NOT NULL,
    "soldeDebut" REAL NOT NULL,
    "soldeFin" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "releveId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "libelle" TEXT NOT NULL,
    "libelleRaw" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "categorie" TEXT NOT NULL,
    "confiance" TEXT NOT NULL DEFAULT 'haute',
    "verifie" BOOLEAN NOT NULL DEFAULT false,
    "exclure" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "Transaction_releveId_fkey" FOREIGN KEY ("releveId") REFERENCES "Releve" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegleCategorie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pattern" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Releve_numero_key" ON "Releve"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "RegleCategorie_pattern_key" ON "RegleCategorie"("pattern");
