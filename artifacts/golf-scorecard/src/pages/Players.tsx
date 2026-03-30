import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Pencil, Trash2, Check, X, Users } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { usePlayers } from "@/hooks/use-golf";
import { cn } from "@/lib/utils";

export default function Players() {
  const { players, addPlayer, updatePlayer, removePlayer } = usePlayers();

  // New player form state
  const [newName, setNewName] = useState("");
  const [newHandicap, setNewHandicap] = useState(18);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editHandicap, setEditHandicap] = useState(0);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addPlayer(trimmed, newHandicap);
    setNewName("");
    setNewHandicap(18);
  };

  const startEdit = (id: string, name: string, handicap: number) => {
    setEditingId(id);
    setEditName(name);
    setEditHandicap(handicap);
  };

  const commitEdit = () => {
    if (editingId) {
      updatePlayer(editingId, editName, editHandicap);
      setEditingId(null);
    }
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-primary text-primary-foreground pt-12 pb-8 px-4 sm:px-6 rounded-b-[2.5rem] shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Users className="w-7 h-7 opacity-80" />
            <h1 className="text-3xl font-display font-bold">Players</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm font-medium">
            Manage your player roster — handicaps auto-update after each round
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-6 space-y-5">

        {/* Add player card */}
        <div className="glass-card rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-foreground mb-4 font-display">Add New Player</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Name</label>
              <input
                type="text"
                placeholder="Player name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-border text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
            <div className="w-24">
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Handicap</label>
              <input
                type="number"
                min={0}
                max={54}
                value={newHandicap}
                onChange={e => setNewHandicap(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-border text-foreground text-center font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Player list */}
        {players.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm">No players yet</p>
            <p className="text-xs mt-1">Add players above to build your roster</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              {players.length} player{players.length !== 1 ? "s" : ""}
            </p>
            <AnimatePresence initial={false}>
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.18 }}
                  className="glass-card rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3"
                >
                  {editingId === player.id ? (
                    // ── Inline edit mode ──
                    <>
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" ? commitEdit() : e.key === "Escape" && cancelEdit()}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white border-2 border-primary text-foreground font-medium focus:outline-none text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        max={54}
                        value={editHandicap}
                        onChange={e => setEditHandicap(parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1.5 rounded-xl bg-white border-2 border-primary text-foreground text-center font-bold focus:outline-none text-sm"
                      />
                      <button onClick={commitEdit} className="p-2 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEdit} className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    // ── Display mode ──
                    <>
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{player.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">
                          Handicap <span className="font-bold text-foreground">{player.handicap}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => startEdit(player.id, player.name, player.handicap)}
                        className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removePlayer(player.id)}
                        className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}
