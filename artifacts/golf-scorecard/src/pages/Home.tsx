import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Flag, Trophy, Clock, ChevronRight, Trash2 } from "lucide-react";
import { useScorecards, useDeleteRound } from "@/hooks/use-golf";
import { Navigation } from "@/components/Navigation";
import { FORMAT_LABELS } from "@/lib/score-utils";
import type { GameFormat } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { data: scorecards, isLoading } = useScorecards();
  const deleteRound = useDeleteRound();
  const [, setLocation] = useLocation();

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this scorecard?")) {
      deleteRound.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Hero Section */}
      <div className="relative h-72 w-full overflow-hidden rounded-b-[40px] shadow-xl">
        <img 
          src={`${import.meta.env.BASE_URL}images/golf-hero.png`}
          alt="Shelley Point Golf Course"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-primary/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Flag className="w-12 h-12 mb-4 mx-auto text-accent" />
            <h1 className="text-4xl font-display font-bold tracking-tight mb-2 shadow-sm">
              Shelley Point
            </h1>
            <p className="text-primary-foreground/90 font-medium tracking-wide uppercase text-sm">
              Golf Club Scorecard
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">Recent Rounds</h2>
          <Link href="/new" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white/50 h-24 rounded-2xl border border-white/50" />
            ))}
          </div>
        ) : scorecards?.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-border shadow-sm">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-foreground mb-2">No rounds yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Start your first round at Shelley Point to begin tracking your scores.</p>
            <Link 
              href="/new" 
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Start New Round
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {scorecards?.map((scorecard, index) => (
              <motion.div
                key={scorecard.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div 
                  onClick={() => setLocation(`/scorecard/${scorecard.id}`)}
                  className="glass-card rounded-2xl p-4 cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground font-display">
                        {format(new Date(scorecard.date), 'MMMM d, yyyy')}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-muted-foreground font-medium">
                          {scorecard.players.length} Player{scorecard.players.length !== 1 && 's'}
                        </p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          {FORMAT_LABELS[(scorecard.gameFormat as GameFormat) ?? "stroke"]}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex -space-x-2 mr-2">
                      {scorecard.players.slice(0, 3).map((p, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-secondary border-2 border-white flex items-center justify-center text-xs font-bold text-secondary-foreground z-10">
                          {p.name.substring(0, 1).toUpperCase()}
                        </div>
                      ))}
                      {scorecard.players.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-muted border-2 border-white flex items-center justify-center text-xs font-bold text-muted-foreground z-0">
                          +{scorecard.players.length - 3}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={(e) => handleDelete(e, scorecard.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-primary">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      <Navigation />
    </div>
  );
}
