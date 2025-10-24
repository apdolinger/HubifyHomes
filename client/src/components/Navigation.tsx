import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/lib/routes";
import { useTaskModal } from "@/contexts/TaskModalContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TimeTrackingDropdownItems } from "@/components/TimeTracking";
import { apiRequest } from "@/lib/queryClient";
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
  Plus,
  Calendar,
  Clock,
  CreditCard,
  Wrench,
  Bell,
  MessageSquare
} from "lucide-react";

const getNavigationItems = (user: any) => {
  const baseItems = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Properties", href: "/properties", icon: Building },
    { name: "Clients", href: "/people", icon: UserCheck },
    { name: "Team", href: "/team", icon: Users },
  ];

  // Add Admin tab for admin and manager users
  if ((user as any)?.role === 'admin' || (user as any)?.role === 'manager') {
    baseItems.push({ name: "Admin", href: "/admin", icon: Settings });
  }

  return baseItems;
};

export default function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { openTaskModal } = useTaskModal();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const navigationItems = getNavigationItems(user);

  // Fetch notification preferences
  const { data: notificationPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["/api/notification-preferences"],
    enabled: isNotificationSettingsOpen && !!(user as any)?.id,
  });

  // Update notification preferences mutation
  const updatePrefsMutation = useMutation({
    mutationFn: async (prefs: { emailOnMention: boolean }) => {
      return await apiRequest("PUT", "/api/notification-preferences", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification preferences.",
        variant: "destructive",
      });
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

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
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
          <div className="flex items-center space-x-4">
            {/* Global Search */}
            <div className="relative hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search properties, clients, tasks..."
                className="w-64 pl-10 pr-12 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                id="globalSearch"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <kbd className="kbd">S</kbd>
              </div>
            </div>

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
                {((user as any)?.role === 'admin' || (user as any)?.role === 'manager') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.location.href = routes.hubifyConsole()}>
                      <Home className="w-4 h-4 mr-2" />
                      Hubify Console
                    </DropdownMenuItem>
                    {(user as any)?.role === 'admin' && (
                      <DropdownMenuItem onClick={() => window.location.href = '/admin/billing'}>
                        <Wrench className="w-4 h-4 mr-2" />
                        Billing Management
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
                  
                  {/* Settings Section for Mobile */}
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

                  {/* Admin Section for Mobile */}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
          </DialogHeader>
          {prefsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Email notifications for @mentions</p>
                  <p className="text-sm text-slate-500">
                    Receive an email when someone mentions you in a team message
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.emailOnMention ?? true}
                  onCheckedChange={(checked) => {
                    updatePrefsMutation.mutate({ emailOnMention: checked });
                  }}
                  disabled={updatePrefsMutation.isPending}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </nav>
  );
}
