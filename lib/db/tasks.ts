import { prisma } from "./client";
import { isTaskPriority, isTaskStatus } from "@/lib/domain/task";

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
  originEntryId?: string | null;
}

function assertValidStatus(status: string): void {
  if (!isTaskStatus(status)) {
    throw new TaskValidationError(`invalid status: ${status}`);
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

  return prisma.task.create({
    data: {
      title: params.title,
      note: params.note,
      status,
      dueAt: params.dueAt ?? null,
      priority: params.priority ?? null,
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
}

export async function updateTask(id: string, params: UpdateTaskParams) {
  if (params.status !== undefined) {
    assertValidStatus(params.status);
  }
  if (params.priority !== undefined) {
    assertValidPriority(params.priority);
  }

  return prisma.task.update({
    where: { id },
    data: params,
  });
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
}
