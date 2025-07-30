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
import TaskProfile from "@/pages/TaskProfile";
import Properties from "@/pages/Properties";
import PropertyProfile from "@/pages/PropertyProfile";
import Team from "@/pages/Team";
import People from "@/pages/People";
import PersonProfile from "@/pages/PersonProfile";
import PropertyCenter from "@/pages/PropertyCenter";
import Admin from "@/pages/Admin";
import Account from "@/pages/Account";
import SuperAdmin from "@/pages/SuperAdmin";
import OrganizationProfile from "@/pages/OrganizationProfile";
import Navigation from "@/components/Navigation";
import QuickSearchModal from "@/components/QuickSearchModal";
import QuickAddTaskModal from "@/components/QuickAddTaskModal";
import KeyboardHelpModal from "@/components/KeyboardHelpModal";
import { TaskModalProvider, useTaskModal } from "@/contexts/TaskModalContext";
import { useState } from "react";

// Global Task Modal Component
function GlobalTaskModal() {
  const { isTaskModalOpen, closeTaskModal } = useTaskModal();
  
  return (
    <QuickAddTaskModal 
      isOpen={isTaskModalOpen} 
      onClose={closeTaskModal} 
    />
  );
}

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
          <Route path="/task-profile/:id" component={TaskProfile} />
          <Route path="/properties" component={Properties} />
          <Route path="/property-profile/:id" component={PropertyProfile} />
          <Route path="/team" component={Team} />
          <Route path="/people" component={People} />
          <Route path="/person-profile/:id" component={PersonProfile} />
          <Route path="/property-center" component={PropertyCenter} />
          <Route path="/admin" component={Admin} />
          <Route path="/super-admin" component={Account} />
          <Route path="/dwellerly-admin" component={SuperAdmin} />
          <Route path="/dwellerly-admin/organization/:id" component={OrganizationProfile} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedAppContent() {
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);
  const { openTaskModal } = useTaskModal();

  useHotkeys({
    "s": () => setIsQuickSearchOpen(true),
    "S": () => setIsQuickSearchOpen(true),
    "t": () => openTaskModal(),
    "T": () => openTaskModal(),
    "?": () => setIsKeyboardHelpOpen(true),
    "Escape": () => {
      setIsQuickSearchOpen(false);
      setIsKeyboardHelpOpen(false);
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navigation />
      <div className="flex-1">
        <Router />
      </div>
    
    {/* Footer - Internal Only */}
    <footer className="bg-white border-t border-slate-200 py-4">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="text-sm text-slate-600">
          © 2025 Dwellerly. All rights reserved.
        </div>
        <div className="text-xs">
          <a 
            href="/dwellerly-admin" 
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Internal Platform Management"
          >
            Platform
          </a>
        </div>
      </div>
    </footer>
    
    <QuickSearchModal 
      isOpen={isQuickSearchOpen} 
      onClose={() => setIsQuickSearchOpen(false)} 
    />
    <GlobalTaskModal />
    <KeyboardHelpModal 
      isOpen={isKeyboardHelpOpen} 
      onClose={() => setIsKeyboardHelpOpen(false)} 
    />
    </div>
  );
}

function AuthenticatedApp() {
  return (
    <TaskModalProvider>
      <AuthenticatedAppContent />
    </TaskModalProvider>
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
