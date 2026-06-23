-- CreateTable
CREATE TABLE "BudgetCategorie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categorie" TEXT NOT NULL,
    "montantCible" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCategorie_categorie_key" ON "BudgetCategorie"("categorie");
