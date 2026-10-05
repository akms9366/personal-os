"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteVisitAction } from "../actions";
import { VisitForm, type VisitFormValues } from "./VisitForm";
import {
  dangerButtonClass,
  emptyClass,
  ghostButtonClass,
  metaClass,
} from "@/components/ui/styles";

export interface VisitView extends VisitFormValues {
  id: string;
  visitDateLabel: string;
  nextVisitLabel: string | null;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) {
    return null;
  }
  return (
    <div>
      <dt className={metaClass}>{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-ink">
        {value}
      </dd>
    </div>
  );
}

function VisitItem({
  hospitalId,
  visit,
}: {
  hospitalId: string;
  visit: VisitView;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`${visit.visitDateLabel} の記録を削除しますか？`)) {
      return;
    }
    startTransition(async () => {
      await deleteVisitAction(hospitalId, visit.id);
      router.refresh();
    });
  }

  return (
    <li className="rounded-2xl bg-cream p-5 sm:p-6">
      {editing ? (
        <VisitForm
          hospitalId={hospitalId}
          visit={visit}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-normal tracking-[-0.01em] text-ink">
              {visit.visitDateLabel}
              {visit.nextVisitLabel ? (
                <span className="ml-3 font-mono text-[11px] text-fog">
                  次回 {visit.nextVisitLabel}
                </span>
              ) : null}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={ghostButtonClass}
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
          <dl className="flex flex-col gap-4">
            <Field label="自分の状況" value={visit.condition} />
            <Field label="医師とのやりとり" value={visit.doctorNotes} />
            <Field label="今後の処方" value={visit.prescription} />
          </dl>
        </div>
      )}
    </li>
  );
}

export function VisitList({
  hospitalId,
  visits,
}: {
  hospitalId: string;
  visits: VisitView[];
}) {
  if (visits.length === 0) {
    return <p className={emptyClass}>診察記録はまだありません。</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {visits.map((visit) => (
        <VisitItem key={visit.id} hospitalId={hospitalId} visit={visit} />
      ))}
    </ul>
  );
}
