import { Link, useRoute } from "wouter";
import { Home, Plus, Users, Map, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [isHome] = useRoute("/");
  const [isNew] = useRoute("/new");
  const [isCourse] = useRoute("/course");
  const [isPlayers] = useRoute("/players");
  const [isSensors] = useRoute("/sensors");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-border pb-safe">
      <div className="max-w-5xl mx-auto flex justify-around items-center p-4">
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center p-3 rounded-xl transition-all min-w-[80px]",
            isHome ? "text-primary" : "text-muted-foreground hover:text-primary/80 hover:bg-primary/5"
          )}
        >
          <Home className="w-8 h-8 mb-1" />
          <span className="text-xs font-semibold uppercase tracking-wider">Home</span>
        </Link>

        <Link
          href="/course"
          className={cn(
            "flex flex-col items-center p-3 rounded-xl transition-all min-w-[80px]",
            isCourse ? "text-primary" : "text-muted-foreground hover:text-primary/80 hover:bg-primary/5"
          )}
        >
          <Map className="w-8 h-8 mb-1" />
          <span className="text-xs font-semibold uppercase tracking-wider">Course</span>
        </Link>

        <Link
          href="/new"
          className={cn(
            "flex flex-col items-center p-3 rounded-xl transition-all -mt-8 min-w-[80px]",
            isNew ? "text-primary" : "text-muted-foreground"
          )}
        >
          <div className="bg-primary text-primary-foreground p-4 rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all">
            <Plus className="w-9 h-9" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider mt-2">New Round</span>
        </Link>

        <Link
          href="/players"
          className={cn(
            "flex flex-col items-center p-3 rounded-xl transition-all min-w-[80px]",
            isPlayers ? "text-primary" : "text-muted-foreground hover:text-primary/80 hover:bg-primary/5"
          )}
        >
          <Users className="w-8 h-8 mb-1" />
          <span className="text-xs font-semibold uppercase tracking-wider">Players</span>
        </Link>

        <Link
          href="/sensors"
          className={cn(
            "flex flex-col items-center p-3 rounded-xl transition-all min-w-[80px]",
            isSensors ? "text-primary" : "text-muted-foreground hover:text-primary/80 hover:bg-primary/5"
          )}
        >
          <Cpu className="w-8 h-8 mb-1" />
          <span className="text-xs font-semibold uppercase tracking-wider">Sensors</span>
        </Link>
      </div>
    </nav>
  );
}
