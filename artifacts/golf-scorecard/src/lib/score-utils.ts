export type GameFormat = "stroke" | "stableford" | "match";

export interface Player {
  name: string;
  handicap: number;
}

export interface HoleInfo {
  number: number;
  par: number;
  strokeIndex: number;
  distanceMen: number;
  distanceLadies: number;
  [k: string]: unknown;
}

export interface HoleScore {
  holeNumber: number;
  scores: (number | null)[];
  shots?: unknown[][];
}

/**
 * Strokes received on a specific hole based on WHS stroke index logic.
 */
export function getStrokesReceived(handicap: number, strokeIndex: number): number {
  const baseStrokes = Math.floor(handicap / 18);
  const remainder = handicap % 18;
  const extraStroke = remainder >= strokeIndex ? 1 : 0;
  return baseStrokes + extraStroke;
}

export function calculateNetScore(grossScore: number | null, handicap: number, strokeIndex: number): number | null {
  if (grossScore === null) return null;
  return grossScore - getStrokesReceived(handicap, strokeIndex);
}

/**
 * Stableford points for a net score vs par.
 * Net = gross - strokes received
 * Points: double bogey or worse = 0, bogey = 1, par = 2, birdie = 3, eagle = 4, albatross = 5
 */
export function stablefordPoints(grossScore: number | null, handicap: number, strokeIndex: number, par: number): number {
  if (grossScore === null) return 0;
  const net = calculateNetScore(grossScore, handicap, strokeIndex)!;
  const diff = par - net; // positive = below par (good)
  return Math.max(0, diff + 2);
}

/**
 * CSS class for a gross score vs par.
 */
export function getScoreClass(score: number | null, par: number): string {
  if (score === null) return "border-transparent bg-muted text-muted-foreground";
  const diff = score - par;
  if (diff <= -2) return "score-eagle";
  if (diff === -1) return "score-birdie";
  if (diff === 0) return "score-par";
  if (diff === 1) return "score-bogey";
  return "score-double";
}

/**
 * CSS class for stableford points.
 */
export function getStablefordClass(points: number): string {
  if (points >= 4) return "score-eagle";
  if (points === 3) return "score-birdie";
  if (points === 2) return "score-par";
  if (points === 1) return "score-bogey";
  return "score-double";
}

