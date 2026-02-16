import type { AppUserProfile } from "../types";

export type NormalizedRole = "player" | "coach" | "parent" | "admin";

export function normalizeRole(value: unknown): NormalizedRole | null {
  const r = String(value || "").trim().toLowerCase();
  if (r === "player" || r === "coach" || r === "parent" || r === "admin") {
    return r;
  }
  return null;
}

export function inferRoleBeforeAdmin(
  profile: AppUserProfile
): "coach" | "player" | null {
  const hasCoachSignals =
    Boolean(profile.coachLevel) ||
    (Array.isArray(profile.coachSpecialisation) &&
      profile.coachSpecialisation.length > 0);
  if (hasCoachSignals) return "coach";

  const hasPlayerSignals =
    Boolean(profile.dob) ||
    Boolean(profile.playerType) ||
    Boolean(profile.playerLevel) ||
    Boolean(profile.battingHand) ||
    Boolean(profile.bowlingHand);
  if (hasPlayerSignals) return "player";

  return null;
}
