import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";

// Knowledge 空間（05 §6）。Issue #4 ではスタブ（準備中）。
const space = getSpace("knowledge")!;

export default function KnowledgePage() {
  return <SpaceScaffold space={space} />;
}
