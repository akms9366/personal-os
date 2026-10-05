import { SubTabs } from "@/components/navigation/SubTabs";

/// Knowledge 空間のサブタブ。記録系の機能はここにまとめる。
export function KnowledgeTabs() {
  return (
    <SubTabs
      tabs={[
        { href: "/knowledge", label: "記録" },
        { href: "/knowledge/memos", label: "メモ" },
        { href: "/knowledge/hospital", label: "病院" },
        { href: "/knowledge/weight", label: "体重" },
        { href: "/knowledge/shopping", label: "買い物" },
      ]}
    />
  );
}
