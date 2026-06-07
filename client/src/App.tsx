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
import DispatchCenter from "@/pages/DispatchCenter";
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
import StaffLogin from "@/pages/StaffLogin";
import StaffForgotPassword from "@/pages/StaffForgotPassword";
import StaffResetPassword from "@/pages/StaffResetPassword";
import PortalLogin from "@/pages/PortalLogin";
import PortalRegister from "@/pages/PortalRegister";
import PortalForgotPassword from "@/pages/PortalForgotPassword";
import PortalResetPassword from "@/pages/PortalResetPassword";
import Portal from "@/pages/Portal";
import PortalPropertyDetail from "@/pages/PortalPropertyDetail";
import PortalNotifications from "@/pages/PortalNotifications";
import PortalInspectionReport from "@/pages/PortalInspectionReport";
import OrganizationProfile from "@/pages/OrganizationProfile";
import AdminBilling from "@/pages/AdminBilling";
import AdminInvoices from "@/pages/AdminInvoices";
import AdminPdfMockups from "@/pages/AdminPdfMockups";
import AdminEmbedPreview from "@/pages/AdminEmbedPreview";
import OrgBillingInvoices from "@/pages/OrgBillingInvoices";
import OrgClientInvoices from "@/pages/OrgClientInvoices";
import OrgStripeSettings from "@/pages/OrgStripeSettings";
import ImportManager from "@/pages/ImportManager";
import ServiceCatalog from "@/pages/ServiceCatalog";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Submissions from "@/pages/Submissions";
import Contact from "@/pages/Contact";
import Signup from "@/pages/Signup";
import Billing from "@/pages/Billing";
import PaymentCollectionPage from "@/pages/PaymentCollectionPage";
import OnboardingPortal from "@/pages/OnboardingPortal";
import SetupAccount from "@/pages/SetupAccount";
import InspectionReport from "@/pages/InspectionReport";
import InspectionSchedules from "@/pages/InspectionSchedules";
import InspectionTemplates from "@/pages/InspectionTemplates";
import InspectionTemplateEditor from "@/pages/InspectionTemplateEditor";
import VisitCompletion from "@/pages/VisitCompletion";
import SetupChecklist from "@/pages/SetupChecklist";
import ReviewDashboard from "@/pages/ReviewDashboard";
import ReviewSettings from "@/pages/ReviewSettings";
import TestimonialsLibrary from "@/pages/TestimonialsLibrary";
import SatisfactionSurveyPage from "@/pages/SatisfactionSurveyPage";
import ReviewRequestPage from "@/pages/ReviewRequestPage";
import Navigation from "@/components/Navigation";
import QuickSearchModal from "@/components/QuickSearchModal";
import QuickAddTaskModal from "@/components/QuickAddTaskModal";
import KeyboardHelpModal from "@/components/KeyboardHelpModal";
import SupportModal from "@/components/SupportModal";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { openCookiePreferences, prefStorage } from "@/lib/cookieConsent";
import { HUBIFY_HOMES_LOGO_URL, HUBIFY_HOMES_LOGO_ALT } from "@/lib/brand";
import { GlobalAlertModal } from "@/components/GlobalAlertModal";
import { TaskModalProvider, useTaskModal } from "@/contexts/TaskModalContext";
import { PortalAuthProvider } from "@/contexts/PortalAuthContext";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import TenantStatusPage from "@/pages/TenantStatusPage";
import { routes } from "@/lib/routes";
import { useState, useEffect } from "react";

// Field Mode imports
import FieldModeLayout from "@/components/FieldModeLayout";
import FieldHome from "@/pages/FieldHome";
import FieldTasks from "@/pages/FieldTasks";
import FieldTaskDetail from "@/pages/FieldTaskDetail";
import FieldProfile from "@/pages/FieldProfile";
import FieldPropertyDetail from "@/pages/FieldPropertyDetail";

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
        <Route path="/field/property/:id" component={FieldPropertyDetail} />
        <Route path="/field/profile" component={FieldProfile} />
        <Route component={FieldHome} />
      </Switch>
    </FieldModeLayout>
  );
}

function NoOrgPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">No organization assigned</h1>
        <p className="text-sm text-slate-500 mb-1">
          Your account ({(user as any)?.email ?? "unknown"}) is not linked to any organization.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Contact your administrator to be added to a team.
        </p>
        <a
          href="/api/logout"
          className="inline-flex items-center justify-center rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-5 py-2.5 transition-colors"
        >
          Sign out
        </a>
      </div>
    </div>
  );
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/super-admin/login" component={SuperAdminLogin} />
      <Route path="/super-admin" component={SuperAdmin} />
      <Route path="/payment-collection/:token" component={PaymentCollectionPage} />
      <Route path="/onboarding/:token" component={OnboardingPortal} />
      <Route path="/setup-account/:token" component={SetupAccount} />
      <Route path="/r/satisfaction/:token" component={SatisfactionSurveyPage} />
      <Route path="/r/review/:token" component={ReviewRequestPage} />
      <Route path="/submit" component={Submissions} />
      <Route path="/inquire">{() => { window.location.replace("/submit"); return null; }}</Route>
      <Route path="/contact" component={Contact} />
      <Route path="/signup" component={Signup} />
      
      {/* Portal routes (separate auth system) */}
      <Route path="/staff/login" component={StaffLogin} />
      <Route path="/staff/forgot-password" component={StaffForgotPassword} />
      <Route path="/staff/reset-password" component={StaffResetPassword} />
      <Route path="/portal/login" component={PortalLogin} />
      <Route path="/portal/register" component={PortalRegister} />
      <Route path="/portal/forgot-password" component={PortalForgotPassword} />
      <Route path="/portal/reset-password" component={PortalResetPassword} />
      <Route path="/portal/notifications" component={PortalNotifications} />
      <Route path="/portal/properties/:id" component={PortalPropertyDetail} />
      <Route path="/portal/inspections/:id" component={PortalInspectionReport} />
      <Route path="/portal" component={Portal} />
      
      {isLoading ? (
        <Route>
          <div className="min-h-screen flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        </Route>
      ) : !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route>
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
              <header className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                      <img
                        src={HUBIFY_HOMES_LOGO_URL}
                        alt={HUBIFY_HOMES_LOGO_ALT}
                        className="h-9 w-auto"
                      />
                    </div>
                    <div>
                      <Button 
                        onClick={() => window.location.href = "/staff/login"}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
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
                  onClick={() => window.location.href = "/staff/login"}
                  className="bg-teal-600 hover:bg-teal-700"
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
          {isFeatureEnabled("community_profiles") && (
            <Route path="/communities/:id" component={CommunityProfile} />
          )}
          <Route path="/calendar" component={Calendar} />
          <Route path="/dispatch" component={DispatchCenter} />
          {isFeatureEnabled("task_cost_tracking") && (
            <Route path="/time-tracking" component={TimeTracking} />
          )}
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
          <Route path="/admin/reviews/settings" component={ReviewSettings} />
          <Route path="/admin/reviews/testimonials" component={TestimonialsLibrary} />
          <Route path="/admin/reviews" component={ReviewDashboard} />
          <Route path="/admin/import" component={ImportManager} />
          <Route path="/admin/services" component={ServiceCatalog} />
          <Route path="/admin/vendors" component={Vendors} />
          <Route path="/admin/vendors/:id" component={VendorProfile} />
          <Route path="/admin/notes/search" component={AdminNoteSearch} />
          <Route path="/admin/email-templates" component={AdminEmailTemplates} />
          <Route path="/admin/pdf-mockups" component={AdminPdfMockups} />
          <Route path="/admin/embed-preview" component={AdminEmbedPreview} />
          <Route path="/admin/forms/:id" component={FormEdit} />
          <Route path="/admin/forms" component={AdminForms} />
          
          {/* Inspection Reports */}
          <Route path="/inspection-report/:taskId" component={InspectionReport} />
          
          {/* Inspection Schedules overview */}
          <Route path="/inspection-schedules" component={InspectionSchedules} />

          {/* Inspection Template Builder */}
          <Route path="/admin/inspection-templates/:id" component={InspectionTemplateEditor} />
          <Route path="/admin/inspection-templates" component={InspectionTemplates} />

          {/* Visit Completion */}
          <Route path="/visit/:taskId" component={VisitCompletion} />
          
          {/* Billing Routes */}
          <Route path="/billing" component={Billing} />
          <Route path="/admin/billing" component={AdminBilling} />
          <Route path="/admin/invoices" component={AdminInvoices} />
          <Route path="/billing/invoices" component={OrgBillingInvoices} />
          <Route path="/invoices/clients" component={OrgClientInvoices} />
          <Route path="/settings/stripe" component={OrgStripeSettings} />
          <Route path="/setup" component={SetupChecklist} />
          
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

  useEffect(() => {
    const openSearch = () => setIsQuickSearchOpen(true);
    window.addEventListener("hubify:open-quick-search", openSearch);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setIsQuickSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("hubify:open-quick-search", openSearch);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const [location] = useLocation();
  const isOnboarding = location.startsWith("/onboarding/");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {!isOnboarding && <Navigation />}
      <div className="flex-1">
        <Router />
      </div>
    
    {/* Footer - Internal Only (hidden during onboarding flow) */}
    {!isOnboarding && <footer className="bg-white border-t border-slate-200 py-4">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="text-sm text-slate-600">
          © {new Date().getFullYear()} Hubify. All rights reserved.
          <span className="mx-2">·</span>
          <a href="/privacy" className="text-teal-600 hover:underline" data-testid="link-privacy">
            Privacy Policy
          </a>
          <span className="mx-2">·</span>
          <a href="/terms" className="text-teal-600 hover:underline" data-testid="link-terms">
            Terms of Service
          </a>
          <span className="mx-2">·</span>
          <button
            type="button"
            onClick={openCookiePreferences}
            className="text-teal-600 hover:underline"
            data-testid="link-cookie-preferences"
          >
            Cookie preferences
          </button>
        </div>
        <div className="text-xs text-slate-400">
          v{new Date().getFullYear()}
        </div>
      </div>
    </footer>}
    
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
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isFeatureEnabled: isFlagEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();
  const isFieldRoute = location.startsWith("/field");
  const fieldModeEnabled = isFlagEnabled("mobile_field_mode");
  const isSuperAdmin = !isLoading && isAuthenticated && (user as any)?.isSuperAdmin;
  const isOnSuperAdminRoute = location.startsWith("/super-admin");
  // Public and token-based routes must never be interrupted by the Super Admin
  // redirect — they identify the intended recipient via a URL token, not by the
  // browser session, so an active Super Admin session must not hijack them.
  const isPublicOrTokenRoute =
    location === "/" ||
    location.startsWith("/onboarding/") ||
    location.startsWith("/payment-collection/") ||
    location.startsWith("/r/") ||
    location.startsWith("/portal") ||
    location === "/staff/login" ||
    location === "/staff/forgot-password" ||
    location === "/staff/reset-password" ||
    location === "/privacy" ||
    location === "/terms" ||
    location === "/submit" ||
    location === "/inquire" ||
    location === "/contact" ||
    location === "/signup";
  const shouldRedirectSuperAdmin = isSuperAdmin && !isOnSuperAdminRoute && !isPublicOrTokenRoute;

  useEffect(() => {
    // Super Admin sessions belong in the Super Admin panel, not the staff dashboard.
    // Public/token routes are exempt — they identify recipients via URL tokens.
    if (shouldRedirectSuperAdmin) {
      navigate("/super-admin");
      return;
    }
    if (!isAuthenticated || isLoading || flagsLoading) return;
    // If the flag is off, force any user on /field back to the desktop app.
    if (isFieldRoute && !fieldModeEnabled) {
      prefStorage.setItem("fieldModeEnabled", "false");
      navigate("/");
      return;
    }
    if (!fieldModeEnabled) return;
    const pref = prefStorage.getItem("fieldModeEnabled");
    if (pref === "true" && !isFieldRoute && isMobile) {
      navigate("/field");
    }
  }, [isAuthenticated, isLoading, flagsLoading, isFieldRoute, isMobile, fieldModeEnabled, navigate, shouldRedirectSuperAdmin]);

  // Prevent any flash of the staff dashboard while the redirect fires.
  if (shouldRedirectSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Authenticated user with no org and not a super admin → gate page.
  const hasNoOrg = !isLoading && isAuthenticated && !(user as any)?.orgId && !isSuperAdmin;

  return (
    <TaskModalProvider>
      <TooltipProvider>
        <Toaster />
        {isLoading || !isAuthenticated || isSuperAdmin || isPublicOrTokenRoute ? (
          <Router />
        ) : hasNoOrg ? (
          <NoOrgPage />
        ) : isFieldRoute ? (
          <FieldModeRouter />
        ) : (
          <AuthenticatedApp />
        )}
        <CookieConsentBanner />
      </TooltipProvider>
    </TaskModalProvider>
  );
}

function TenantGate({ children }: { children: React.ReactNode }) {
  const { tenant, isLoading } = useTenant();

  // Still resolving tenant — show spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // On a subdomain that maps to a real org — gate on orgStatus
  if (!tenant.isPublicDomain && tenant.subdomain) {
    if (!tenant.found) {
      return <TenantStatusPage status="not_found" orgName={tenant.subdomain} />;
    }
    if (tenant.orgStatus === "suspended") {
      return <TenantStatusPage status="suspended" orgName={tenant.name ?? tenant.subdomain} />;
    }
    if (tenant.orgStatus === "archived") {
      return <TenantStatusPage status="archived" orgName={tenant.name ?? tenant.subdomain} />;
    }
    if (tenant.orgStatus === "pending" || tenant.orgStatus === "onboarding") {
      return <TenantStatusPage status="pending" orgName={tenant.name ?? tenant.subdomain} />;
    }
  }

  return <>{children}</>;
}

import { Component, type ErrorInfo, type ReactNode } from "react";

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary] Uncaught render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "#f9fafb",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "40px 48px",
              textAlign: "center",
              boxShadow: "0 2px 16px rgba(0,0,0,.08)",
              maxWidth: 480,
            }}
          >
            <h1 style={{ fontSize: "1.25rem", color: "#111", margin: "0 0 8px" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#6b7280", margin: "0 0 4px", fontSize: ".9rem" }}>
              {this.state.error.message}
            </p>
            <p style={{ color: "#9ca3af", margin: "0 0 24px", fontSize: ".8rem", fontFamily: "monospace" }}>
              {this.state.error.stack?.split("\n")[1]?.trim()}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href="/super-admin/clear-session"
                style={{
                  background: "#4f46e5",
                  color: "#fff",
                  padding: "8px 20px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: ".9rem",
                  fontWeight: 500,
                }}
              >
                Clear session &amp; reload
              </a>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "#e5e7eb",
                  color: "#374151",
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: ".9rem",
                  fontWeight: 500,
                }}
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <TenantGate>
            <PortalAuthProvider>
              <AuthWrapper />
            </PortalAuthProvider>
          </TenantGate>
        </TenantProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
