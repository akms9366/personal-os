import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { CsvLink } from "@/components/ui/CsvLink";
import { sectionTitleClass } from "@/components/ui/styles";
import { getSpace } from "@/lib/navigation/spaces";
import { listShoppingItems } from "@/lib/db/shopping";
import { KnowledgeTabs } from "../KnowledgeTabs";
import { ShoppingForm } from "./ShoppingForm";
import { ShoppingList } from "./ShoppingList";

const space = getSpace("knowledge")!;

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const items = await listShoppingItems();

  return (
    <SpaceScaffold space={space}>
      <KnowledgeTabs />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleClass}>買い物メモ</h2>
          <CsvLink kind="shopping" />
        </div>
        <ShoppingForm />
        <ShoppingList
          items={items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            checked: item.checked,
          }))}
        />
      </div>
    </SpaceScaffold>
  );
}
