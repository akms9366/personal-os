"use client";

import { useActionState, useState } from "react";
import { saveVisitAction, type HospitalActionState } from "../actions";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";

export interface VisitFormValues {
  id?: string;
  visitDate: string;
  condition: string;
  doctorNotes: string;
  prescription: string;
  nextVisit: string;
}

const initialState: HospitalActionState = {};

/// 診察記録フォーム。「自分の状況」「医師とのやりとり」「今後の処方」を分けて残す。
export function VisitForm({
  hospitalId,
  visit,
  onDone,
}: {
  hospitalId: string;
  visit: VisitFormValues;
  onDone?: () => void;
}) {
  const [formKey, setFormKey] = useState(0);
  // 成功時: 編集なら閉じる（onDone）、新規なら入力欄を空に戻す（form を作り直す）。
  const [state, formAction, pending] = useActionState(
    async (prevState: HospitalActionState, formData: FormData) => {
      const result = await saveVisitAction(prevState, formData);
      if (result.success) {
        if (onDone) {
          onDone();
        } else {
          setFormKey((key) => key + 1);
        }
      }
      return result;
    },
    initialState,
  );

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="hospitalId" value={hospitalId} />
      {visit.id ? (
        <input type="hidden" name="visitId" value={visit.id} />
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          受診日
          <input
            name="visitDate"
            type="date"
            required
            defaultValue={visit.visitDate}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          次回予約日（任意）
          <input
            name="nextVisit"
            type="date"
            defaultValue={visit.nextVisit}
            className={inputClass}
          />
        </label>
      </div>
      <label className={labelClass}>
        自分の状況（症状・体調・困っていること）
        <textarea
          name="condition"
          rows={3}
          defaultValue={visit.condition}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        医師とのやりとり（診断・説明・質問したこと）
        <textarea
          name="doctorNotes"
          rows={3}
          defaultValue={visit.doctorNotes}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        今後の処方（薬・用量・期間・検査予定など）
        <textarea
          name="prescription"
          rows={3}
          defaultValue={visit.prescription}
          className={inputClass}
        />
      </label>
      <div className="flex items-center justify-end gap-2">
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className={secondaryButtonClass}
          >
            キャンセル
          </button>
        ) : null}
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "保存中..." : visit.id ? "保存" : "記録を追加"}
        </button>
      </div>
    </form>
  );
}
