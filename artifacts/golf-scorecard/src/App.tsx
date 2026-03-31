import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import NewRound from "@/pages/NewRound";
import PlayHole from "@/pages/PlayHole";
import ScorecardDetail from "@/pages/ScorecardDetail";
import CourseLayout from "@/pages/CourseLayout";
import Players from "@/pages/Players";
import Sensors from "@/pages/Sensors";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/new" component={NewRound} />
      <Route path="/course" component={CourseLayout} />
      <Route path="/round/:id/hole/:holeNumber" component={PlayHole} />
      <Route path="/scorecard/:id" component={ScorecardDetail} />
      <Route path="/players" component={Players} />
      <Route path="/sensors" component={Sensors} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
