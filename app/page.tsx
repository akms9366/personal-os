import { redirect } from "next/navigation";

// ルート `/` は主ナビ先頭の Home（05 §9.1）へ寄せる。
// Home は他 4 空間と同じく /home で addressable にし、経路を一貫させる。
export default function RootPage() {
  redirect("/home");
}
