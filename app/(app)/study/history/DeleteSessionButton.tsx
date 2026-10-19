"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteSessionAction } from "../actions";
import { dangerButtonClass } from "@/components/ui/styles";

/// ドリルを解答記録ごと削除する（分析からも外れる）。
export function DeleteSessionButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `${label} のドリルを削除しますか？解答の記録も削除され、分析から外れます。`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteSessionAction(id);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className={dangerButtonClass}
    >
      削除
    </button>
  );
}
