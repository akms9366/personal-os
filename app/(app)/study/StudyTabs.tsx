import { SubTabs } from "@/components/navigation/SubTabs";

/// Study 空間のサブタブ。
export function StudyTabs() {
  return (
    <SubTabs
      tabs={[
        { href: "/study", label: "ドリル" },
        { href: "/study/analysis", label: "分析" },
        { href: "/study/history", label: "履歴" },
      ]}
    />
  );
}
