import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";

// Insights 空間（05 §5）。Issue #4 ではスタブ（準備中）。
const space = getSpace("insights")!;

export default function InsightsPage() {
  return <SpaceScaffold space={space} />;
}
