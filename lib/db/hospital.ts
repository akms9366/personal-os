import { prisma } from "./client";

// 病院（Hospital）と診察記録（HospitalVisit）。日付は JST 暦日 "YYYY-MM-DD" 文字列。

export interface HospitalParams {
  name: string;
  department: string | null;
  note: string | null;
}

export interface VisitParams {
  visitDate: string;
  condition: string | null;
  doctorNotes: string | null;
  prescription: string | null;
  nextVisit: string | null;
}

export async function listHospitals() {
  const hospitals = await prisma.hospital.findMany({
    include: {
      _count: { select: { visits: true } },
      visits: { orderBy: { visitDate: "desc" }, take: 1 },
    },
  });
  // 直近の受診が新しい病院から並べる（受診記録のない病院は登録順で末尾）。
  return hospitals.sort((a, b) => {
    const aDate = a.visits[0]?.visitDate ?? "";
    const bDate = b.visits[0]?.visitDate ?? "";
    return (
      bDate.localeCompare(aDate) ||
      a.createdAt.getTime() - b.createdAt.getTime()
    );
  });
}

export async function getHospitalWithVisits(id: string) {
  return prisma.hospital.findUnique({
    where: { id },
    include: {
      visits: { orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }] },
    },
  });
}

export async function createHospital(params: HospitalParams) {
  return prisma.hospital.create({ data: params });
}

export async function updateHospital(id: string, params: HospitalParams) {
  return prisma.hospital.update({ where: { id }, data: params });
}

/// 病院を削除する（その病院の診察記録もすべて削除される）。
export async function deleteHospital(id: string) {
  await prisma.hospital.delete({ where: { id } });
}

export async function createVisit(hospitalId: string, params: VisitParams) {
  return prisma.hospitalVisit.create({ data: { hospitalId, ...params } });
}

export async function updateVisit(id: string, params: VisitParams) {
  return prisma.hospitalVisit.update({ where: { id }, data: params });
}

export async function deleteVisit(id: string) {
  await prisma.hospitalVisit.delete({ where: { id } });
}

export async function listAllVisitsForExport() {
  return prisma.hospitalVisit.findMany({
    include: { hospital: true },
    orderBy: [{ visitDate: "asc" }, { createdAt: "asc" }],
  });
}
