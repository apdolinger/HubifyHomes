import { HUBIFY_HOMES_LOGO_URL, HUBIFY_HOMES_LOGO_ALT } from "@/lib/brand";

interface Props {
  status: "not_found" | "pending" | "suspended" | "archived";
  orgName?: string | null;
}

export default function TenantStatusPage({ status, orgName }: Props) {
  const label = orgName ? `"${orgName}"` : "This Hubify workspace";

  const configs: Record<Props["status"], {
    icon: string;
    title: string;
    body: string;
    action: { label: string; href: string } | null;
  }> = {
    not_found: {
      icon: "🔍",
      title: "Workspace Not Found",
      body: `We couldn't find a Hubify workspace at "${orgName}.hubifyhomesonline.com". The address may be incorrect, or this workspace hasn't been set up yet.`,
      action: { label: "Back to hubifyhomesonline.com", href: "https://hubifyhomesonline.com" },
    },
    pending: {
      icon: "⚙️",
      title: "Workspace Setup In Progress",
      body: `${label} is being prepared. This usually takes just a short time. Please check back soon, or contact your account manager if you need help.`,
      action: null,
    },
    suspended: {
      icon: "⚠️",
      title: "Workspace Suspended",
      body: `${label} has been suspended. Please contact Hubify support to restore access.`,
      action: { label: "Contact Support", href: "mailto:support@hubifyhomesonline.com" },
    },
    archived: {
      icon: "🗄️",
      title: "Workspace No Longer Active",
      body: `${label} has been archived and is no longer accessible. Please contact Hubify support if you believe this is an error.`,
      action: { label: "Contact Support", href: "mailto:support@hubifyhomesonline.com" },
    },
  };

  const c = configs[status];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center px-4">
      <img
        src={HUBIFY_HOMES_LOGO_URL}
        alt={HUBIFY_HOMES_LOGO_ALT}
        className="h-12 w-auto mb-10"
      />
      <div className="text-center max-w-md">
        <div className="text-5xl mb-5">{c.icon}</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">{c.title}</h1>
        <p className="text-slate-500 text-base leading-relaxed mb-8">{c.body}</p>
        {c.action && (
          <a
            href={c.action.href}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            {c.action.label}
          </a>
        )}
        {orgName && (
          <p className="mt-6 text-xs text-slate-400 font-mono">
            {orgName}.hubifyhomesonline.com
          </p>
        )}
      </div>
    </div>
  );
}
