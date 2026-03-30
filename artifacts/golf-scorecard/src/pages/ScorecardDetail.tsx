import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Edit3, Calendar, TrendingDown, TrendingUp, Minus, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useScorecard, useCourseHoles, useScorecards, useStoredHandicaps } from "@/hooks/use-golf";
import {
  calculatePlayerTotals,
  calculateStablefordTotal,
  runningMatchScore,
  formatMatchScore,
  getScoreClass,
  FORMAT_LABELS,
  calcScoreDifferential,
  calcHandicapIndex,
} from "@/lib/score-utils";
import type { GameFormat } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export default function ScorecardDetail() {
  const [, params] = useRoute("/scorecard/:id");
  const id = parseInt(params?.id || "0");
  
  const { data: scorecard, isLoading: loadingCard } = useScorecard(id);
  const { data: holes, isLoading: loadingHoles } = useCourseHoles();
  const { data: allScorecards } = useScorecards();
  const { saveAll } = useStoredHandicaps();
  const [handicapsSaved, setHandicapsSaved] = useState(false);

  if (loadingCard || loadingHoles) {
    return <div className="min-h-screen bg-background flex items-center justify-center font-display font-bold text-xl text-primary animate-pulse">Loading Scorecard...</div>;
  }

  if (!scorecard || !holes) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Scorecard not found</div>;
  }

  const outHoles = holes.slice(0, 9);
  const inHoles = holes.slice(9, 18);
  
  const outPar = outHoles.reduce((acc, h) => acc + h.par, 0);
  const inPar = inHoles.reduce((acc, h) => acc + h.par, 0);

  const gameFormat = (scorecard.gameFormat as GameFormat) ?? "stroke";

  // ── WHS Handicap calculation ──────────────────────────────────────────────
  // Gather score differentials for each player across ALL completed rounds
  const newHandicaps: { name: string; current: number; suggested: number | null; rounds: number }[] = 
    scorecard.players.map((player, pIdx) => {
      const differentials: number[] = [];
      const allRounds = allScorecards ?? [];
      // Include all rounds (newest first) where this player appears by name
      const playerRounds = [...allRounds]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20); // last 20 as per WHS

      for (const round of playerRounds) {
        const pInRound = round.players.findIndex(
          (p) => p.name.trim().toLowerCase() === player.name.trim().toLowerCase()
        );
        if (pInRound === -1) continue;
        const pObj = round.players[pInRound];
        const diff = calcScoreDifferential(pInRound, pObj, round.holeScores, holes);
        if (diff !== null) differentials.push(diff);
      }

      const suggested = calcHandicapIndex(differentials);
      return { name: player.name, current: player.handicap, suggested, rounds: differentials.length };
    });

  const handleSaveHandicaps = () => {
    const updates = newHandicaps
      .filter(h => h.suggested !== null)
      .map(h => ({ name: h.name, handicap: h.suggested! }));
    if (updates.length > 0) {
      saveAll(updates);
      setHandicapsSaved(true);
    }
  };

  // Helper to render half a round (Out or In)
  const renderHalf = (halfHoles: typeof holes, isOut: boolean) => (
    <div className="overflow-x-auto pb-4 custom-scrollbar">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full divide-y divide-border border border-border bg-white rounded-xl overflow-hidden shadow-sm text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left font-bold text-muted-foreground w-32 sticky left-0 bg-muted z-10 border-r border-border">Hole</th>
              {halfHoles.map(h => (
                <th key={h.number} className="px-2 py-2 text-center font-display font-bold text-foreground w-10">{h.number}</th>
              ))}
              <th className="px-2 py-2 text-center font-bold text-foreground bg-primary/5 w-12">{isOut ? 'OUT' : 'IN'}</th>
            </tr>
            <tr className="bg-white border-b border-border">
              <td className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground sticky left-0 bg-white z-10 border-r border-border">Par</td>
              {halfHoles.map(h => (
                <td key={`par-${h.number}`} className="px-2 py-1.5 text-center font-semibold text-foreground bg-white">{h.par}</td>
              ))}
              <td className="px-2 py-1.5 text-center font-bold text-foreground bg-primary/5">{isOut ? outPar : inPar}</td>
            </tr>
            <tr className="bg-white border-b border-border">
              <td className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground sticky left-0 bg-white z-10 border-r border-border">Index</td>
              {halfHoles.map(h => (
                <td key={`idx-${h.number}`} className="px-2 py-1.5 text-center text-xs text-muted-foreground">{h.strokeIndex}</td>
              ))}
              <td className="px-2 py-1.5 text-center font-bold text-foreground bg-primary/5">-</td>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {scorecard.players.map((player, pIdx) => {
              let halfTotal = 0;
              return (
                <tr key={pIdx}>
                  <td className="px-3 py-2 font-bold text-foreground whitespace-nowrap sticky left-0 bg-white z-10 border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]">
                    {player.name} <span className="text-[10px] text-muted-foreground font-normal ml-1">({player.handicap})</span>
                  </td>
                  {halfHoles.map(h => {
                    const hs = scorecard.holeScores.find(x => x.holeNumber === h.number);
                    const score = hs?.scores[pIdx] ?? null;
                    if (score !== null) halfTotal += score;
                    
                    return (
                      <td key={`score-${pIdx}-${h.number}`} className="px-1 py-1 text-center">
                        <div className="flex justify-center">
                          <div className={cn(
                            "w-7 h-7 flex items-center justify-center font-bold font-display text-sm",
                            getScoreClass(score, h.par)
                          )}>
                            {score || '-'}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center font-display font-bold text-foreground bg-primary/5">
                    {halfTotal || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 sm:px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-lg relative z-10">
        <div className="max-w-4xl mx-auto flex items-start justify-between">
          <div>
            <Link href="/" className="inline-flex items-center text-primary-foreground/80 hover:text-white transition-colors mb-4 text-sm font-semibold">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to History
            </Link>
            <h1 className="text-3xl font-display font-bold mb-2">Round Summary</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center text-primary-foreground/90 text-sm font-medium">
                <Calendar className="w-4 h-4 mr-1.5 opacity-70" />
                {format(new Date(scorecard.date), 'EEEE, MMMM d, yyyy')}
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 text-white">
                {FORMAT_LABELS[gameFormat]}
              </span>
            </div>
          </div>
          
          <Link 
            href={`/round/${id}/hole/1`}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white mt-8"
          >
            <Edit3 className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4 relative z-20 space-y-6">
        
        {/* Results/Totals Card */}
        <div className="glass-card rounded-2xl p-5 shadow-sm overflow-x-auto custom-scrollbar">
          <h2 className="text-lg font-bold font-display text-foreground mb-4">Final Results</h2>

          {/* Stroke Play */}
          {gameFormat === "stroke" && (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-semibold">Player</th>
                  <th className="pb-2 font-semibold text-center">Gross</th>
                  <th className="pb-2 font-semibold text-center text-primary">Net</th>
                  <th className="pb-2 font-semibold text-center">To Par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {scorecard.players.map((p, idx) => {
                  const totals = calculatePlayerTotals(idx, p, scorecard.holeScores, holes);
                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-bold text-foreground">
                        {p.name} <span className="text-xs font-normal text-muted-foreground ml-1">CH {p.handicap}</span>
                      </td>
                      <td className="py-3 text-center font-display font-semibold">{totals.gross || '-'}</td>
                      <td className="py-3 text-center font-display font-bold text-primary">{totals.net || '-'}</td>
                      <td className="py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center px-2 py-0.5 rounded font-bold text-xs",
                          totals.toPar === 0 ? "bg-muted text-muted-foreground" :
                          totals.toPar < 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                        )}>
                          {totals.gross > 0 ? (totals.toPar > 0 ? `+${totals.toPar}` : totals.toPar === 0 ? 'E' : totals.toPar) : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Stableford */}
          {gameFormat === "stableford" && (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-semibold">Player</th>
                  <th className="pb-2 font-semibold text-center">Gross</th>
                  <th className="pb-2 font-semibold text-center text-primary">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {scorecard.players.map((p, idx) => {
                  const totals = calculatePlayerTotals(idx, p, scorecard.holeScores, holes);
                  const sfTotal = calculateStablefordTotal(idx, p, scorecard.holeScores, holes);
                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-bold text-foreground">
                        {p.name} <span className="text-xs font-normal text-muted-foreground ml-1">CH {p.handicap}</span>
                      </td>
                      <td className="py-3 text-center font-display font-semibold">{totals.gross || '-'}</td>
                      <td className="py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full font-display font-bold text-sm",
                          sfTotal >= 36 ? "bg-yellow-100 text-yellow-700" :
                          sfTotal >= 18 ? "bg-green-100 text-green-700" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {sfTotal} pts
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Match Play */}
          {gameFormat === "match" && (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-semibold">Player</th>
                  <th className="pb-2 font-semibold text-center">Gross</th>
                  {scorecard.players.length === 2 && (
                    <th className="pb-2 font-semibold text-center text-primary">Match</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {scorecard.players.map((p, idx) => {
                  const totals = calculatePlayerTotals(idx, p, scorecard.holeScores, holes);
                  const holesPlayed = scorecard.holeScores.filter(hs => hs.scores[idx] !== null && hs.scores[idx] !== undefined).length;
                  const holesLeft = Math.max(0, 18 - holesPlayed);
                  const opponentIdx = scorecard.players.length === 2 ? 1 - idx : -1;
                  const matchScore = opponentIdx >= 0
                    ? runningMatchScore(idx, opponentIdx, scorecard.holeScores, scorecard.players, holes)
                    : 0;
                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-bold text-foreground">
                        {p.name} <span className="text-xs font-normal text-muted-foreground ml-1">CH {p.handicap}</span>
                      </td>
                      <td className="py-3 text-center font-display font-semibold">{totals.gross || '-'}</td>
                      {scorecard.players.length === 2 && (
                        <td className="py-3 text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center px-2 py-0.5 rounded font-bold text-xs",
                            matchScore > 0 ? "bg-blue-100 text-blue-700" :
                            matchScore < 0 ? "bg-red-100 text-red-600" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {formatMatchScore(matchScore, holesLeft)}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Handicap Update Card */}
        <div className="glass-card rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-display text-foreground">Handicap Update</h2>
            <span className="text-xs text-muted-foreground font-medium">WHS Method</span>
          </div>
          <div className="space-y-3">
            {newHandicaps.map((h, i) => {
              const delta = h.suggested !== null ? parseFloat((h.suggested - h.current).toFixed(1)) : null;
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-bold text-foreground text-sm">{h.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {h.rounds >= 3
                        ? `Based on ${h.rounds} complete round${h.rounds !== 1 ? "s" : ""}`
                        : `Need ${3 - h.rounds} more round${3 - h.rounds !== 1 ? "s" : ""} to calculate`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="font-bold text-foreground font-display">{h.current}</p>
                    </div>
                    {h.suggested !== null && (
                      <>
                        <div className="text-muted-foreground/40">→</div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">New</p>
                          <p className={cn(
                            "font-bold font-display",
                            delta! < 0 ? "text-green-600" : delta! > 0 ? "text-red-600" : "text-foreground"
                          )}>
                            {h.suggested}
                          </p>
                        </div>
                        <div className={cn(
                          "flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full",
                          delta! < 0 ? "bg-green-100 text-green-700" :
                          delta! > 0 ? "bg-red-100 text-red-700" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {delta! < 0 ? <TrendingDown className="w-3 h-3" /> :
                           delta! > 0 ? <TrendingUp className="w-3 h-3" /> :
                           <Minus className="w-3 h-3" />}
                          {delta === 0 ? "No change" : delta! > 0 ? `+${delta}` : `${delta}`}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {newHandicaps.some(h => h.suggested !== null) && (
            <button
              onClick={handleSaveHandicaps}
              disabled={handicapsSaved}
              className={cn(
                "mt-4 w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                handicapsSaved
                  ? "bg-green-100 text-green-700 cursor-default"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
              )}
            >
              {handicapsSaved ? (
                <><CheckCircle2 className="w-4 h-4" /> Handicaps Saved — will apply to next round</>
              ) : (
                "Save New Handicaps"
              )}
            </button>
          )}
        </div>

        {/* Scorecard Grids */}
        <div>
          <h2 className="text-lg font-bold font-display text-foreground mb-3 px-1">Front 9</h2>
          {renderHalf(outHoles, true)}
        </div>

        <div>
          <h2 className="text-lg font-bold font-display text-foreground mb-3 px-1">Back 9</h2>
          {renderHalf(inHoles, false)}
        </div>
        
        {/* Legend */}
        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-wrap gap-4 items-center justify-center text-xs font-semibold text-muted-foreground mt-4">
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-[hsl(var(--score-eagle))]"></div>Eagle/Better</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--score-birdie))]"></div>Birdie</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--score-par))]"></div>Par</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm border-2 border-[hsl(var(--score-bogey))]"></div>Bogey</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-[hsl(var(--score-double))] border-2 border-white outline outline-2 outline-[hsl(var(--score-double))]"></div>Double+</div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: hsl(var(--border));
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
