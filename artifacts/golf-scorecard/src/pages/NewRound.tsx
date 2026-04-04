import { useState } from "react";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, UserPlus, X, Play, Crosshair, Trophy, Swords, Users } from "lucide-react";
import { useCreateNewScorecard, usePlayers } from "@/hooks/use-golf";
import { motion, AnimatePresence } from "framer-motion";
import type { GameFormat } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const GAME_FORMATS: { id: GameFormat; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "stroke",
    label: "Stroke Play",
    description: "Count total strokes",
    icon: <Crosshair className="w-7 h-7" />,
  },
  {
    id: "stableford",
    label: "Stableford",
    description: "Points based on net score",
    icon: <Trophy className="w-7 h-7" />,
  },
  {
    id: "match",
    label: "Match Play",
    description: "Hole-by-hole contest",
    icon: <Swords className="w-7 h-7" />,
  },
];

export default function NewRound() {
  const [, setLocation] = useLocation();
  const createRound = useCreateNewScorecard();
  const { players: roster } = usePlayers();
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [gameFormat, setGameFormat] = useState<GameFormat>("stroke");
  const [teeColor, setTeeColor] = useState<'yellow' | 'blue'>('yellow');
  // Selected player IDs (from roster) or custom entries
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Custom players not in roster (manual entry fallback)
  const [customPlayers, setCustomPlayers] = useState<{ name: string; handicap: number }[]>([]);

  const totalCount = selectedIds.length + customPlayers.length;

  const toggleRosterPlayer = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length + customPlayers.length < 4 ? [...prev, id] : prev
    );
  };

  const addCustomPlayer = () => {
    if (totalCount < 4) setCustomPlayers(prev => [...prev, { name: "", handicap: 18 }]);
  };

  const removeCustomPlayer = (i: number) => {
    setCustomPlayers(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateCustomPlayer = (i: number, field: "name" | "handicap", value: string | number) => {
    setCustomPlayers(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const handleStart = () => {
    const rosterSelections = selectedIds
      .map(id => roster.find(p => p.id === id))
      .filter(Boolean)
      .map(p => ({ name: p!.name, handicap: p!.handicap }));
    
    const custom = customPlayers.filter(p => p.name.trim() !== "");
    const allPlayers = [...rosterSelections, ...custom];

    if (allPlayers.length === 0) {
      alert("Please select or add at least one player.");
      return;
    }

    createRound.mutate(
      { data: { date: new Date(date).toISOString(), gameFormat, players: allPlayers } },
      { onSuccess: (data) => {
        localStorage.setItem(`teeColor_${data.id}`, teeColor);
        setLocation(`/round/${data.id}/hole/1`);
      }}
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute inset-0 pointer-events-none opacity-5" 
           style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/golf-pattern.png)`, backgroundSize: '200px' }} />
           
      {/* Header */}
      <div className="bg-primary text-primary-foreground pt-12 pb-6 px-4 sm:px-6 rounded-b-[2.5rem] shadow-lg relative z-10">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={() => setLocation("/")}
            className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors mb-4"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
          <h1 className="text-3xl font-display font-bold">Round Setup</h1>
          <p className="text-primary-foreground/80 mt-1">Shelley Point Golf Club</p>
        </div>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6 relative z-10 mt-4">
        
        {/* Date Selection */}
        <div className="glass-card p-5 rounded-2xl">
          <label className="block text-sm font-bold text-foreground mb-2 font-display">Date of Round</label>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-4 rounded-xl bg-white border-2 border-border text-foreground font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </div>

        {/* Tee Colour */}
        <div className="glass-card p-5 rounded-2xl">
          <label className="block text-sm font-bold text-foreground mb-3 font-display">Playing Tees</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTeeColor('yellow')}
              className={cn(
                "flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all",
                teeColor === 'yellow'
                  ? "border-yellow-400 bg-yellow-50 text-yellow-700 shadow-md"
                  : "border-border bg-white text-muted-foreground hover:border-yellow-300"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-white text-sm shrink-0">T</div>
              <div className="text-left">
                <p className="font-bold text-sm">Yellow Tees</p>
                <p className="text-[11px] text-muted-foreground">Men / Club tees</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTeeColor('blue')}
              className={cn(
                "flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all",
                teeColor === 'blue'
                  ? "border-blue-400 bg-blue-50 text-blue-700 shadow-md"
                  : "border-border bg-white text-muted-foreground hover:border-blue-300"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-sm shrink-0">T</div>
              <div className="text-left">
                <p className="font-bold text-sm">Blue Tees</p>
                <p className="text-[11px] text-muted-foreground">Senior / Ladies</p>
              </div>
            </button>
          </div>
        </div>

        {/* Game Format */}
        <div className="glass-card p-5 rounded-2xl">
          <label className="block text-sm font-bold text-foreground mb-3 font-display">Game Format</label>
          <div className="grid grid-cols-3 gap-3">
            {GAME_FORMATS.map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setGameFormat(fmt.id)}
                className={cn(
                  "flex flex-col items-center gap-2 py-5 px-2 rounded-2xl border-2 transition-all text-center",
                  gameFormat === fmt.id
                    ? "border-primary bg-primary/8 text-primary shadow-md"
                    : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  gameFormat === fmt.id ? "bg-primary/15" : "bg-muted"
                )}>
                  {fmt.icon}
                </div>
                <div>
                  <p className="font-bold text-xs leading-tight">{fmt.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{fmt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <label className="block text-lg font-bold text-foreground font-display">Players</label>
            <span className="text-sm font-medium text-muted-foreground">{totalCount}/4</span>
          </div>

          {/* Roster picker */}
          {roster.length > 0 ? (
            <div className="glass-card p-4 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select from roster</p>
              <div className="space-y-2">
                {roster.map(p => {
                  const selected = selectedIds.includes(p.id);
                  const disabled = !selected && totalCount >= 4;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleRosterPlayer(p.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 transition-all text-left",
                        selected
                          ? "border-primary bg-primary/8 text-primary"
                          : disabled
                          ? "border-border bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed"
                          : "border-border bg-white text-foreground hover:border-primary/40"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0",
                        selected ? "bg-primary" : "bg-muted-foreground/30"
                      )}>
                        {selected ? "✓" : p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-sm">{p.name}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-medium">CH {p.handicap}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
              <p className="text-sm text-muted-foreground">No players in roster yet</p>
              <Link href="/players" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                <Users className="w-4 h-4" /> Add Players
              </Link>
            </div>
          )}

          {/* Custom / guest player entries */}
          <AnimatePresence>
            {customPlayers.map((player, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-card p-4 rounded-2xl flex items-start gap-3 sm:gap-4 relative"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 mt-1 text-sm">
                  G
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    placeholder="Guest player name"
                    value={player.name}
                    onChange={e => updateCustomPlayer(index, 'name', e.target.value)}
                    className="w-full px-4 py-4 rounded-xl bg-white border-2 border-border text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-muted-foreground whitespace-nowrap">Handicap</label>
                    <input
                      type="number"
                      min="0" max="54"
                      value={player.handicap}
                      onChange={e => updateCustomPlayer(index, 'handicap', parseInt(e.target.value) || 0)}
                      className="w-24 px-3 py-3 rounded-xl bg-white border-2 border-border text-foreground text-center font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeCustomPlayer(index)}
                  className="absolute top-4 right-4 p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {totalCount < 4 && (
            <button
              onClick={addCustomPlayer}
              className="w-full py-5 border-2 border-dashed border-primary/30 rounded-2xl text-primary font-bold text-base hover:bg-primary/5 hover:border-primary/50 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Add Guest Player
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-white/80 backdrop-blur-lg border-t border-border mt-auto pb-safe relative z-10">
        <button 
          onClick={handleStart}
          disabled={createRound.isPending}
          className="w-full max-w-2xl mx-auto flex items-center justify-center gap-2 px-6 py-5 rounded-xl font-bold text-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:transform-none transition-all"
        >
          {createRound.isPending ? "Creating..." : "Tee Off"}
          {!createRound.isPending && <Play className="w-5 h-5 fill-current" />}
        </button>
      </div>
    </div>
  );
}
