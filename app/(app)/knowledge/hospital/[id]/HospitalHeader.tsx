"use client";

import { useState, useTransition } from "react";
import { deleteHospitalAction } from "../actions";
import { HospitalForm, type HospitalFormValues } from "../HospitalForm";
import {
  dangerButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";

export function HospitalHeader({
  hospital,
  visitCount,
}: {
  hospital: HospitalFormValues;
  visitCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const message =
      visitCount > 0
        ? `「${hospital.name}」と診察記録 ${visitCount} 件を削除しますか？（元に戻せません。必要なら先にCSV出力してください）`
        : `「${hospital.name}」を削除しますか？`;
    if (!window.confirm(message)) {
      return;
    }
    startTransition(async () => {
      await deleteHospitalAction(hospital.id);
    });
  }

  if (editing) {
    return (
      <HospitalForm hospital={hospital} onDone={() => setEditing(false)} />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {hospital.name}
          {hospital.department ? (
            <span className="ml-2 text-sm font-normal text-zinc-500">
              {hospital.department}
            </span>
          ) : null}
        </h2>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={secondaryButtonClass}
          >
            編集
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className={dangerButtonClass}
          >
            削除
          </button>
        </div>
      </div>
      {hospital.note ? (
        <p className="text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
          {hospital.note}
        </p>
      ) : null}
    </div>
  );
}
