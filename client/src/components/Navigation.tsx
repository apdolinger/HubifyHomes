import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/lib/routes";
import { useTaskModal } from "@/contexts/TaskModalContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimeTrackingDropdownItems } from "@/components/TimeTracking";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { enterFieldMode } from "@/components/FieldModeLayout";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { 
  BarChart3, 
  CheckSquare, 
  Building, 
  Users, 
  UserCheck, 
  Home, 
  Search,
  Menu,
  ChevronDown,
  Settings,
  Calendar,
  Clock,
  CreditCard,
  Wrench,
  Bell,
  MessageSquare,
  DollarSign,
  ClipboardCheck,
  AlertCircle,
  Info,
  CheckCircle2,
  FileText,
  Check,
  Smartphone,
  X
} from "lucide-react";

const getNavigationItems = (user: any) => {
  const baseItems = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Properties", href: "/properties", icon: Building },
    { name: "Clients", href: "/people", icon: UserCheck },
    { name: "Team", href: "/team", icon: Users },
  ];

  if ((user as any)?.role === 'admin' || (user as any)?.role === 'manager') {
    baseItems.push({ name: "Admin", href: "/admin", icon: Settings });
  }

  return baseItems;
};

const notificationTypeConfig: Record<string, { icon: any; color: string; label: string }> = {
  task_assigned: { icon: CheckSquare, color: "text-blue-500", label: "Task Assigned" },
  task_overdue: { icon: AlertCircle, color: "text-red-500", label: "Task Overdue" },
  inspection_due: { icon: ClipboardCheck, color: "text-orange-500", label: "Inspection Due" },
  invoice_due: { icon: FileText, color: "text-yellow-600", label: "Invoice Due" },
  mention: { icon: MessageSquare, color: "text-purple-500", label: "Mention" },
  general: { icon: Info, color: "text-slate-500", label: "Notification" },
};

