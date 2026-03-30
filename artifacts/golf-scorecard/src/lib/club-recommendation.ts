export type Club =
  | "Driver" | "3-Wood" | "5-Wood" | "Hybrid"
  | "2-Iron" | "3-Iron" | "4-Iron" | "5-Iron"
  | "6-Iron" | "7-Iron" | "8-Iron" | "9-Iron"
  | "PW" | "GW" | "SW" | "LW" | "Putter";

export const ALL_CLUBS: Club[] = [
  "Driver", "3-Wood", "5-Wood", "Hybrid",
  "2-Iron", "3-Iron", "4-Iron", "5-Iron",
  "6-Iron", "7-Iron", "8-Iron", "9-Iron",
  "PW", "GW", "SW", "LW", "Putter",
];

// Base distances for an 18-handicap (mid) player in metres
const BASE_DISTANCES: Record<Club, number> = {
  "Driver":  185,
  "3-Wood":  165,
  "5-Wood":  150,
  "Hybrid":  140,
  "2-Iron":  135,
  "3-Iron":  125,
  "4-Iron":  115,
  "5-Iron":  105,
  "6-Iron":   95,
  "7-Iron":   85,
  "8-Iron":   75,
  "9-Iron":   65,
  "PW":       55,
  "GW":       45,
  "SW":       35,
  "LW":       25,
  "Putter":    5,
};

// Adjust for handicap: scratch hits ~30% further than 36-handicap
function getDistanceFactor(handicap: number): number {
  // 0 hcp = 1.20, 18 hcp = 1.00, 36 hcp = 0.82
  return 1.0 + ((18 - Math.min(54, Math.max(0, handicap))) / 18) * 0.20;
}

export function getClubDistance(club: Club, handicap: number): number {
  return Math.round(BASE_DISTANCES[club] * getDistanceFactor(handicap));
}

export interface ClubRecommendation {
  primary: Club;
  secondary: Club | null;
  reason: string;
}

export function recommendClub(distanceToPin: number, handicap: number): ClubRecommendation {
  if (distanceToPin <= 5) {
    return { primary: "Putter", secondary: null, reason: "On or just off the green" };
  }
  if (distanceToPin <= 20) {
    return { primary: "LW", secondary: "SW", reason: "Short chip/pitch around the green" };
  }

  const factor = getDistanceFactor(handicap);

  let closest: Club = "Driver";
  let closestDiff = Infinity;
  let secondClosest: Club | null = null;
  let secondDiff = Infinity;

  for (const club of ALL_CLUBS) {
    if (club === "Putter") continue;
    const d = BASE_DISTANCES[club] * factor;
    const diff = Math.abs(d - distanceToPin);
    if (diff < closestDiff) {
      secondClosest = closest;
      secondDiff = closestDiff;
      closest = club;
      closestDiff = diff;
    } else if (diff < secondDiff) {
      secondClosest = club;
      secondDiff = diff;
    }
  }

  const clubDist = Math.round(BASE_DISTANCES[closest] * factor);
  let reason = `~${clubDist}m for HCP ${handicap}`;
  if (distanceToPin > 200) reason = `Long shot — ${reason}`;
  else if (distanceToPin < 50) reason = `Short game — ${reason}`;

  return {
    primary: closest,
    secondary: secondClosest,
    reason,
  };
}
