import "leaflet/dist/leaflet.css";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import {
  ChevronLeft, ChevronRight, CheckCircle2,
  ArrowLeft, Satellite, SatelliteDish,
  Pencil, X, Check, MapPin, AlertCircle,
  Map, Target, ListChecks, Crosshair, Nfc, Bluetooth
} from "lucide-react";
import { useScorecard, useCourseHoles, useUpdateRoundScores } from "@/hooks/use-golf";
import { useGpsDistance } from "@/hooks/use-gps";
import { HoleMap } from "@/components/HoleMap";
import { ScoreBadge } from "@/components/ScoreBadge";
import { calculateNetScore, getStrokesReceived, getScoreClass, formatToPar, stablefordPoints, getStablefordClass, matchPlayResult, runningMatchScore, formatMatchScore, FORMAT_LABELS } from "@/lib/score-utils";
import type { GameFormat } from "@workspace/api-client-react";
import { recommendClub, ALL_CLUBS } from "@/lib/club-recommendation";
import type { Club } from "@/lib/club-recommendation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNfc } from "@/hooks/use-nfc";
import type { NfcTag } from "@/hooks/use-nfc";
import { useBleImu } from "@/hooks/use-ble-imu";
import type { BleImuShot } from "@/hooks/use-ble-imu";
import { useShotTracker } from "@/hooks/use-shot-tracker";
import type { PlayerShotSummary } from "@/hooks/use-shot-tracker";
interface ShotRecord {
  club: string;
  distanceToPin: number;
  ballLat?: number | null;
  ballLng?: number | null;
}

const PLAYER_COLORS = ["#2563eb", "#dc2626", "#d97706", "#16a34a"];

type Tab = "score" | "map" | "track" | "nfc";

interface BallMark {
  playerName: string;
  playerIndex: number;
  lat: number;
  lng: number;
  club: string;
  distanceToPin: number;
}

