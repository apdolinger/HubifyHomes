import { useAuth } from "@/hooks/useAuth";
import { exitFieldMode } from "@/components/FieldModeLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Monitor, LogOut } from "lucide-react";

export default function FieldProfile() {
  const { user } = useAuth();
  const u = user as any;

  const getUserInitials = () => {
    if (u?.firstName && u?.lastName) {
      return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
    }
    return u?.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-slate-900 pt-2">Profile</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center gap-3">
        <Avatar className="w-20 h-20">
          <AvatarImage src={u?.profileImageUrl} alt={u?.firstName} />
          <AvatarFallback className="text-2xl font-bold">{getUserInitials()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-bold text-slate-900">
            {u?.firstName} {u?.lastName}
          </p>
          <p className="text-sm text-slate-500">{u?.email}</p>
          {u?.role && (
            <span className="inline-block mt-2 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 capitalize">
              {u.role}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-12 text-base font-medium"
          onClick={exitFieldMode}
        >
          <Monitor className="w-5 h-5 mr-2" />
          Switch to Desktop Mode
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 text-base font-medium text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => { window.location.href = "/api/logout"; }}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Log Out
        </Button>
      </div>

      <p className="text-center text-xs text-slate-400">
        Field Mode — Hubify © 2025
      </p>
    </div>
  );
}
