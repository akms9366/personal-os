import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";

// Finance 空間（05 §7）。Issue #4 ではスタブ（準備中）。
const space = getSpace("finance")!;

export default function FinancePage() {
  return <SpaceScaffold space={space} />;
}
