"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createHospital,
  createVisit,
  deleteHospital,
  deleteVisit,
  updateHospital,
  updateVisit,
  type HospitalParams,
  type VisitParams,
} from "@/lib/db/hospital";
import { isDateString } from "@/lib/time/jst";

export interface HospitalActionState {
  success?: boolean;
  error?: string;
}

const BASE = "/knowledge/hospital";

function text(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function readHospitalForm(
  formData: FormData,
): HospitalParams | { error: string } {
  const name = text(formData, "name");
  if (!name) {
    return { error: "病院名を入力してください。" };
  }
  return {
    name,
    department: text(formData, "department"),
    note: text(formData, "note"),
  };
}

export async function saveHospitalAction(
  _prevState: HospitalActionState,
  formData: FormData,
): Promise<HospitalActionState> {
  const values = readHospitalForm(formData);
  if ("error" in values) {
    return values;
  }
  const hospitalId = text(formData, "hospitalId");
  if (hospitalId) {
    await updateHospital(hospitalId, values);
    revalidatePath(`${BASE}/${hospitalId}`);
  } else {
    await createHospital(values);
  }
  revalidatePath(BASE);
  return { success: true };
}

export async function deleteHospitalAction(hospitalId: string): Promise<void> {
  await deleteHospital(hospitalId);
  revalidatePath(BASE);
  redirect(BASE);
}

function readVisitForm(formData: FormData): VisitParams | { error: string } {
  const visitDate = text(formData, "visitDate");
  if (!visitDate || !isDateString(visitDate)) {
    return { error: "受診日を入力してください。" };
  }
  const nextVisit = text(formData, "nextVisit");
  if (nextVisit && !isDateString(nextVisit)) {
    return { error: "次回予約日が正しくありません。" };
  }
  const values = {
    visitDate,
    condition: text(formData, "condition"),
    doctorNotes: text(formData, "doctorNotes"),
    prescription: text(formData, "prescription"),
    nextVisit,
  };
  if (!values.condition && !values.doctorNotes && !values.prescription) {
    return { error: "いずれかの記録欄を入力してください。" };
  }
  return values;
}

export async function saveVisitAction(
  _prevState: HospitalActionState,
  formData: FormData,
): Promise<HospitalActionState> {
  const hospitalId = text(formData, "hospitalId");
  if (!hospitalId) {
    return { error: "病院が指定されていません。" };
  }
  const values = readVisitForm(formData);
  if ("error" in values) {
    return values;
  }
  const visitId = text(formData, "visitId");
  if (visitId) {
    await updateVisit(visitId, values);
  } else {
    await createVisit(hospitalId, values);
  }
  revalidatePath(`${BASE}/${hospitalId}`);
  revalidatePath(BASE);
  return { success: true };
}

export async function deleteVisitAction(
  hospitalId: string,
  visitId: string,
): Promise<void> {
  await deleteVisit(visitId);
  revalidatePath(`${BASE}/${hospitalId}`);
  revalidatePath(BASE);
}
