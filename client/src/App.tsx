import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useHotkeys } from "@/hooks/useHotkeys";
import { RefreshCw } from "lucide-react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import TaskProfile from "@/pages/TaskProfile";
import Properties from "@/pages/Properties";
import PropertyProfile from "@/pages/PropertyProfile";
import Calendar from "@/pages/Calendar";
import Team from "@/pages/Team";
import TeamMemberProfile from "@/pages/TeamMemberProfile";
import People from "@/pages/People";
import PersonProfile from "@/pages/PersonProfile";
import DuplicatesManagement from "@/pages/DuplicatesManagement";
import PropertyCenter from "@/pages/PropertyCenter";
import PropertyPortalSettings from "@/pages/PropertyPortalSettings";
import AdminClientPortal from "@/pages/AdminClientPortal";
import AdminClientPortalProperty from "@/pages/AdminClientPortalProperty";
import Admin from "@/pages/Admin";
import Account from "@/pages/Account";
import SuperAdmin from "@/pages/SuperAdmin";
import OrganizationProfile from "@/pages/OrganizationProfile";
import AdminBilling from "@/pages/AdminBilling";
import AdminInvoices from "@/pages/AdminInvoices";
import OrgBillingInvoices from "@/pages/OrgBillingInvoices";
import OrgClientInvoices from "@/pages/OrgClientInvoices";
import OrgStripeSettings from "@/pages/OrgStripeSettings";
import Navigation from "@/components/Navigation";
import QuickSearchModal from "@/components/QuickSearchModal";
import QuickAddTaskModal from "@/components/QuickAddTaskModal";
import KeyboardHelpModal from "@/components/KeyboardHelpModal";
import { TaskModalProvider, useTaskModal } from "@/contexts/TaskModalContext";
import { routes } from "@/lib/routes";
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
      {isLoading ? (
        <Route>
          <div className="min-h-screen flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </Route>
      ) : !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route>
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
              <header className="bg-blue-600 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                      <h1 className="text-xl font-bold text-white">Hubify</h1>
                    </div>
                    <div>
                      <Button 
                        onClick={() => window.location.href = "/api/login"}
                        variant="ghost"
                        className="text-white hover:bg-blue-700 hover:text-white"
                      >
                        Login
                      </Button>
                    </div>
                  </div>
                </div>
              </header>
              <div className="max-w-4xl mx-auto px-6 py-16 text-center">
                <h1 className="text-3xl font-bold text-slate-900 mb-4">
                  Please Log In
                </h1>
                <p className="text-lg text-slate-600 mb-8">
                  You need to be logged in to access this page.
                </p>
                <Button 
                  onClick={() => window.location.href = "/api/login"}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Login to Continue
                </Button>
              </div>
            </div>
          </Route>
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/task-profile/:id" component={TaskProfile} />
          <Route path="/properties" component={Properties} />
          <Route path="/property-profile/:id" component={PropertyProfile} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/team" component={Team} />
          <Route path="/team/member/:id" component={TeamMemberProfile} />
          <Route path="/people" component={People} />
          <Route path="/person-profile/:id" component={PersonProfile} />
          <Route path="/duplicates" component={DuplicatesManagement} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/client-portal" component={AdminClientPortal} />
          <Route path="/admin/client-portal/:propertyId" component={AdminClientPortalProperty} />
          <Route path="/admin/billing" component={AdminBilling} />
          <Route path="/admin/invoices" component={AdminInvoices} />
          <Route path="/billing/invoices" component={OrgBillingInvoices} />
          <Route path="/invoices/clients" component={OrgClientInvoices} />
          <Route path="/settings/stripe" component={OrgStripeSettings} />
          
          {/* Backward compatibility redirects */}
          <Route path="/property-center">
            {() => {
              window.location.replace(routes.adminClientPortal());
              return null;
            }}
          </Route>
          <Route path="/properties/:propertyId/portal-settings">
            {(params) => {
              window.location.replace(routes.adminClientPortalSettings(params.propertyId));
              return null;
            }}
          </Route>
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
          © 2025 Hubify. All rights reserved.
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
