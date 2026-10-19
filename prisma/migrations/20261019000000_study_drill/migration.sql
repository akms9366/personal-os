-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "categories" TEXT NOT NULL DEFAULT '[]',
    "questionIds" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "StudyAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "exam" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "stem" TEXT NOT NULL,
    "choices" TEXT NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "selectedIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "unsure" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyAdvice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "StudySession_exam_startedAt_idx" ON "StudySession"("exam", "startedAt");

-- CreateIndex
CREATE INDEX "StudyAttempt_exam_answeredAt_idx" ON "StudyAttempt"("exam", "answeredAt");

-- CreateIndex
CREATE INDEX "StudyAttempt_exam_questionId_idx" ON "StudyAttempt"("exam", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyAttempt_sessionId_questionId_key" ON "StudyAttempt"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "StudyAdvice_exam_createdAt_idx" ON "StudyAdvice"("exam", "createdAt");

