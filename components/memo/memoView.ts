import { composeMemoText } from "@/lib/domain/memo";
import { formatDateTimeLabel, formatRelativeJst } from "@/lib/time/jst";
import type { MemoPostView } from "./MemoTimeline";

/// 作成から1分以上あとに更新されたものを「編集済み」とする（保存時の誤差を除く）。
const EDITED_THRESHOLD_MS = 60 * 1000;

interface MemoRecord {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: { name: string }[];
}

/// DB の Memo → タイムライン表示用の値（メモページと Home で共通）。
export function toMemoPostView(memo: MemoRecord, now: Date): MemoPostView {
  return {
    id: memo.id,
    text: composeMemoText(memo),
    tags: memo.tags.map((tag) => tag.name),
    timeLabel: formatRelativeJst(memo.createdAt, now),
    timeTitle: formatDateTimeLabel(memo.createdAt),
    edited:
      memo.updatedAt.getTime() - memo.createdAt.getTime() > EDITED_THRESHOLD_MS,
  };
}
