import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useIsMobile } from "@/hooks/use-mobile";
import { RefreshCw } from "lucide-react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import TaskProfile from "@/pages/TaskProfile";
import Properties from "@/pages/Properties";
import PropertyProfile from "@/pages/PropertyProfile";
import CommunityProfile from "@/pages/CommunityProfile";
import Calendar from "@/pages/Calendar";
import TimeTracking from "@/pages/TimeTracking";
import Team from "@/pages/Team";
import TeamMemberProfile from "@/pages/TeamMemberProfile";
import People from "@/pages/People";
import PersonProfile from "@/pages/PersonProfile";
import Vendors from "@/pages/Vendors";
import VendorProfile from "@/pages/VendorProfile";
import DuplicatesManagement from "@/pages/DuplicatesManagement";
import TeamMessages from "@/pages/TeamMessages";
import HubifyConsole from "@/pages/HubifyConsole";
import AdminClientPortal from "@/pages/AdminClientPortal";
import AdminClientPortalProperty from "@/pages/AdminClientPortalProperty";
import AdminNoteSearch from "@/pages/AdminNoteSearch";
import AdminEmailTemplates from "@/pages/AdminEmailTemplates";
import AdminForms from "@/pages/AdminForms";
import FormEdit from "@/pages/FormEdit";
import Admin from "@/pages/Admin";
import Account from "@/pages/Account";
import SuperAdmin from "@/pages/SuperAdmin";
import SuperAdminLogin from "@/pages/SuperAdminLogin";
import PortalLogin from "@/pages/PortalLogin";
import PortalRegister from "@/pages/PortalRegister";
import PortalForgotPassword from "@/pages/PortalForgotPassword";
import PortalResetPassword from "@/pages/PortalResetPassword";
import Portal from "@/pages/Portal";
import PortalNotifications from "@/pages/PortalNotifications";
import OrganizationProfile from "@/pages/OrganizationProfile";
import AdminBilling from "@/pages/AdminBilling";
import AdminInvoices from "@/pages/AdminInvoices";
import OrgBillingInvoices from "@/pages/OrgBillingInvoices";
import OrgClientInvoices from "@/pages/OrgClientInvoices";
import OrgStripeSettings from "@/pages/OrgStripeSettings";
import ImportManager from "@/pages/ImportManager";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Billing from "@/pages/Billing";
import PaymentCollectionPage from "@/pages/PaymentCollectionPage";
import InspectionReport from "@/pages/InspectionReport";
import InspectionSchedules from "@/pages/InspectionSchedules";
import Navigation from "@/components/Navigation";
import QuickSearchModal from "@/components/QuickSearchModal";
import QuickAddTaskModal from "@/components/QuickAddTaskModal";
import KeyboardHelpModal from "@/components/KeyboardHelpModal";
import SupportModal from "@/components/SupportModal";
import { GlobalAlertModal } from "@/components/GlobalAlertModal";
import { TaskModalProvider, useTaskModal } from "@/contexts/TaskModalContext";
import { PortalAuthProvider } from "@/contexts/PortalAuthContext";
import { routes } from "@/lib/routes";
import { useState, useEffect } from "react";

// Field Mode imports
import FieldModeLayout from "@/components/FieldModeLayout";
import FieldHome from "@/pages/FieldHome";
import FieldTasks from "@/pages/FieldTasks";
import FieldTaskDetail from "@/pages/FieldTaskDetail";
import FieldProfile from "@/pages/FieldProfile";

// Global Task Modal Component
function GlobalTaskModal() {
  const { isTaskModalOpen, initialData, closeTaskModal } = useTaskModal();
  
  return (
    <QuickAddTaskModal 
      isOpen={isTaskModalOpen} 
      onClose={closeTaskModal}
      initialData={initialData}
    />
  );
}

