import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { toCsv, type CsvValue } from "@/lib/csv/csv";
import { prisma } from "@/lib/db/client";
import { listAllVisitsForExport } from "@/lib/db/hospital";
import { listAllFinanceRecords } from "@/lib/db/finance";
import { FINANCE_TYPE_LABELS, isFinanceType } from "@/lib/domain/finance";
import { toJstDateString, toJstTimeString, todayJst } from "@/lib/time/jst";

// 各データの CSV 出力。GET /export/<kind>
// URL に拡張子を付けない（proxy.ts の matcher は拡張子付きパスを保護対象外にするため）。
// proxy でも保護されるが、データを返す出口なのでここでも認証を確認する（多層防御）。

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  todo: "未着手",
  doing: "進行中",
  hold: "保留",
  done: "完了",
};

function jstDateTime(date: Date | null): string {
  return date ? `${toJstDateString(date)} ${toJstTimeString(date)}` : "";
}

type Exporter = () => Promise<{
  name: string;
  headers: string[];
  rows: CsvValue[][];
}>;

const EXPORTERS: Record<string, Exporter> = {
  async tasks() {
    const tasks = await prisma.task.findMany({ orderBy: { createdAt: "asc" } });
    return {
      name: "tasks",
      headers: [
        "タイトル",
        "状態",
        "期限",
        "重要度",
        "緊急度",
        "メモ",
        "作成日時",
      ],
      rows: tasks.map((t) => [
        t.title,
        STATUS_LABELS[t.status] ?? t.status,
        jstDateTime(t.dueAt),
        t.importance,
        t.urgency,
        t.note,
        jstDateTime(t.createdAt),
      ]),
    };
  },

  async hospital() {
    const visits = await listAllVisitsForExport();
    return {
      name: "hospital-visits",
      headers: [
        "受診日",
        "病院",
        "診療科",
        "自分の状況",
        "医師とのやりとり",
        "今後の処方",
        "次回予約日",
      ],
      rows: visits.map((v) => [
        v.visitDate,
        v.hospital.name,
        v.hospital.department,
        v.condition,
        v.doctorNotes,
        v.prescription,
        v.nextVisit,
      ]),
    };
  },

  async weight() {
    const records = await prisma.weightRecord.findMany({
      orderBy: { date: "asc" },
    });
    return {
      name: "weight",
      headers: ["日付", "体重(kg)", "体脂肪率(%)", "メモ"],
      rows: records.map((r) => [r.date, r.weightKg, r.bodyFatPct, r.note]),
    };
  },

  async memos() {
    const memos = await prisma.memo.findMany({
      include: { tags: { orderBy: { name: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    return {
      name: "memos",
      headers: ["タイトル", "メモ", "URL", "タグ", "作成日時", "更新日時"],
      rows: memos.map((m) => [
        m.title,
        m.body,
        m.url,
        m.tags.map((t) => t.name).join(" "),
        jstDateTime(m.createdAt),
        jstDateTime(m.updatedAt),
      ]),
    };
  },

  async shopping() {
    const items = await prisma.shoppingItem.findMany({
      orderBy: { createdAt: "asc" },
    });
    return {
      name: "shopping",
      headers: ["品名", "数量", "チェック済み", "追加日時"],
      rows: items.map((i) => [
        i.name,
        i.quantity,
        i.checked ? "済" : "",
        jstDateTime(i.createdAt),
      ]),
    };
  },

  async finance() {
    const records = await listAllFinanceRecords();
    return {
      name: "finance",
      headers: [
        "日付",
        "種別",
        "金額",
        "カテゴリ",
        "内容",
        "支払方法",
        "メモ",
        "入力元",
      ],
      rows: records.map((r) => [
        r.date,
        isFinanceType(r.type) ? FINANCE_TYPE_LABELS[r.type] : r.type,
        r.amount,
        r.category,
        r.description,
        r.paymentMethod,
        r.memo,
        r.source === "ai" ? "AI" : "手入力",
      ]),
    };
  },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const cookieStore = await cookies();
  if (
    !(await verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value))
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { kind } = await params;
  const exporter = Object.hasOwn(EXPORTERS, kind) ? EXPORTERS[kind] : undefined;
  if (!exporter) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { name, headers, rows } = await exporter();
  const filename = `${name}-${todayJst()}.csv`;
  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
