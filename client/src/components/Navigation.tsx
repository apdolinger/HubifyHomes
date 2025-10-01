import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/lib/routes";
import { useTaskModal } from "@/contexts/TaskModalContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  Plus
} from "lucide-react";

const getNavigationItems = (user: any) => {
  const baseItems = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Properties", href: "/properties", icon: Building },
    { name: "People", href: "/people", icon: UserCheck },
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
  
  const navigationItems = getNavigationItems(user);

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
                placeholder="Search properties, people, tasks..."
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
                {((user as any)?.role === 'admin' || (user as any)?.role === 'manager') && (
                  <>
                    <DropdownMenuItem onClick={() => window.location.href = routes.adminClientPortal()}>
                      <Home className="w-4 h-4 mr-2" />
                      Client Portal
                    </DropdownMenuItem>
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
                  
                  {/* Admin Section for Mobile */}
                  {((user as any)?.role === 'admin' || (user as any)?.role === 'manager') && (
                    <>
                      <div className="pt-4 mt-4 border-t border-slate-200">
                        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Admin
                        </p>
                      </div>

                      <Link href={routes.adminClientPortal()}>
                        <a
                          className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                            location === routes.adminClientPortal()
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Home className="w-5 h-5 mr-3" />
                          Client Portal
                        </a>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
