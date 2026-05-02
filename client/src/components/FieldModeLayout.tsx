import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, ListChecks, Camera, User, Monitor } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FieldModeLayoutProps {
  children: React.ReactNode;
}

export function exitFieldMode() {
  localStorage.setItem("fieldModeEnabled", "false");
  window.location.href = "/";
}

export function enterFieldMode() {
  localStorage.setItem("fieldModeEnabled", "true");
  window.location.href = "/field";
}

export default function FieldModeLayout({ children }: FieldModeLayoutProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Belt-and-suspenders: ask the server whether this org is allowed in Field
  // Mode. If the mobile_field_mode flag is off, /api/field-mode/access returns
  // 403 — we honor that even if the client-side flag map hasn't loaded yet.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/field-mode/access", { credentials: "include" });
        if (cancelled) return;
        if (res.status === 403) {
          localStorage.setItem("fieldModeEnabled", "false");
          toast({
            title: "Field Mode unavailable",
            description: "Your organization has Field Mode disabled.",
          });
          navigate("/");
        }
      } catch {
        // Network errors don't kick the user out; the client-side flag check still applies.
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, toast]);

  const tabs = [
    { label: "Home", href: "/field", icon: Home },
    { label: "My Tasks", href: "/field/tasks", icon: ListChecks },
    { label: "Profile", href: "/field/profile", icon: User },
  ];

  const getUserInitials = () => {
    const u = user as any;
    if (u?.firstName && u?.lastName) {
      return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
    }
    return u?.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto relative">
      {/* Top bar */}
      <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">Hubify</span>
          <span className="text-xs bg-blue-500 rounded-full px-2 py-0.5 font-medium">Field</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
            {getUserInitials()}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom tab navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-slate-200 z-40">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location === tab.href || (tab.href !== "/field" && location.startsWith(tab.href));
            return (
              <Link key={tab.href} href={tab.href}>
                <a className={cn(
                  "flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors",
                  isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                )}>
                  <Icon className={cn("w-6 h-6", isActive && "text-blue-600")} />
                  {tab.label}
                </a>
              </Link>
            );
          })}
        </div>
        {/* Switch to Desktop */}
        <div className="border-t border-slate-100 py-1.5 flex items-center justify-center">
          <button
            onClick={exitFieldMode}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Monitor className="w-3.5 h-3.5" />
            Switch to Desktop
          </button>
        </div>
      </nav>
    </div>
  );
}
