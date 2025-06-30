import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useHotkeys } from "@/hooks/useHotkeys";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Properties from "@/pages/Properties";
import Team from "@/pages/Team";
import People from "@/pages/People";
import PropertyCenter from "@/pages/PropertyCenter";
import Navigation from "@/components/Navigation";
import QuickSearchModal from "@/components/QuickSearchModal";
import QuickAddTaskModal from "@/components/QuickAddTaskModal";
import KeyboardHelpModal from "@/components/KeyboardHelpModal";
import { useState } from "react";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/properties" component={Properties} />
          <Route path="/team" component={Team} />
          <Route path="/people" component={People} />
          <Route path="/property-center" component={PropertyCenter} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [isQuickAddTaskOpen, setIsQuickAddTaskOpen] = useState(false);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);

  useHotkeys({
    " ": () => setIsQuickSearchOpen(true),
    "t": () => setIsQuickAddTaskOpen(true),
    "T": () => setIsQuickAddTaskOpen(true),
    "?": () => setIsKeyboardHelpOpen(true),
    "Escape": () => {
      setIsQuickSearchOpen(false);
      setIsQuickAddTaskOpen(false);
      setIsKeyboardHelpOpen(false);
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <Router />
      
      <QuickSearchModal 
        isOpen={isQuickSearchOpen} 
        onClose={() => setIsQuickSearchOpen(false)} 
      />
      <QuickAddTaskModal 
        isOpen={isQuickAddTaskOpen} 
        onClose={() => setIsQuickAddTaskOpen(false)} 
      />
      <KeyboardHelpModal 
        isOpen={isKeyboardHelpOpen} 
        onClose={() => setIsKeyboardHelpOpen(false)} 
      />
    </div>
  );
}

function AuthWrapper() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <TooltipProvider>
      <Toaster />
      {isLoading || !isAuthenticated ? (
        <Router />
      ) : (
        <AuthenticatedApp />
      )}
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthWrapper />
    </QueryClientProvider>
  );
}

export default App;
