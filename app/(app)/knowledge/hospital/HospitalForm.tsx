"use client";

import { useActionState, useState } from "react";
import { saveHospitalAction, type HospitalActionState } from "./actions";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";

export interface HospitalFormValues {
  id: string;
  name: string;
  department: string;
  note: string;
}

const initialState: HospitalActionState = {};

export function HospitalForm({
  hospital,
  onDone,
}: {
  hospital?: HospitalFormValues;
  onDone?: () => void;
}) {
  const [formKey, setFormKey] = useState(0);
  // 成功時: 編集なら閉じる（onDone）、新規なら入力欄を空に戻す（form を作り直す）。
  const [state, formAction, pending] = useActionState(
    async (prevState: HospitalActionState, formData: FormData) => {
      const result = await saveHospitalAction(prevState, formData);
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
      {hospital ? (
        <input type="hidden" name="hospitalId" value={hospital.id} />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          病院名
          <input
            name="name"
            required
            defaultValue={hospital?.name}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          診療科（任意）
          <input
            name="department"
            defaultValue={hospital?.department}
            className={inputClass}
          />
        </label>
      </div>
      <label className={labelClass}>
        メモ（任意: 担当医・連絡先・通院の目的など）
        <textarea
          name="note"
          rows={2}
          defaultValue={hospital?.note}
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
          {pending ? "保存中..." : hospital ? "保存" : "病院を追加"}
        </button>
      </div>
    </form>
  );
}
