import { redirect } from "next/navigation";

// Knowledge 空間の入口。Inbox（旧 Quick Capture / Journal の一覧）はメモ機能に統合したため、
// 最初のサブタブであるメモへ送る。
export default function KnowledgePage() {
  redirect("/knowledge/memos");
}