export default function PlayHole() {
  const [, params] = useRoute("/round/:id/hole/:holeNumber");
  const [, setLocation] = useLocation();

  const id = parseInt(params?.id || "0");
  const currentHoleNum = parseInt(params?.holeNumber || "1");

  const { data: scorecard, isLoading: loadingCard } = useScorecard(id);
  const { data: holes, isLoading: loadingHoles } = useCourseHoles();
  const updateScores = useUpdateRoundScores();

  const [activeTab, setActiveTab] = useState<Tab>("score");
  const [localScores, setLocalScores] = useState<(number | null)[]>([]);
  const [localShots, setLocalShots] = useState<ShotRecord[][]>([]);
  const [showHandicapEdit, setShowHandicapEdit] = useState(false);
  const [editedHandicaps, setEditedHandicaps] = useState<number[]>([]);
  const [editedGameFormat, setEditedGameFormat] = useState<GameFormat>("stroke");

  // Ball tracking state
  const [trackingPlayer, setTrackingPlayer] = useState<number | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [ballMarks, setBallMarks] = useState<BallMark[]>([]);
  const [showClubPicker, setShowClubPicker] = useState(false);

  // NFC shot tracking state
  const [lastNfcScan, setLastNfcScan] = useState<NfcTag | null>(null);
  const [nfcMessage, setNfcMessage] = useState<string | null>(null);

  const hole = holes?.find(h => h.number === currentHoleNum);

  const gps = useGpsDistance(
    hole?.pinLat ?? -32.7430,
    hole?.pinLng ?? 17.9760
  );

  // Shot tracker and NFC — hooks must be called unconditionally before any early return
  const shotTracker = useShotTracker(currentHoleNum);

  // Stable refs so NFC callbacks always see the latest values without re-subscribing
  const scorecardRef = useRef<typeof scorecard>(undefined);
  scorecardRef.current = scorecard;
  const gpsPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  gpsPositionRef.current = gps.position ? { lat: gps.position.lat, lng: gps.position.lng } : null;

  const handleNfcScan = useCallback((tag: NfcTag) => {
    const sc = scorecardRef.current;
    if (!sc) return;
    const matched = sc.players.find(
      (p) => p.name.trim().toLowerCase() === tag.playerName.trim().toLowerCase(),
    );
    if (!matched) {
      setNfcMessage(`Player "${tag.playerName}" is not in this round`);
      return;
    }
    shotTracker.recordScan(matched.name, tag.clubCode, gpsPositionRef.current);
    setLastNfcScan(tag);
    setNfcMessage(null);
  }, [shotTracker]);

  const nfc = useNfc(handleNfcScan);

  // BLE IMU sensor — each board sends "PlayerName:SWING|STROKE:magnitude" notifications
  const distToPinRef = useRef<number | null>(null);
  distToPinRef.current = gps.distanceToPin ?? null;

  const [lastBleShot, setLastBleShot] = useState<BleImuShot | null>(null);

  const handleBleShot = useCallback((bleShot: BleImuShot) => {
    const sc = scorecardRef.current;
    if (!sc) return;
    const matched = sc.players.find(
      (p) => p.name.trim().toLowerCase() === bleShot.playerName.trim().toLowerCase(),
    );
    if (!matched) return;
    // Near the pin + STROKE = putting; otherwise chip or swing
    const dist = distToPinRef.current;
    let clubCode: string;
    if (bleShot.type === "STROKE" && dist !== null && dist <= 25) {
      clubCode = "Putter";       // auto-detected putt on/near green
    } else if (bleShot.type === "STROKE") {
      clubCode = "Chip (IMU)";
    } else {
      clubCode = "Swing (IMU)";
    }
    shotTracker.recordScan(matched.name, clubCode, gpsPositionRef.current);
    setLastBleShot(bleShot);
  }, [shotTracker]);

  const ble = useBleImu(handleBleShot);

  // Reset ball marks and tracking when hole changes
  useEffect(() => {
    setBallMarks([]);
    setTrackingPlayer(null);
    setSelectedClub(null);
    setActiveTab("score");
  }, [currentHoleNum]);

  useEffect(() => {
    if (scorecard && hole) {
      const existing = scorecard.holeScores.find(hs => hs.holeNumber === currentHoleNum);
      if (existing && existing.scores.length === scorecard.players.length) {
        setLocalScores([...existing.scores]);
        setLocalShots(existing.shots ? existing.shots.map(s => s ?? []) : scorecard.players.map(() => []));
      } else {
        setLocalScores(new Array(scorecard.players.length).fill(null));
        setLocalShots(scorecard.players.map(() => []));
      }
    }
  }, [scorecard, hole, currentHoleNum]);

  useEffect(() => {
    if (scorecard) {
      setEditedHandicaps(scorecard.players.map(p => p.handicap));
      setEditedGameFormat(scorecard.gameFormat as GameFormat ?? "stroke");
    }
  }, [scorecard]);

  if (loadingCard || loadingHoles || !scorecard || !hole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-display font-bold text-xl text-primary animate-pulse">
        Loading Hole...
      </div>
    );
  }

  const handleScoreChange = (playerIndex: number, newScore: number | null) => {
    const updated = [...localScores];
    updated[playerIndex] = newScore;
    setLocalScores(updated);
  };

  const increment = (playerIndex: number) => {
    const current = localScores[playerIndex];
    handleScoreChange(playerIndex, current === null ? hole.par : Math.min(current + 1, 15));
  };

  const decrement = (playerIndex: number) => {
    const current = localScores[playerIndex];
    if (current !== null && current > 1) handleScoreChange(playerIndex, current - 1);
  };

  const buildUpdatedHoleScores = () => {
    const newHoleScores = [...scorecard.holeScores];
    const existingIndex = newHoleScores.findIndex(hs => hs.holeNumber === currentHoleNum);
    const entry = { holeNumber: currentHoleNum, scores: localScores, shots: localShots };
    if (existingIndex >= 0) {
      newHoleScores[existingIndex] = entry;
    } else {
      newHoleScores.push(entry);
    }
    return newHoleScores;
  };

  const saveAndNavigate = (nextHoleNum: number | null) => {
    const holeScores = buildUpdatedHoleScores();
    updateScores.mutate(
      { id, data: { holeScores } },
      {
        onSuccess: () => {
          if (nextHoleNum !== null && nextHoleNum <= 18) {
            setLocation(`/round/${id}/hole/${nextHoleNum}`);
          } else {
            setLocation(`/scorecard/${id}`);
          }
        }
      }
    );
  };

  const saveHandicaps = () => {
    const holeScores = buildUpdatedHoleScores();
    const updatedPlayers = scorecard.players.map((p, i) => ({
      ...p,
      handicap: editedHandicaps[i] ?? p.handicap,
    }));
    updateScores.mutate(
      { id, data: { holeScores, players: updatedPlayers, gameFormat: editedGameFormat } },
      { onSuccess: () => setShowHandicapEdit(false) }
    );
  };

  const markBallPosition = () => {
    if (trackingPlayer === null || !gps.position || !selectedClub) return;
    const player = scorecard.players[trackingPlayer];
    const distToPin = gps.distanceToPin ?? 0;

    const mark: BallMark = {
      playerName: player.name,
      playerIndex: trackingPlayer,
      lat: gps.position.lat,
      lng: gps.position.lng,
      club: selectedClub,
      distanceToPin: distToPin,
    };

    // Remove existing mark for same player, add new one
    setBallMarks(prev => [...prev.filter(m => m.playerIndex !== trackingPlayer), mark]);

    // Record shot
    const shot: ShotRecord = {
      club: selectedClub,
      distanceToPin: distToPin,
      ballLat: gps.position.lat,
      ballLng: gps.position.lng,
    };
    setLocalShots(prev => {
      const updated = prev.map(arr => [...arr]);
      while (updated.length <= trackingPlayer) updated.push([]);
      updated[trackingPlayer] = [...updated[trackingPlayer], shot];
      return updated;
    });

    setSelectedClub(null);
    setActiveTab("map");
  };

  const progressPct = (currentHoleNum / 18) * 100;

  const playerTotals = scorecard.players.map((player, pIdx) => {
    let gross = 0;
    let toPar = 0;
    let sfPts = 0;
    scorecard.holeScores.forEach(hs => {
      const score = hs.scores[pIdx];
      const h = holes?.find(x => x.number === hs.holeNumber);
      if (score !== null && score !== undefined && score > 0 && h) {
        gross += score;
        toPar += score - h.par;
        sfPts += stablefordPoints(score, player.handicap, h.strokeIndex, h.par);
      }
    });
    const currentScore = localScores[pIdx];
    if (currentScore !== null && currentScore !== undefined) {
      const alreadyCounted = scorecard.holeScores.find(hs => hs.holeNumber === currentHoleNum)?.scores[pIdx];
      if (!alreadyCounted) {
        gross += currentScore;
        toPar += currentScore - hole.par;
        sfPts += stablefordPoints(currentScore, player.handicap, hole.strokeIndex, hole.par);
      }
    }
    return { gross, toPar, sfPts };
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "score", label: "Score", icon: <ListChecks className="w-5 h-5" /> },
    { id: "map", label: "Map", icon: <Map className="w-5 h-5" /> },
    { id: "track", label: "Track Shot", icon: <Target className="w-5 h-5" /> },
    { id: "nfc", label: "NFC Clubs", icon: <Nfc className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top App Bar */}
      <div className="bg-primary text-primary-foreground px-4 py-5 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <button
          onClick={() => saveAndNavigate(null)}
          className="p-3 -ml-3 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-display font-bold text-xl tracking-wide">Hole {currentHoleNum}</h1>
          <p className="text-xs font-medium text-primary-foreground/80 uppercase tracking-widest">{hole.name}</p>
        </div>
        <Link
          href={`/scorecard/${id}`}
          className="p-3 -mr-3 rounded-full hover:bg-white/10 transition-colors"
        >
          <ListIcon className="w-7 h-7" />
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-primary/20">
        <div className="h-full bg-accent transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Hole Info Card */}
      <div className="px-4 pt-4 pb-2 z-10">
        <div className="bg-white rounded-3xl p-4 border border-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10" />

          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="text-center px-2 py-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Par</p>
              <p className="text-4xl font-display font-bold text-foreground">{hole.par}</p>
            </div>
            <div className="text-center px-2 py-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Metres</p>
              <p className="text-4xl font-display font-bold text-primary">{hole.distanceMen}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Yellow Tee</p>
            </div>
            <div className="text-center px-2 py-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Index</p>
              <p className="text-4xl font-display font-bold text-foreground">{hole.strokeIndex}</p>
            </div>
          </div>

          {/* GPS Distance Row */}
          <div className="mt-3 pt-3 border-t border-border/60">
            {!gps.enabled ? (
              <button
                onClick={gps.startTracking}
                disabled={!gps.supported}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary/8 border border-primary/20 text-primary font-bold text-base hover:bg-primary/15 active:bg-primary/20 transition-colors"
              >
                <Satellite className="w-4 h-4" />
                {gps.supported ? "Enable GPS" : "GPS not supported"}
              </button>
            ) : gps.loading ? (
              <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground text-sm">
                <SatelliteDish className="w-4 h-4 animate-pulse" />
                Acquiring GPS signal...
              </div>
            ) : gps.error ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-xs">{gps.error}</span>
                </div>
                <button onClick={gps.stopTracking} className="text-red-400 hover:text-red-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">GPS to Pin</p>
                    <p className="text-3xl font-display font-bold text-green-700 leading-tight">
                      {gps.distanceToPin !== null ? `${gps.distanceToPin}m` : "—"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Accuracy</p>
                  <p className="text-xs font-semibold text-foreground">±{Math.round(gps.position?.accuracy ?? 0)}m</p>
                  <button onClick={gps.stopTracking} className="text-muted-foreground hover:text-foreground mt-1 p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="px-4 py-2">
        <div className="bg-muted rounded-2xl p-1 flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all",
                activeTab === tab.id
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 px-4 pb-36 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            {activeTab === "score" && (
              <ScoreTab
                scorecard={scorecard}
                hole={hole}
                localScores={localScores}
                localShots={localShots}
                playerTotals={playerTotals}
                holes={holes ?? []}
                currentHoleNum={currentHoleNum}
                increment={increment}
                decrement={decrement}
                handleScoreChange={handleScoreChange}
                onEditHandicaps={() => setShowHandicapEdit(true)}
                gameFormat={(scorecard.gameFormat as GameFormat) ?? "stroke"}
              />
            )}
            {activeTab === "map" && (
              <div className="h-[420px] mt-2 rounded-2xl overflow-hidden shadow-md border border-border">
                <HoleMap
                  pinLat={hole.pinLat}
                  pinLng={hole.pinLng}
                  teeLat={hole.teeLat}
                  teeLng={hole.teeLng}
                  userLat={gps.position?.latitude}
                  userLng={gps.position?.longitude}
                  ballMarks={ballMarks}
                />
              </div>
            )}
            {activeTab === "track" && (
              <TrackTab
                scorecard={scorecard}
                gps={gps}
                trackingPlayer={trackingPlayer}
                setTrackingPlayer={setTrackingPlayer}
                selectedClub={selectedClub}
                setSelectedClub={setSelectedClub}
                showClubPicker={showClubPicker}
                setShowClubPicker={setShowClubPicker}
                ballMarks={ballMarks}
                onMarkBall={markBallPosition}
                localShots={localShots}
              />
            )}
            {activeTab === "nfc" && (
              <NfcTab
                scorecard={scorecard}
                nfc={nfc}
                ble={ble}
                shotTracker={shotTracker}
                gps={gps}
                localScores={localScores}
                handleScoreChange={handleScoreChange}
                lastNfcScan={lastNfcScan}
                nfcMessage={nfcMessage}
                lastBleShot={lastBleShot}
                currentHoleNum={currentHoleNum}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-border p-4 pb-safe z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => saveAndNavigate(currentHoleNum > 1 ? currentHoleNum - 1 : null)}
            className="flex-1 py-5 px-2 rounded-xl border-2 border-border font-bold text-foreground flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-6 h-6 mr-1" /> Prev
          </button>

          <button
            onClick={() => saveAndNavigate(currentHoleNum < 18 ? currentHoleNum + 1 : null)}
            disabled={updateScores.isPending}
            className="flex-[2] py-5 px-2 rounded-xl font-bold text-lg text-primary-foreground bg-primary shadow-lg shadow-primary/25 flex items-center justify-center hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60"
          >
            {updateScores.isPending ? "Saving..." :
              currentHoleNum < 18
                ? <><span>Next Hole</span><ChevronRight className="w-6 h-6 ml-1" /></>
                : <><span>Finish Round</span><CheckCircle2 className="w-6 h-6 ml-2" /></>
            }
          </button>
        </div>
      </div>

      {/* Settings Modal (Handicaps + Game Format) */}
      <AnimatePresence>
        {showHandicapEdit && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowHandicapEdit(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 pb-safe shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-display font-bold text-foreground">Round Settings</h3>
                <button onClick={() => setShowHandicapEdit(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Game Format */}
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Game Format</p>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {(["stroke", "stableford", "match"] as GameFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setEditedGameFormat(fmt)}
                    className={cn(
                      "py-3 px-2 rounded-2xl border-2 transition-all text-center",
                      editedGameFormat === fmt
                        ? "border-primary bg-primary/8 text-primary shadow-sm"
                        : "border-border bg-white text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <p className="font-bold text-xs">{FORMAT_LABELS[fmt]}</p>
                  </button>
                ))}
              </div>

              {/* Handicaps */}
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Player Handicaps</p>
              <div className="space-y-4 mb-6">
                {scorecard.players.map((player, index) => (
                  <div key={index} className="flex items-center gap-4 bg-muted/30 rounded-2xl p-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-display font-bold text-primary shrink-0">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="flex-1 font-bold text-foreground">{player.name}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const updated = [...editedHandicaps];
                          updated[index] = Math.max(0, (updated[index] ?? player.handicap) - 1);
                          setEditedHandicaps(updated);
                        }}
                        className="w-14 h-14 rounded-full bg-white border border-border shadow-sm flex items-center justify-center text-2xl font-bold hover:bg-muted active:scale-95 transition-all"
                      >−</button>
                      <div className="w-12 text-center">
                        <span className="text-2xl font-display font-bold text-foreground">
                          {editedHandicaps[index] ?? player.handicap}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const updated = [...editedHandicaps];
                          updated[index] = Math.min(54, (updated[index] ?? player.handicap) + 1);
                          setEditedHandicaps(updated);
                        }}
                        className="w-14 h-14 rounded-full bg-white border border-border shadow-sm flex items-center justify-center text-2xl font-bold hover:bg-muted active:scale-95 transition-all"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={saveHandicaps}
                disabled={updateScores.isPending}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <Check className="w-5 h-5" />
                {updateScores.isPending ? "Saving..." : "Save Settings"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Score Tab ────────────────────────────────────────────────────────────────
function ScoreTab({
  scorecard, hole, localScores, localShots, playerTotals, currentHoleNum,
  increment, decrement, handleScoreChange, onEditHandicaps, gameFormat
}: {
  scorecard: NonNullable<ReturnType<typeof useScorecard>["data"]>;
  hole: { par: number; strokeIndex: number; [k: string]: unknown };
  localScores: (number | null)[];
  localShots: { club: string; distanceToPin: number }[][];
  playerTotals: { gross: number; toPar: number; sfPts: number }[];
  holes: unknown[];
  currentHoleNum: number;
  increment: (i: number) => void;
  decrement: (i: number) => void;
  handleScoreChange: (i: number, v: number | null) => void;
  onEditHandicaps: () => void;
  gameFormat: GameFormat;
}) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Scores</p>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {FORMAT_LABELS[gameFormat]}
          </span>
        </div>
        <button
          onClick={onEditHandicaps}
          className="flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/8 px-4 py-2.5 rounded-full border border-primary/20"
        >
          <Pencil className="w-3 h-3" /> Settings
        </button>
      </div>

      {scorecard.players.map((player, index) => {
        const score = localScores[index];
        const strokesReceived = getStrokesReceived(player.handicap, hole.strokeIndex as number);
        const netScore = calculateNetScore(score, player.handicap, hole.strokeIndex as number);
        const sfPoints = stablefordPoints(score, player.handicap, hole.strokeIndex as number, hole.par as number);
        const totals = playerTotals[index];
        const playerShots = localShots[index] ?? [];

        // Match play: hole result vs each other player using localScores
        const matchResults = gameFormat === "match" && scorecard.players.length > 1
          ? scorecard.players.map((opponent, oi) => {
              if (oi === index) return null;
              const myGross = score;
              const theirGross = localScores[oi];
              if (myGross === null || theirGross === null) return null;
              return {
                opponent: opponent.name,
                result: matchPlayResult(myGross, theirGross, player.handicap, opponent.handicap, hole.strokeIndex as number),
              };
            }).filter(Boolean)
          : [];

        return (
          <div key={index} className="bg-white rounded-3xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-white text-lg"
                  style={{ background: PLAYER_COLORS[index] }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-display font-bold text-foreground">{player.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      HCP {player.handicap}
                    </span>
                    {strokesReceived > 0 && (
                      <span className="text-[10px] font-bold text-primary">+{strokesReceived} shot{strokesReceived > 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {gameFormat === "stableford" ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">Total Pts</p>
                    <p className="font-display font-bold text-foreground text-lg leading-tight">
                      {totals.sfPts > 0 ? `${totals.sfPts}` : "—"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">Total</p>
                    <p className="font-display font-bold text-foreground text-lg leading-tight">
                      {totals.gross > 0 ? totals.gross : "—"}
                    </p>
                    {totals.gross > 0 && (
                      <p className={cn("text-xs font-bold",
                        totals.toPar < 0 ? "text-blue-600" : totals.toPar === 0 ? "text-muted-foreground" : "text-red-500"
                      )}>
                        {totals.toPar > 0 ? `+${totals.toPar}` : totals.toPar === 0 ? "E" : totals.toPar}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 bg-muted/30 rounded-2xl p-3">
              <button
                onClick={() => decrement(index)}
                className="w-20 h-20 rounded-full bg-white shadow-sm border border-border flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all text-3xl font-bold"
              >−</button>
              <div
                className="flex-1 flex flex-col items-center justify-center cursor-pointer"
                onClick={() => { if (score === null) handleScoreChange(index, hole.par as number); }}
              >
                {score === null ? (
                  <div className="text-base font-bold text-muted-foreground uppercase tracking-wide">Tap to set par</div>
                ) : (
                  <>
                    <div className={cn(
                      "w-20 h-20 flex items-center justify-center text-4xl font-display font-bold rounded-xl transition-all",
                      getScoreClass(score, hole.par as number)
                    )}>
                      {score}
                    </div>
                    {gameFormat === "stableford" ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-md",
                          getStablefordClass(sfPoints) === "score-eagle" ? "bg-yellow-100 text-yellow-700" :
                          getStablefordClass(sfPoints) === "score-birdie" ? "bg-blue-100 text-blue-700" :
                          getStablefordClass(sfPoints) === "score-par" ? "bg-green-100 text-green-700" :
                          getStablefordClass(sfPoints) === "score-bogey" ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {sfPoints} {sfPoints === 1 ? "pt" : "pts"}
                        </span>
                        <p className="text-[10px] font-bold text-muted-foreground">Net {netScore}</p>
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-muted-foreground mt-1">
                        {formatToPar(score, hole.par as number)} · Net {netScore}
                      </p>
                    )}
                  </>
                )}
              </div>
              <button
                onClick={() => increment(index)}
                className="w-20 h-20 rounded-full bg-white shadow-sm border border-border flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all text-3xl font-bold"
              >+</button>
            </div>

            {/* Match play hole results */}
            {gameFormat === "match" && matchResults.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                {matchResults.map((r, ri) => r && (
                  <span key={ri} className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full",
                    r.result === "W" ? "bg-blue-100 text-blue-700" :
                    r.result === "H" ? "bg-muted text-muted-foreground" :
                    "bg-red-100 text-red-600"
                  )}>
                    vs {r.opponent}: {r.result === "W" ? "Win" : r.result === "H" ? "Halved" : "Loss"}
                  </span>
                ))}
              </div>
            )}

            {/* Shot log for this hole */}
            {playerShots.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                {playerShots.map((shot, si) => (
                  <div key={si} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Shot {si + 1} — {shot.club}</span>
                    <span className="text-muted-foreground">{shot.distanceToPin}m to pin</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Track Tab ────────────────────────────────────────────────────────────────
function TrackTab({
  scorecard, gps, trackingPlayer, setTrackingPlayer,
  selectedClub, setSelectedClub, showClubPicker, setShowClubPicker,
  ballMarks, onMarkBall, localShots
}: {
  scorecard: NonNullable<ReturnType<typeof useScorecard>["data"]>;
  gps: ReturnType<typeof useGpsDistance>;
  trackingPlayer: number | null;
  setTrackingPlayer: (i: number | null) => void;
  selectedClub: Club | null;
  setSelectedClub: (c: Club | null) => void;
  showClubPicker: boolean;
  setShowClubPicker: (v: boolean) => void;
  ballMarks: BallMark[];
  onMarkBall: () => void;
  localShots: { club: string; distanceToPin: number }[][];
}) {
  const distToPin = gps.distanceToPin;
  const hasGps = gps.enabled && !gps.loading && !gps.error && gps.position;

  const getRecommendation = (playerIndex: number) => {
    if (distToPin === null || distToPin === undefined) return null;
    const player = scorecard.players[playerIndex];
    return recommendClub(distToPin, player.handicap);
  };

  return (
    <div className="space-y-4 pt-2">
      <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide px-1">Select Player</p>

      <div className="grid grid-cols-2 gap-3">
        {scorecard.players.map((player, index) => {
          const rec = getRecommendation(index);
          const shots = localShots[index] ?? [];
          const isSelected = trackingPlayer === index;

          return (
            <button
              key={index}
              onClick={() => setTrackingPlayer(isSelected ? null : index)}
              className={cn(
                "rounded-2xl p-4 text-left border-2 transition-all",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-white shadow-sm hover:border-primary/40"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-base"
                  style={{ background: PLAYER_COLORS[index] }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm leading-tight">{player.name}</p>
                  <p className="text-[10px] text-muted-foreground">HCP {player.handicap}</p>
                </div>
              </div>

              {rec && hasGps && (
                <div className="bg-green-50 rounded-xl px-3 py-2 mt-1">
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Recommended</p>
                  <p className="text-lg font-display font-bold text-green-800">{rec.primary}</p>
                  {rec.secondary && (
                    <p className="text-[10px] text-green-600">or {rec.secondary}</p>
                  )}
                  <p className="text-[10px] text-green-600 mt-0.5">{rec.reason}</p>
                </div>
              )}

              {shots.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  {shots.length} shot{shots.length > 1 ? "s" : ""} tracked this hole
                </p>
              )}
            </button>
          );
        })}
      </div>

      {trackingPlayer !== null && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-4">
          <p className="font-bold text-foreground">
            Tracking: <span className="text-primary">{scorecard.players[trackingPlayer].name}</span>
          </p>

          {/* GPS Status */}
          {!hasGps && (
            <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-700 font-semibold border border-amber-200">
              ⚠️ GPS needs to be enabled to mark ball position
            </div>
          )}

          {/* Club Selector */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Club Used</p>
            <button
              onClick={() => setShowClubPicker(true)}
              className={cn(
                "w-full py-3 px-4 rounded-xl border-2 font-bold text-left transition-all",
                selectedClub
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {selectedClub ?? "Tap to select club →"}
            </button>
          </div>

          {/* GPS distance display */}
          {hasGps && distToPin !== null && (
            <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Current GPS to Pin</p>
                <p className="text-2xl font-display font-bold text-green-800">{distToPin}m</p>
              </div>
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
          )}

          {/* Mark Ball Button */}
          <button
            onClick={onMarkBall}
            disabled={!hasGps || !selectedClub}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: hasGps && selectedClub ? PLAYER_COLORS[trackingPlayer] : undefined, backgroundColor: hasGps && selectedClub ? undefined : "#9ca3af" }}
          >
            <Crosshair className="w-5 h-5" />
            Mark Ball Position
          </button>
        </div>
      )}

      {/* Ball marks summary */}
      {ballMarks.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Ball Positions This Hole</p>
          <div className="space-y-2">
            {ballMarks.map((mark, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: PLAYER_COLORS[mark.playerIndex] }}
                  >
                    {mark.playerIndex + 1}
                  </div>
                  <span className="font-semibold text-sm text-foreground">{mark.playerName}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{mark.club}</p>
                  <p className="text-xs text-muted-foreground">{mark.distanceToPin}m to pin</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Club Picker Sheet */}
      <AnimatePresence>
        {showClubPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowClubPicker(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 pb-safe shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-bold">Select Club</h3>
                <button onClick={() => setShowClubPicker(false)} className="p-2 rounded-full hover:bg-muted">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {trackingPlayer !== null && distToPin !== null && hasGps && (
                <div className="mb-4 bg-green-50 rounded-xl px-4 py-3 border border-green-200">
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Distance to Pin</p>
                  <p className="text-2xl font-display font-bold text-green-800">{distToPin}m</p>
                  <p className="text-xs text-green-600">
                    Recommended for HCP {scorecard.players[trackingPlayer].handicap}:{" "}
                    <strong>{recommendClub(distToPin, scorecard.players[trackingPlayer].handicap).primary}</strong>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {ALL_CLUBS.map((club) => {
                  const isRec = trackingPlayer !== null && distToPin !== null
                    ? recommendClub(distToPin, scorecard.players[trackingPlayer].handicap).primary === club
                    : false;
                  return (
                    <button
                      key={club}
                      onClick={() => { setSelectedClub(club); setShowClubPicker(false); }}
                      className={cn(
                        "py-3 px-2 rounded-xl font-bold text-sm border-2 transition-all active:scale-95",
                        isRec
                          ? "border-green-500 bg-green-50 text-green-800"
                          : selectedClub === club
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-white text-foreground hover:border-primary/30"
                      )}
                    >
                      {isRec && <span className="text-[9px] block text-green-600 font-bold uppercase">★ Rec</span>}
                      {club}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── NFC + BLE IMU Tab ──────────────────────────────────────────────────────
function NfcTab({
  scorecard, nfc, ble, shotTracker, gps, localScores, handleScoreChange,
  lastNfcScan, nfcMessage, lastBleShot, currentHoleNum,
}: {
  scorecard: NonNullable<ReturnType<typeof useScorecard>["data"]>;
  nfc: ReturnType<typeof useNfc>;
  ble: ReturnType<typeof useBleImu>;
  shotTracker: ReturnType<typeof useShotTracker>;
  gps: ReturnType<typeof useGpsDistance>;
  localScores: (number | null)[];
  handleScoreChange: (i: number, v: number | null) => void;
  lastNfcScan: NfcTag | null;
  nfcMessage: string | null;
  lastBleShot: BleImuShot | null;
  currentHoleNum: number;
}) {
  const hasGps = gps.enabled && !gps.loading && !gps.error && gps.position;

  return (
    <div className="space-y-4 pt-2">

      {/* ── BLE IMU Wearable Sensor ─────────────────────────────────────── */}
      <div className={cn(
        "rounded-2xl p-4 border-2 transition-all",
        ble.isConnected ? "bg-blue-50 border-blue-300" : "bg-white border-border shadow-sm",
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center",
              ble.isConnected ? "bg-blue-600" : "bg-muted",
            )}>
              <Bluetooth className={cn("w-4.5 h-4.5", ble.isConnected ? "text-white" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground leading-tight">
                {ble.isConnected ? (ble.device?.name ?? "IMU Sensor") : "IMU Wearable Sensor"}
              </p>
              <p className="text-[10px] text-muted-foreground">XIAO nRF52840 Sense</p>
            </div>
          </div>
          {ble.isSupported ? (
            <button
              onClick={ble.isConnected ? ble.disconnect : ble.connect}
              disabled={ble.isConnecting}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60",
                ble.isConnected
                  ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
                  : "bg-blue-600 text-white hover:bg-blue-700",
              )}
            >
              {ble.isConnecting ? "Connecting…" : ble.isConnected ? "Disconnect" : "Connect"}
            </button>
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg">
              BLE not available
            </span>
          )}
        </div>
        {ble.isConnected && (
          <p className="text-xs text-blue-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
            Auto-detecting swings and putts — each detection counts as 1 shot
          </p>
        )}
        {!ble.isSupported && (
          <p className="text-xs text-muted-foreground mt-1">
            Web Bluetooth requires Chrome on Android (or Chrome desktop with the
            experimental-web-platform flag enabled).
          </p>
        )}
        {ble.error && (
          <div className="mt-2 text-sm text-red-600 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {ble.error}
          </div>
        )}
      </div>

      {/* ── Last BLE shot notification ──────────────────────────────────── */}
      {lastBleShot && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1.5">
            IMU — {lastBleShot.type === "STROKE" ? "🏳️ Putt / Chip" : "🏌️ Swing"} Detected
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {lastBleShot.playerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-blue-900 text-sm">{lastBleShot.playerName}</p>
                <p className="text-xs text-blue-600 font-semibold">{lastBleShot.magnitude.toFixed(1)}g peak force</p>
              </div>
            </div>
            <span className={cn(
              "text-xs font-bold px-3 py-1.5 rounded-xl",
              lastBleShot.type === "STROKE" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800",
            )}>
              {lastBleShot.type === "STROKE" ? "Putt / Chip" : "Full Swing"}
            </span>
          </div>
        </div>
      )}

      {/* ── Not supported ───────────────────────────────────────────────── */}
      {!nfc.isSupported && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Nfc className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="font-bold text-amber-800">NFC not available in this browser</p>
          </div>
          <p className="text-sm text-amber-700 mb-3">
            Web NFC requires Chrome on Android. You can still programme the tags and use the rest of the app — shot distances won't be captured automatically.
          </p>
          <div className="bg-amber-100/70 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-800 mb-1">How to programme an Ntag213:</p>
            <p className="text-xs text-amber-700">Write a plain <strong>Text</strong> NDEF record using the format:</p>
            <p className="text-xs font-mono text-amber-800 mt-1">PlayerName:ClubName</p>
            <p className="text-xs font-mono text-amber-700">John:Driver</p>
            <p className="text-xs font-mono text-amber-700">John:7-Iron</p>
            <p className="text-xs font-mono text-amber-700">John:Putter</p>
            <p className="text-xs text-amber-600 mt-2">Use the free "NFC Tools" app to write tags.</p>
          </div>
        </div>
      )}

      {/* ── Scanning controls ────────────────────────────────────────────── */}
      {nfc.isSupported && (
        <div className={cn(
          "rounded-2xl p-4 border-2 transition-all",
          nfc.isScanning ? "bg-green-50 border-green-300" : "bg-white border-border shadow-sm",
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                nfc.isScanning ? "bg-green-500 animate-pulse" : "bg-gray-300",
              )} />
              <p className="font-bold text-sm text-foreground">
                {nfc.isScanning ? "Scanning for club tags…" : "NFC ready"}
              </p>
            </div>
            <button
              onClick={nfc.isScanning ? nfc.stopScanning : nfc.startScanning}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95",
                nfc.isScanning
                  ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {nfc.isScanning ? "Stop" : "Start Scanning"}
            </button>
          </div>

          {nfc.isScanning && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Nfc className="w-3.5 h-3.5" />
              Hold club NFC tag near the back of your phone when you're about to play
            </p>
          )}

          {nfc.error && (
            <p className="text-sm text-red-600 font-semibold mt-2">⚠️ {nfc.error}</p>
          )}
        </div>
      )}

      {/* ── GPS warning ──────────────────────────────────────────────────── */}
      {!hasGps && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-700 font-semibold">Enable GPS to measure shot distances</p>
          <button
            onClick={gps.startTracking}
            disabled={!gps.supported}
            className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 hover:bg-amber-200 transition-colors shrink-0 disabled:opacity-50"
          >
            Enable GPS
          </button>
        </div>
      )}

      {/* ── Player mismatch / warning ─────────────────────────────────────── */}
      {nfcMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700 font-semibold">⚠️ {nfcMessage}</p>
          <p className="text-xs text-red-500 mt-1">
            Check the tag is programmed as PlayerName:ClubName and the player is in this round.
          </p>
        </div>
      )}

      {/* ── Last scan notification ───────────────────────────────────────── */}
      {lastNfcScan && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1.5">Last Scan</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg">
              {lastNfcScan.playerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-green-900">{lastNfcScan.playerName}</p>
              <p className="text-sm text-green-700">🏌️ {lastNfcScan.clubCode}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Per-player shot summaries ───────────────────────────────────── */}
      {scorecard.players.map((player, index) => {
        const summary: PlayerShotSummary = shotTracker.getPlayerSummary(player.name);
        if (summary.shots.length === 0) return null;

        return (
          <div key={index} className="bg-white rounded-2xl border border-border shadow-sm p-4">
            {/* Player header + auto-fill button */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base"
                  style={{ background: PLAYER_COLORS[index] }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-foreground">{player.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      {summary.totalShotCount} shot{summary.totalShotCount !== 1 ? "s" : ""}
                    </span>
                    {summary.puttCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-green-100 text-green-700">
                        {summary.puttCount} putt{summary.puttCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {summary.isPutting && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 animate-pulse">
                        On Green
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleScoreChange(index, summary.totalShotCount)}
                className="flex flex-col items-center text-xs font-bold text-primary bg-primary/8 px-3 py-2 rounded-xl border border-primary/20 hover:bg-primary/15 transition-colors"
              >
                <span className="text-base font-display">{summary.totalShotCount}</span>
                <span className="text-[9px] uppercase tracking-wide">Fill Score</span>
              </button>
            </div>

            {/* Shot log */}
            <div className="space-y-1.5">
              {summary.shots.map((shot) => (
                <div
                  key={shot.id}
                  className={cn(
                    "flex items-center justify-between text-xs rounded-xl px-3 py-2",
                    shot.isPutt ? "bg-green-50" : "bg-muted/40",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground w-5 text-center">
                      {shot.shotIndex}
                    </span>
                    <span className={cn("font-bold", shot.isPutt ? "text-green-800" : "text-foreground")}>
                      {shot.isPutt ? "🏳️" : "🏌️"} {shot.clubCode}
                    </span>
                  </div>
                  <div className="text-right">
                    {shot.distanceCarried !== null ? (
                      <span className="font-semibold text-foreground">
                        {shot.distanceCarried}m {shot.isPutt ? "putt" : "carry"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-[10px]">first scan</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Putting summary panel */}
            {summary.puttCount > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="bg-green-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">
                      Hole {currentHoleNum} — Putting
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {summary.puttCount === 1
                        ? "1 putt recorded. Tap hole out to finish."
                        : `${summary.puttCount} putts recorded.`}
                    </p>
                  </div>
                  <p className="text-2xl font-display font-bold text-green-900">
                    {summary.puttCount}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {shotTracker.shots.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Nfc className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-bold text-sm">No club scans yet this hole</p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            {nfc.isSupported
              ? "Start scanning above, then hold your club's NFC tag near your phone before each shot."
              : "Use the NFC Tools app to programme tags as PlayerName:ClubName."}
          </p>

          <div className="mt-5 bg-muted/40 rounded-2xl p-4 text-left max-w-xs mx-auto">
            <p className="text-xs font-bold text-foreground mb-2">How it works</p>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-none">
              <li>1. Stand at your ball, pull out the club you'll use</li>
              <li>2. Scan the NFC tag on that club → position recorded</li>
              <li>3. Hit the shot, walk to ball, scan next club</li>
              <li>4. App shows how far your previous shot carried</li>
              <li className="text-green-700 font-semibold">
                🏳️ Putter scans count putts automatically
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function ListIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
