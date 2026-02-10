// src/utils/publicUser.ts
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../firebase";

export type PublicUserRole = "coach" | "player" | "parent";

export type PublicUserLite = {
  id: string;
  name: string;
  role: PublicUserRole;
};

function safeRole(x: any): PublicUserRole {
  const r = String(x || "").toLowerCase().trim();
  if (r === "coach" || r === "player" || r === "parent") return r;
  return "player";
}

function toName(data: any, role: PublicUserRole) {
  const full = `${data?.firstName ?? ""} ${data?.lastName ?? ""}`.trim();

  let fallback = "User";
  if (role === "coach") fallback = "Coach";
  if (role === "player") fallback = "Player";
  if (role === "parent") fallback = "Parent";

  return full || fallback;
}

export async function fetchCoaches(limitN = 50): Promise<PublicUserLite[]> {
  const refCol = collection(db, "publicUsers");
  const q = query(refCol, where("role", "==", "coach"), limit(limitN));
  const snap = await getDocs(q);

  const list: PublicUserLite[] = snap.docs.map((d) => {
    const data: any = d.data();
    const role: PublicUserRole = "coach";
    return { id: d.id, name: toName(data, role), role };
  });
  try {
  const snap = await getDocs(q);
  console.log("fetchCoaches size:", snap.size);
} catch (e) {
  console.log("fetchCoaches error:", e);
}

  list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return list;
}

export async function fetchPlayersAndParents(limitN = 80): Promise<PublicUserLite[]> {
  const refCol = collection(db, "publicUsers");

  const [playersSnap, parentsSnap] = await Promise.all([
    getDocs(query(refCol, where("role", "==", "player"), limit(limitN))),
    getDocs(query(refCol, where("role", "==", "parent"), limit(limitN))),
  ]);

  const merged: PublicUserLite[] = [...playersSnap.docs, ...parentsSnap.docs].map((d) => {
    const data: any = d.data();
    const role = safeRole(data?.role); // should be player/parent here
    return { id: d.id, name: toName(data, role), role };
  });

  // unique by id
  const map = new Map<string, PublicUserLite>();
  merged.forEach((u) => map.set(u.id, u));

  const list = Array.from(map.values());
  list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return list;
}