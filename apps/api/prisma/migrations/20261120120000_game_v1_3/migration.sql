-- Migración v1.3 (Fase 2): reintento con pista, estrellas, orden de opciones y premios idempotentes.
-- Todo es aditivo: no se borra ni se renombra nada.

-- AlterTable
-- "order" se crea NULL, se rellena con la posición actual (por pregunta, en orden de id =
-- orden en que el seed las creó) y recién entonces pasa a NOT NULL: los datos se conservan.
ALTER TABLE "AnswerOption" ADD COLUMN     "order" INTEGER;

UPDATE "AnswerOption" a
SET "order" = r.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "questionId" ORDER BY id) AS rn
    FROM "AnswerOption"
) r
WHERE a.id = r.id;

ALTER TABLE "AnswerOption" ALTER COLUMN "order" SET NOT NULL;

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "stars" INTEGER;

-- AlterTable
ALTER TABLE "AttemptAnswer" ADD COLUMN     "tryNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "SubmoduleProgress" ADD COLUMN     "bestStars" INTEGER;

-- CreateTable
CREATE TABLE "RewardGrant" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RewardGrant_studentId_key_key" ON "RewardGrant"("studentId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerOption_questionId_order_key" ON "AnswerOption"("questionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptAnswer_attemptId_questionId_tryNumber_key" ON "AttemptAnswer"("attemptId", "questionId", "tryNumber");

-- AddForeignKey
ALTER TABLE "RewardGrant" ADD CONSTRAINT "RewardGrant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

