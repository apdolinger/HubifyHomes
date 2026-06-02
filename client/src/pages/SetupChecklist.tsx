import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Building2,
  Image,
  Palette,
  CreditCard,
  Webhook,
  Home,
  Users,
  Mail,
  ClipboardCheck,
  FileText,
  ArrowRight,
  Rocket,
  PartyPopper,
  ChevronLeft,
} from "lucide-react";

type ChecklistItem = {
  key: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
  icon: string;
};

type BetaChecklist = {
  items: ChecklistItem[];
  completedCount: number;
  total: number;
  percentage: number;
  nextItem: ChecklistItem | null;
  isComplete: boolean;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Image,
  Palette,
  CreditCard,
  Webhook,
  Home,
  Users,
  Mail,
  ClipboardCheck,
  FileText,
};

function ProgressRing({ percentage }: { percentage: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;
  const isComplete = percentage === 100;

  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="drop-shadow-sm">
      <circle cx="64" cy="64" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke={isComplete ? "#10b981" : "#0d9488"}
        strokeWidth="10"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="64"
        y="58"
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fill={isComplete ? "#10b981" : "#0f172a"}
      >
        {percentage}%
      </text>
      <text
        x="64"
        y="78"
        textAnchor="middle"
        fontSize="11"
        fill="#64748b"
      >
        complete
      </text>
    </svg>
  );
}

function ItemIcon({ name, done }: { name: string; done: boolean }) {
  const Icon = ICON_MAP[name] ?? Circle;
  return (
    <div
      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        done ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
      }`}
    >
      <Icon className="w-4 h-4" />
    </div>
  );
}

export default function SetupChecklist() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const orgId = (user as any)?.orgId;

  const { data, isLoading } = useQuery<BetaChecklist>({
    queryKey: ["/api/orgs", orgId, "beta-checklist"],
    queryFn: async () => {
      const res = await fetch(`/api/orgs/${orgId}/beta-checklist`);
      if (!res.ok) throw new Error("Failed to load checklist");
      return res.json();
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading checklist…</div>
      </div>
    );
  }

  const { items, completedCount, total, percentage, nextItem, isComplete } = data;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to dashboard
        </button>

        {isComplete ? (
          <Card className="mb-6 border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <PartyPopper className="w-10 h-10 flex-shrink-0 opacity-90" />
              <div>
                <h2 className="text-xl font-semibold">Ready for Beta Use!</h2>
                <p className="text-emerald-100 text-sm mt-0.5">
                  Your organization is fully configured and ready for beta testing with real clients.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Rocket className="w-5 h-5 text-teal-600" />
              <h1 className="text-xl font-semibold text-slate-900">Getting Beta-Ready</h1>
            </div>
            <p className="text-slate-500 text-sm ml-7">
              Complete these steps to unlock the full Hubify experience for your team and clients.
            </p>
          </div>
        )}

        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <ProgressRing percentage={percentage} />
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-slate-900 leading-none">
                  {completedCount} <span className="text-slate-400 font-normal text-base">of {total}</span>
                </div>
                <div className="text-slate-500 text-sm mt-1">steps complete</div>
                <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${percentage}%`,
                      background: isComplete
                        ? "linear-gradient(90deg, #10b981, #059669)"
                        : "linear-gradient(90deg, #0d9488, #0891b2)",
                    }}
                  />
                </div>
                {!isComplete && nextItem && (
                  <div className="mt-3 text-xs text-slate-500">
                    Next:{" "}
                    <span className="font-medium text-slate-700">{nextItem.label}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {!isComplete && nextItem && (
          <Card className="mb-6 border-teal-200 bg-teal-50/60 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ArrowRight className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">
                    Recommended next step
                  </div>
                  <div className="font-semibold text-slate-900">{nextItem.label}</div>
                  <div className="text-sm text-slate-600 mt-0.5">{nextItem.description}</div>
                  <Button
                    size="sm"
                    className="mt-3 bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => setLocation(nextItem.href)}
                  >
                    Go now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">Setup checklist</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const isNext = !isComplete && nextItem?.key === item.key;
                return (
                  <li key={item.key} className={`px-5 py-4 ${isNext ? "bg-teal-50/40" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 flex items-center justify-center">
                        {item.done ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                            <span className="text-[9px] text-slate-400 font-semibold">{idx + 1}</span>
                          </div>
                        )}
                      </div>
                      <ItemIcon name={item.icon} done={item.done} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${item.done ? "text-slate-500 line-through" : "text-slate-900"}`}>
                          {item.label}
                        </div>
                        {!item.done && (
                          <div className="text-xs text-slate-500 mt-0.5 leading-snug">{item.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.done ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[11px]">
                            Done
                          </Badge>
                        ) : isNext ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                            onClick={() => setLocation(item.href)}
                          >
                            Go <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        ) : (
                          <button
                            className="text-xs text-slate-400 hover:text-teal-600 transition-colors"
                            onClick={() => setLocation(item.href)}
                          >
                            Go →
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {isComplete && (
              <div className="px-5 py-4 border-t border-slate-100 bg-emerald-50/60 text-center">
                <span className="text-sm text-emerald-700 font-medium">
                  🎉 All steps complete — you're ready for beta!
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
