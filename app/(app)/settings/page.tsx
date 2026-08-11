import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";

// Settings 空間（05 §8）。Issue #4 ではスタブ（準備中）。骨格 Issue #6 で実装。
const space = getSpace("settings")!;

export default function SettingsPage() {
  return <SpaceScaffold space={space} />;
}