function FieldModeRouter() {
  return (
    <FieldModeLayout>
      <Switch>
        <Route path="/field" component={FieldHome} />
        <Route path="/field/tasks" component={FieldTasks} />
        <Route path="/field/task/:id" component={FieldTaskDetail} />
        <Route path="/field/profile" component={FieldProfile} />
        <Route component={FieldHome} />
      </Switch>
    </FieldModeLayout>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/super-admin/login" component={SuperAdminLogin} />
      <Route path="/payment-collection/:token" component={PaymentCollectionPage} />
      
      {/* Portal routes (separate auth system) */}
      <Route path="/portal/login" component={PortalLogin} />
      <Route path="/portal/register" component={PortalRegister} />
      <Route path="/portal/forgot-password" component={PortalForgotPassword} />
      <Route path="/portal/reset-password" component={PortalResetPassword} />
      <Route path="/portal/notifications" component={PortalNotifications} />
      <Route path="/portal" component={Portal} />
      
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
          <Route path="/communities/:id" component={CommunityProfile} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/time-tracking" component={TimeTracking} />
          <Route path="/team" component={Team} />
          <Route path="/team/member/:id" component={TeamMemberProfile} />
          <Route path="/people" component={People} />
          <Route path="/person-profile/:id" component={PersonProfile} />
          <Route path="/duplicates" component={DuplicatesManagement} />
          <Route path="/messages" component={TeamMessages} />
          <Route path="/admin" component={Admin} />
          <Route path="/account" component={Account} />
          
          {/* Hubify Console (Admin Back-End) */}
          <Route path="/hubify-console" component={AdminClientPortal} />
          <Route path="/hubify-console/:propertyId" component={AdminClientPortalProperty} />
          
          {/* Admin Routes */}
          <Route path="/admin/import" component={ImportManager} />
          <Route path="/admin/vendors" component={Vendors} />
          <Route path="/admin/vendors/:id" component={VendorProfile} />
          <Route path="/admin/notes/search" component={AdminNoteSearch} />
          <Route path="/admin/email-templates" component={AdminEmailTemplates} />
          <Route path="/admin/forms/:id" component={FormEdit} />
          <Route path="/admin/forms" component={AdminForms} />
          
          {/* Inspection Reports */}
          <Route path="/inspection-report/:taskId" component={InspectionReport} />
          
          {/* Inspection Schedules overview */}
          <Route path="/inspection-schedules" component={InspectionSchedules} />
          
          {/* Billing Routes */}
          <Route path="/billing" component={Billing} />
          <Route path="/admin/billing" component={AdminBilling} />
          <Route path="/admin/invoices" component={AdminInvoices} />
          <Route path="/billing/invoices" component={OrgBillingInvoices} />
          <Route path="/invoices/clients" component={OrgClientInvoices} />
          <Route path="/settings/stripe" component={OrgStripeSettings} />
          
          {/* Backward compatibility redirects */}
          <Route path="/admin/client-portal">
            {() => {
              window.location.replace(routes.hubifyConsole());
              return null;
            }}
          </Route>
          <Route path="/admin/client-portal/:propertyId">
            {(params) => {
              window.location.replace(routes.hubifyConsoleSettings(params.propertyId));
              return null;
            }}
          </Route>
          <Route path="/property-center">
            {() => {
              window.location.replace(routes.hubifyConsole());
              return null;
            }}
          </Route>
          <Route path="/super-admin" component={SuperAdmin} />
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
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const { openTaskModal } = useTaskModal();

  useHotkeys({
    "s": () => setIsQuickSearchOpen(true),
    "S": () => setIsQuickSearchOpen(true),
    "t": () => openTaskModal(),
    "T": () => openTaskModal(),
    "?": () => setIsSupportModalOpen(true),
    "Escape": () => {
      setIsQuickSearchOpen(false);
      setIsKeyboardHelpOpen(false);
      setIsSupportModalOpen(false);
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
          <span className="mx-2">·</span>
          <a href="/privacy" className="text-blue-600 hover:underline" data-testid="link-privacy">
            Privacy Policy
          </a>
          <span className="mx-2">·</span>
          <a href="/terms" className="text-blue-600 hover:underline" data-testid="link-terms">
            Terms of Service
          </a>
        </div>
        <div className="text-xs">
          <a 
            href="/super-admin/login" 
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Super Admin Access"
          >
            Super Admin
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
    <SupportModal 
      isOpen={isSupportModalOpen} 
      onClose={() => setIsSupportModalOpen(false)} 
    />
    <GlobalAlertModal />
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
  const { isFeatureEnabled: isFlagEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();
  const isFieldRoute = location.startsWith("/field");
  const fieldModeEnabled = isFlagEnabled("mobile_field_mode");

  useEffect(() => {
    if (!isAuthenticated || isLoading || flagsLoading) return;
    // If the flag is off, force any user on /field back to the desktop app.
    if (isFieldRoute && !fieldModeEnabled) {
      localStorage.setItem("fieldModeEnabled", "false");
      navigate("/");
      return;
    }
    if (!fieldModeEnabled) return;
    const pref = localStorage.getItem("fieldModeEnabled");
    if (pref === "true" && !isFieldRoute && isMobile) {
      navigate("/field");
    }
  }, [isAuthenticated, isLoading, flagsLoading, isFieldRoute, isMobile, fieldModeEnabled, navigate]);

  return (
    <TooltipProvider>
      <Toaster />
      {isLoading || !isAuthenticated ? (
        <Router />
      ) : isFieldRoute ? (
        <FieldModeRouter />
      ) : (
        <AuthenticatedApp />
      )}
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PortalAuthProvider>
        <AuthWrapper />
      </PortalAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
