import { Prisma } from "@prisma/client";
import { prisma } from "./client";

// Study（資格試験ドリル）の記録。問題集はコード側（lib/study）にあり、ここは解答の記録だけを扱う。

export interface CreateSessionParams {
  exam: string;
  mode: string;
  categories: string[];
  questionIds: string[];
}

export async function createStudySession(params: CreateSessionParams) {
  return prisma.studySession.create({
    data: {
      exam: params.exam,
      mode: params.mode,
      categories: JSON.stringify(params.categories),
      questionIds: JSON.stringify(params.questionIds),
    },
  });
}

export async function getStudySession(id: string) {
  return prisma.studySession.findUnique({
    where: { id },
    include: { attempts: { orderBy: { answeredAt: "asc" } } },
  });
}

export function parseStringList(json: string): string[] {
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

export interface RecordAttemptParams {
  sessionId: string;
  exam: string;
  questionId: string;
  category: string;
  topic: string;
  stem: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  selectedIndex: number;
  unsure: boolean;
}

/// 解答を記録する。同じドリル・同じ問題への2回目の送信は記録せず、最初の記録を返す（二重送信対策）。
/// 全問に解答し終えたらドリルを完了にする。
export async function recordStudyAttempt(params: RecordAttemptParams) {
  const { choices, ...rest } = params;
  try {
    const attempt = await prisma.studyAttempt.create({
      data: {
        ...rest,
        choices: JSON.stringify(choices),
        isCorrect: params.selectedIndex === params.correctIndex,
      },
    });
    await finishSessionIfComplete(params.sessionId);
    return attempt;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.studyAttempt.findUniqueOrThrow({
        where: {
          sessionId_questionId: {
            sessionId: params.sessionId,
            questionId: params.questionId,
          },
        },
      });
    }
    throw error;
  }
}

async function finishSessionIfComplete(sessionId: string) {
  const session = await prisma.studySession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { attempts: true } } },
  });
  if (
    session &&
    !session.finishedAt &&
    session._count.attempts >= parseStringList(session.questionIds).length
  ) {
    await prisma.studySession.update({
      where: { id: sessionId },
      data: { finishedAt: new Date() },
    });
  }
}

/// 分析用に、試験の全解答を古い順で返す（問題文などの写しは含めない）。
export async function listAttemptsForAnalysis(exam: string) {
  return prisma.studyAttempt.findMany({
    where: { exam },
    orderBy: { answeredAt: "asc" },
    select: {
      questionId: true,
      category: true,
      topic: true,
      isCorrect: true,
      unsure: true,
      answeredAt: true,
    },
  });
}

/// 直近の解答（問題文の写しを含む）。履歴画面・AI アドバイスの材料に使う。
export async function listRecentAttempts(
  exam: string,
  options: { take: number; wrongOnly?: boolean },
) {
  return prisma.studyAttempt.findMany({
    where: {
      exam,
      ...(options.wrongOnly
        ? { OR: [{ isCorrect: false }, { unsure: true }] }
        : {}),
    },
    orderBy: { answeredAt: "desc" },
    take: options.take,
  });
}

export async function listStudySessions(exam: string, take = 30) {
  return prisma.studySession.findMany({
    where: { exam },
    orderBy: { startedAt: "desc" },
    take,
    include: { attempts: { select: { isCorrect: true } } },
  });
}

/// 途中で止めたドリルのうち最新のもの（開始画面の「続きから」）。
export async function findUnfinishedSession(exam: string) {
  return prisma.studySession.findFirst({
    where: { exam, finishedAt: null },
    orderBy: { startedAt: "desc" },
    include: { _count: { select: { attempts: true } } },
  });
}

export async function deleteStudySession(id: string) {
  await prisma.studySession.delete({ where: { id } });
}

export async function listAllAttemptsForExport() {
  return prisma.studyAttempt.findMany({ orderBy: { answeredAt: "asc" } });
}

// ---- AI アドバイス ----

export async function getLatestStudyAdvice(exam: string) {
  return prisma.studyAdvice.findFirst({
    where: { exam },
    orderBy: { createdAt: "desc" },
  });
}

export async function saveStudyAdvice(params: {
  exam: string;
  body: string;
  model: string;
  attemptCount: number;
}) {
  return prisma.studyAdvice.create({ data: params });
}
