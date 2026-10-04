import { prisma } from "./client";
import { isTaskLevel, isTaskPriority, isTaskStatus } from "@/lib/domain/task";

// Task CRUD の唯一の入口。Entry と異なり不変ではないため、通常の作成・取得・更新・削除を提供する
// （lib/db/entries.ts のガード経由書込み規約と同様、Prisma を直接叩かずここを経由する）。

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskValidationError";
  }
}

export interface CreateTaskParams {
  title: string;
  note?: string;
  status?: string;
  dueAt?: Date | null;
  priority?: string | null;
  importance?: number | null;
  urgency?: number | null;
  originEntryId?: string | null;
}

function assertValidStatus(status: string): void {
  if (!isTaskStatus(status)) {
    throw new TaskValidationError(`invalid status: ${status}`);
  }
}

function assertValidLevel(
  name: string,
  value: number | null | undefined,
): void {
  if (value != null && !isTaskLevel(value)) {
    throw new TaskValidationError(`invalid ${name}: ${value}`);
  }
}

function assertValidPriority(priority: string | null | undefined): void {
  if (priority != null && !isTaskPriority(priority)) {
    throw new TaskValidationError(`invalid priority: ${priority}`);
  }
}

export async function createTask(params: CreateTaskParams) {
  const status = params.status ?? "todo";
  assertValidStatus(status);
  assertValidPriority(params.priority);
  assertValidLevel("importance", params.importance);
  assertValidLevel("urgency", params.urgency);

  return prisma.task.create({
    data: {
      title: params.title,
      note: params.note,
      status,
      dueAt: params.dueAt ?? null,
      priority: params.priority ?? null,
      importance: params.importance ?? null,
      urgency: params.urgency ?? null,
      originEntryId: params.originEntryId ?? null,
    },
  });
}

export async function getTask(id: string) {
  return prisma.task.findUnique({ where: { id } });
}

export async function listTasks() {
  return prisma.task.findMany({ orderBy: { createdAt: "desc" } });
}

export interface UpdateTaskParams {
  title?: string;
  note?: string | null;
  status?: string;
  dueAt?: Date | null;
  priority?: string | null;
  importance?: number | null;
  urgency?: number | null;
}

export async function updateTask(id: string, params: UpdateTaskParams) {
  if (params.status !== undefined) {
    assertValidStatus(params.status);
  }
  if (params.priority !== undefined) {
    assertValidPriority(params.priority);
  }
  assertValidLevel("importance", params.importance);
  assertValidLevel("urgency", params.urgency);

  return prisma.task.update({
    where: { id },
    data: params,
  });
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
}

const TITLE_MAX_LENGTH = 80;

/// Entry の本文からタスクの短いタイトルを作る（先頭行、長ければ省略）。
function deriveTitleFromBody(body: string): string {
  const firstLine = body.split("\n")[0].trim();
  const source = firstLine.length > 0 ? firstLine : body.trim();
  if (source.length <= TITLE_MAX_LENGTH) {
    return source;
  }
  return `${source.slice(0, TITLE_MAX_LENGTH - 1)}…`;
}

/// Quick Capture 由来の Entry からタスクを起票する（Issue #12「Capture→Task化」）。
/// 利用者の明示操作でのみ呼ばれる（AI が代行しない、`11 §6`）。
/// 原情報 Entry は一切変更・削除しない。Task.originEntryId が来歴を保持する。
export async function convertEntryToTask(entryId: string) {
  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry) {
    throw new Error(`entry not found: ${entryId}`);
  }

  return createTask({
    title: deriveTitleFromBody(entry.body),
    note: entry.body,
    originEntryId: entry.id,
  });
}