export default function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { openTaskModal } = useTaskModal();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [showFieldModeBanner, setShowFieldModeBanner] = useState(false);
  const { isFeatureEnabled: isFlagEnabled } = useFeatureFlags();
  const fieldModeEnabled = isFlagEnabled("mobile_field_mode");

  useEffect(() => {
    const pref = localStorage.getItem("fieldModeEnabled");
    if (isMobile && pref === null && fieldModeEnabled) {
      setShowFieldModeBanner(true);
    } else {
      setShowFieldModeBanner(false);
    }
  }, [isMobile, fieldModeEnabled]);

  const dismissBanner = () => {
    localStorage.setItem("fieldModeEnabled", "false");
    setShowFieldModeBanner(false);
  };
  
  const navigationItems = getNavigationItems(user);

  // Unread notification count — polls every 60s
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 60000,
    enabled: !!(user as any)?.id,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Full notification list (loaded when panel opens)
  const { data: notificationList = [], isLoading: notifsLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: isNotificationPanelOpen && !!(user as any)?.id,
    refetchInterval: isNotificationPanelOpen ? 30000 : false,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("PATCH", `/api/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/notifications/read-all", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  // Notification preferences
  const { data: notificationPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["/api/notification-preferences"],
    enabled: isNotificationSettingsOpen && !!(user as any)?.id,
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (prefs: Record<string, boolean>) => {
      return await apiRequest("PUT", "/api/notification-preferences", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({ title: "Settings saved", description: "Your notification preferences have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update notification preferences.", variant: "destructive" });
    },
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getUserInitials = () => {
    if ((user as any)?.firstName && (user as any)?.lastName) {
      return `${(user as any).firstName[0]}${(user as any).lastName[0]}`.toUpperCase();
    }
    return (user as any)?.email?.[0]?.toUpperCase() || "U";
  };

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.linkUrl) {
      window.location.href = notif.linkUrl;
      setIsNotificationPanelOpen(false);
    }
  };

  const notifSettings = [
    { key: "emailOnMention", label: "Mentions", description: "When someone @mentions you in a message" },
    { key: "emailOnBroadcast", label: "Team broadcasts", description: "Org-wide announcement emails" },
    { key: "emailOnTaskAssigned", label: "Task assigned", description: "When a task is assigned to you" },
    { key: "emailOnTaskOverdue", label: "Task overdue", description: "When your tasks pass their due date" },
    { key: "emailOnInspectionDue", label: "Inspection due", description: "Upcoming scheduled inspections" },
    { key: "emailOnInvoiceDue", label: "Invoice due", description: "Client invoices nearing due date" },
    { key: "inAppEnabled", label: "In-app notifications", description: "Show notification bell for alerts" },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      {/* Field Mode Banner */}
      {showFieldModeBanner && (
        <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Smartphone className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate">Try Field Mode for a better mobile experience</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={enterFieldMode}
              className="text-xs font-semibold bg-white text-blue-600 rounded-full px-3 py-1 hover:bg-blue-50 transition-colors"
            >
              Try it
            </button>
            <button onClick={dismissBanner} className="text-blue-200 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-xl font-bold text-slate-800 cursor-pointer">
                  Hubify
                </h1>
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <Link key={item.name} href={item.href}>
                    <a
                      className={
                        isActive
                          ? "nav-link-active"
                          : "nav-link"
                      }
                    >
                      <Icon className="w-4 h-4 mr-2 inline" />
                      {item.name}
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Global Search and User Menu */}
          <div className="flex items-center space-x-2">
            {/* Global Search */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("hubify:open-quick-search"))}
              onFocus={() => window.dispatchEvent(new CustomEvent("hubify:open-quick-search"))}
              className="relative hidden sm:flex items-center w-64 pl-10 pr-16 py-2 border border-slate-300 rounded-lg text-sm text-slate-400 hover:bg-slate-50 hover:border-slate-400 transition-colors text-left"
              id="globalSearch"
              data-testid="button-global-search"
              aria-label="Open quick search (S or Ctrl/Cmd+K)"
            >
              <Search className="absolute left-3 h-4 w-4 text-slate-400" />
              <span>Search...</span>
              <kbd className="kbd absolute right-3 text-[10px]" aria-hidden="true">⌘K</kbd>
            </button>

            {/* Notification Bell */}
            <Sheet open={isNotificationPanelOpen} onOpenChange={setIsNotificationPanelOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between">
                  <SheetTitle className="text-base">Notifications</SheetTitle>
                  {notificationList.some((n: any) => !n.isRead) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 text-blue-600 hover:text-blue-700"
                      onClick={() => markAllReadMutation.mutate()}
                      disabled={markAllReadMutation.isPending}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-65px)]">
                  {notifsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : notificationList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <CheckCircle2 className="w-10 h-10 text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-600">All caught up!</p>
                      <p className="text-xs text-slate-400 mt-1">No notifications yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notificationList.map((notif: any) => {
                        const config = notificationTypeConfig[notif.type] || notificationTypeConfig.general;
                        const Icon = config.icon;
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                              !notif.isRead ? "bg-blue-50/50" : ""
                            }`}
                          >
                            <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-medium truncate ${!notif.isRead ? "text-slate-900" : "text-slate-700"}`}>
                                  {notif.title}
                                </p>
                                {!notif.isRead && (
                                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.body}</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {getUserInitials()}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <TimeTrackingDropdownItems />
                <DropdownMenuItem onClick={() => window.location.href = '/messages'}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/calendar'}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Calendar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/time-tracking'}>
                  <Clock className="w-4 h-4 mr-2" />
                  Time Tracking
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/settings/stripe'}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Stripe Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsNotificationSettingsOpen(true)}>
                  <Bell className="w-4 h-4 mr-2" />
                  Notification Settings
                </DropdownMenuItem>
                {fieldModeEnabled && (
                  <DropdownMenuItem onClick={enterFieldMode}>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Field Mode
                  </DropdownMenuItem>
                )}
                {((user as any)?.role === 'admin' || (user as any)?.role === 'manager') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.location.href = routes.hubifyConsole()}>
                      <Home className="w-4 h-4 mr-2" />
                      Hubify Console
                    </DropdownMenuItem>
                    {(user as any)?.role === 'admin' && (
                      <DropdownMenuItem onClick={() => window.location.href = '/admin?tab=billing'}>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Billing
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="mt-6 space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.href;
                    
                    return (
                      <Link key={item.name} href={item.href}>
                        <a
                          className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                            isActive
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Icon className="w-5 h-5 mr-3" />
                          {item.name}
                        </a>
                      </Link>
                    );
                  })}
                  
                  <div className="pt-4 mt-4 border-t border-slate-200">
                    <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Settings
                    </p>
                  </div>
                  
                  <Link href="/settings/stripe">
                    <a
                      className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                        location === '/settings/stripe'
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <CreditCard className="w-5 h-5 mr-3" />
                      Stripe Settings
                    </a>
                  </Link>

                  {((user as any)?.role === 'admin' || (user as any)?.role === 'manager') && (
                    <>
                      <div className="pt-4 mt-4 border-t border-slate-200">
                        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Admin
                        </p>
                      </div>

                      <Link href={routes.hubifyConsole()}>
                        <a
                          className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                            location === routes.hubifyConsole()
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Home className="w-5 h-5 mr-3" />
                          Hubify Console
                        </a>
                      </Link>
                      
                      {(user as any)?.role === 'admin' && (
                        <Link href="/admin/billing">
                          <a
                            className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                              location === '/admin/billing'
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Wrench className="w-5 h-5 mr-3" />
                            Billing Management
                          </a>
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Notification Settings Dialog */}
      <Dialog open={isNotificationSettingsOpen} onOpenChange={setIsNotificationSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
          </DialogHeader>
          {prefsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {notifSettings.map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-slate-500">{description}</p>
                  </div>
                  <Switch
                    checked={(notificationPrefs as any)?.[key] ?? true}
                    onCheckedChange={(checked) => {
                      updatePrefsMutation.mutate({ [key]: checked });
                    }}
                    disabled={updatePrefsMutation.isPending}
                  />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </nav>
  );
}