export function formatToPar(score: number | null, par: number): string {
  if (score === null) return "-";
  const diff = score - par;
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

/**
 * Stableford total label.
 */
export function formatStableford(points: number): string {
  return `${points} pts`;
}

/**
 * Match play result for a single hole between two players.
 * Returns 1 if player wins, 0 if halved, -1 if player loses.
 */
export function matchPlayResult(
  myGross: number | null,
  theirGross: number | null,
  myHandicap: number,
  theirHandicap: number,
  strokeIndex: number,
): "W" | "H" | "L" | null {
  if (myGross === null || theirGross === null) return null;
  const myNet = calculateNetScore(myGross, myHandicap, strokeIndex)!;
  const theirNet = calculateNetScore(theirGross, theirHandicap, strokeIndex)!;
  if (myNet < theirNet) return "W";
  if (myNet === theirNet) return "H";
  return "L";
}

/**
 * Running match play tally (holes up for player vs opponent).
 * Returns a number: positive = player is up, negative = player is down, 0 = all square.
 */
export function runningMatchScore(
  playerIdx: number,
  opponentIdx: number,
  holeScores: HoleScore[],
  players: Player[],
  holes: HoleInfo[],
): number {
  let tally = 0;
  for (const hs of holeScores) {
    const hole = holes.find(h => h.number === hs.holeNumber);
    if (!hole) continue;
    const result = matchPlayResult(
      hs.scores[playerIdx] ?? null,
      hs.scores[opponentIdx] ?? null,
      players[playerIdx].handicap,
      players[opponentIdx].handicap,
      hole.strokeIndex,
    );
    if (result === "W") tally++;
    else if (result === "L") tally--;
  }
  return tally;
}

export function formatMatchScore(score: number, holesLeft: number): string {
  if (score === 0) return "AS";
  const up = Math.abs(score);
  if (holesLeft === 0) return score > 0 ? `${up} Up` : `${up} Dn`;
  if (up > holesLeft) return score > 0 ? `${up}&${holesLeft}` : `${up}&${holesLeft} Dn`;
  return score > 0 ? `${up} Up` : `${up} Dn`;
}

/**
 * Player totals for Stroke Play.
 */
export function calculatePlayerTotals(
  playerIndex: number,
  player: Player,
  holeScores: HoleScore[],
  holes: HoleInfo[],
) {
  let gross = 0;
  let net = 0;
  let totalParForPlayed = 0;

  holeScores.forEach(hs => {
    const score = hs.scores[playerIndex];
    if (score !== null && score !== undefined && score > 0) {
      const hole = holes.find(h => h.number === hs.holeNumber);
      if (hole) {
        gross += score;
        totalParForPlayed += hole.par;
        net += (score - getStrokesReceived(player.handicap, hole.strokeIndex));
      }
    }
  });

  return {
    gross,
    net,
    toPar: gross > 0 ? gross - totalParForPlayed : 0,
  };
}

/**
 * Total stableford points across all holes.
 */
export function calculateStablefordTotal(
  playerIndex: number,
  player: Player,
  holeScores: HoleScore[],
  holes: HoleInfo[],
): number {
  let total = 0;
  holeScores.forEach(hs => {
    const score = hs.scores[playerIndex];
    if (score !== null && score !== undefined && score > 0) {
      const hole = holes.find(h => h.number === hs.holeNumber);
      if (hole) {
        total += stablefordPoints(score, player.handicap, hole.strokeIndex, hole.par);
      }
    }
  });
  return total;
}

export const FORMAT_LABELS: Record<GameFormat, string> = {
  stroke: "Stroke Play",
  stableford: "Stableford",
  match: "Match Play",
};

// ── World Handicap System (WHS) ──────────────────────────────────────────────
// Shelley Point Golf Club — Men's course rating / slope (18-hole)
export const COURSE_RATING = 70.8;
export const SLOPE_RATING = 126;
export const COURSE_PAR = 72;

/**
 * Adjusted Gross Score: cap each hole at Net Double Bogey (par + 2 + strokes received).
 * Returns null if any hole has no score (round not complete).
 */
export function adjustedGrossScore(
  playerIdx: number,
  player: Player,
  holeScores: HoleScore[],
  holes: HoleInfo[],
): number | null {
  if (holes.length < 18) return null;
  let total = 0;
  for (const hole of holes) {
    const hs = holeScores.find(x => x.holeNumber === hole.number);
    const score = hs?.scores[playerIdx] ?? null;
    if (score === null || score === undefined || score === 0) return null;
    const strokes = getStrokesReceived(player.handicap, hole.strokeIndex);
    const maxScore = hole.par + 2 + strokes; // net double bogey
    total += Math.min(score, maxScore);
  }
  return total;
}

/**
 * WHS Score Differential for a single round.
 * Returns null if the round is incomplete (not all 18 holes scored).
 */
export function calcScoreDifferential(
  playerIdx: number,
  player: Player,
  holeScores: HoleScore[],
  holes: HoleInfo[],
): number | null {
  const adjusted = adjustedGrossScore(playerIdx, player, holeScores, holes);
  if (adjusted === null) return null;
  return parseFloat(((adjusted - COURSE_RATING) * 113 / SLOPE_RATING).toFixed(1));
}

/**
 * WHS Handicap Index from an array of score differentials (most recent first).
 * Uses the official WHS lookup table for how many best differentials to average.
 * Returns null if fewer than 3 complete rounds.
 */
export function calcHandicapIndex(differentials: number[]): number | null {
  const count = differentials.length;
  if (count < 3) return null;

  const sorted = [...differentials].sort((a, b) => a - b);

  // WHS table: [rounds available, best differentials to use]
  const numBest =
    count >= 20 ? 8 :
    count >= 19 ? 7 :
    count >= 17 ? 6 :
    count >= 15 ? 5 :
    count >= 12 ? 4 :
    count >= 9  ? 3 :
    count >= 6  ? 2 : 1;

  const best = sorted.slice(0, numBest);
  const avg = best.reduce((sum, d) => sum + d, 0) / best.length;
  return Math.max(0, parseFloat((avg * 0.96).toFixed(1)));
}

export const FORMAT_DESCRIPTIONS: Record<GameFormat, string> = {
  stroke: "Count every shot. Lowest total gross score wins. Handicap used for net score.",
  stableford: "Points per hole based on net score vs par. More points is better. Bogey=1, Par=2, Birdie=3, Eagle=4.",
  match: "Win holes, not strokes. Head-to-head on net scores. Most holes won wins the match.",
};
