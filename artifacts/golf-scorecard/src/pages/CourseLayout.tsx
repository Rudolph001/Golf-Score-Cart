import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Flag, MapPin, Navigation, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHELLEY_POINT_HOLES } from "@/lib/course-data";

function parColor(par: number) {
  if (par === 3) return "bg-blue-100 text-blue-700 border-blue-200";
  if (par === 5) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-green-100 text-green-800 border-green-200";
}

function siColor(si: number) {
  if (si <= 6) return "text-red-600 font-bold";
  if (si <= 12) return "text-amber-600 font-semibold";
  return "text-muted-foreground";
}

// Images from shelleypointcountryclub.co.za/course/ (2025/26 T-marker photos)
// Website lists per physical hole: [first image = front-9 tee, second image = back-9 tee]
// e.g. "Holes 1 & 10" → [image-10][image-2]  → hole 1 uses image 10, hole 10 uses image 2
// Pattern: holes 1-9 → n+9,  holes 10-17 → n-8,  hole 18 → 18
function holeImageUrl(n: number): string {
  if (n <= 9) return `https://shelleypointcountryclub.co.za/wp-content/uploads/2025/11/T-MARKERS-new-2026-${n + 9}.png`;
  if (n === 18) return `https://shelleypointcountryclub.co.za/wp-content/uploads/2025/11/T-MARKERS-new-2026-18.png`;
  return `https://shelleypointcountryclub.co.za/wp-content/uploads/2025/11/T-MARKERS-new-2026-${n - 8}.png`;
}

export default function CourseLayout() {
  const holes = SHELLEY_POINT_HOLES;
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);
  const [zoomedAlt, setZoomedAlt] = useState<string>("");

  const front9 = holes.slice(0, 9);
  const back9 = holes.slice(9, 18);
  const front9Par = front9.reduce((a, h) => a + h.par, 0);
  const back9Par = back9.reduce((a, h) => a + h.par, 0);
  const front9Dist = front9.reduce((a, h) => a + h.distanceMen, 0);
  const back9Dist = back9.reduce((a, h) => a + h.distanceMen, 0);

  const HoleCard = ({ hole }: { hole: typeof holes[0] }) => (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-primary/90 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-display font-bold text-lg">
            {hole.number}
          </div>
          <div>
            <p className="font-display font-bold text-base leading-tight">{hole.name}</p>
          </div>
        </div>
        <div className={cn("px-3 py-1 rounded-full border text-xs font-bold", parColor(hole.par))}>
          Par {hole.par}
        </div>
      </div>

      {/* Hole image */}
      <div
        className="w-full bg-muted/20 overflow-hidden cursor-zoom-in"
        style={{ height: "160px" }}
        onClick={() => {
          setZoomedSrc(holeImageUrl(hole.number));
          setZoomedAlt(`Hole ${hole.number} — ${hole.name}`);
        }}
        title="Click to enlarge"
      >
        <img
          src={holeImageUrl(hole.number)}
          alt={`Hole ${hole.number} — ${hole.name}`}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2 flex-1">
        <div className="flex flex-col items-center justify-center text-center bg-yellow-50 rounded-xl py-2 px-1">
          <Navigation className="w-3.5 h-3.5 text-yellow-600 mb-1 opacity-70" />
          <p className="text-lg font-display font-bold text-yellow-700 leading-none">{hole.distanceMen}</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">Yellow (m)</p>
        </div>

        <div className="flex flex-col items-center justify-center text-center bg-blue-50 rounded-xl py-2 px-1">
          <Navigation className="w-3.5 h-3.5 text-blue-400 mb-1 opacity-70" />
          <p className="text-lg font-display font-bold text-blue-600 leading-none">{hole.distanceLadies}</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">Blue (m)</p>
        </div>

        <div className="flex flex-col items-center justify-center text-center bg-muted/40 rounded-xl py-2 px-1">
          <Flag className="w-3.5 h-3.5 mb-1 opacity-50" />
          <p className={cn("text-lg font-display leading-none", siColor(hole.strokeIndex))}>{hole.strokeIndex}</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">Index</p>
        </div>
      </div>

      {/* GPS coordinates row */}
      <div className="px-4 pb-3 flex flex-col gap-2">
        {hole.description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">{hole.description}</p>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5">
          <MapPin className="w-3 h-3 shrink-0" />
          <span>Pin: {hole.pinLat.toFixed(4)}°, {hole.pinLng.toFixed(4)}°</span>
        </div>
      </div>
    </div>
  );

  const HalfSummary = ({ half, title, totalPar, totalDist }: {
    half: typeof holes;
    title: string;
    totalPar: number;
    totalDist: number;
  }) => (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
        <div className="flex gap-3 text-sm font-semibold text-muted-foreground">
          <span>Par <strong className="text-foreground">{totalPar}</strong></span>
          <span className="text-border">|</span>
          <span><strong className="text-foreground">{totalDist}</strong>m</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {half.map(hole => <HoleCard key={hole.number} hole={hole} />)}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 sm:px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-lg">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="inline-flex items-center text-primary-foreground/80 hover:text-white transition-colors mb-4 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <Flag className="w-6 h-6 opacity-80" />
            <h1 className="text-3xl font-display font-bold">Course Layout</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm">Shelley Point Golf Club — 18 Holes</p>

          {/* Course summary strip */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-2xl px-4 py-3 text-center">
              <p className="text-2xl font-display font-bold">{front9Par + back9Par}</p>
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wide font-semibold">Total Par</p>
            </div>
            <div className="bg-white/10 rounded-2xl px-4 py-3 text-center">
              <p className="text-2xl font-display font-bold">{(front9Dist + back9Dist).toLocaleString()}</p>
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wide font-semibold">Metres (Men)</p>
            </div>
            <div className="bg-white/10 rounded-2xl px-4 py-3 text-center">
              <p className="text-2xl font-display font-bold">18</p>
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wide font-semibold">Holes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 mb-4 flex flex-wrap gap-3 items-center text-xs font-semibold">
        <span className="text-muted-foreground">Stroke Index:</span>
        <span className="text-red-600">1–6 hardest</span>
        <span className="text-amber-600">7–12 medium</span>
        <span className="text-muted-foreground">13–18 easiest</span>
      </div>

      {/* Lightbox */}
      {zoomedSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setZoomedSrc(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            onClick={() => setZoomedSrc(null)}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomedSrc}
            alt={zoomedAlt}
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <p className="absolute bottom-5 left-0 right-0 text-center text-white/70 text-sm font-semibold">{zoomedAlt}</p>
        </div>
      )}

      {/* Holes */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-2">
        <HalfSummary half={front9} title="Front 9" totalPar={front9Par} totalDist={front9Dist} />
        <HalfSummary half={back9} title="Back 9" totalPar={back9Par} totalDist={back9Dist} />
      </div>
    </div>
  );
}
