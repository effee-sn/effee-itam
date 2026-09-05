import { Monitor, Users, BarChart3 } from "lucide-react";

type Settings = { companyName: string; logoPath: string | null };

const FEATURES = [
  { icon: Monitor, title: "Track Assets", subtitle: "Keep accurate inventory records" },
  { icon: Users, title: "Manage Users", subtitle: "Role-based access and permissions" },
  { icon: BarChart3, title: "Generate Reports", subtitle: "Make informed decisions" },
];

/** The company logo, or a red initial badge when no logo is set. */
export function AuthLogo({ settings, className }: { settings: Settings; className?: string }) {
  return settings.logoPath ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={settings.logoPath} alt={settings.companyName} className={className} />
  ) : (
    <span className={`flex items-center justify-center rounded-full bg-red-600 font-bold text-white ${className}`}>
      {settings.companyName.charAt(0)}
    </span>
  );
}

/** The dark left panel shared by the login and change-password screens. */
export function AuthBrandPanel({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b1220] via-[#111c34] to-[#0a1526] p-10 text-white lg:flex xl:p-14">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />

      {/* Brand */}
      <div className="relative flex items-center gap-3">
        <AuthLogo settings={settings} className="h-11 w-11 object-contain" />
        <div>
          <div className="text-lg font-bold leading-tight">{settings.companyName}</div>
          <div className="text-xs text-slate-400">Asset Management</div>
        </div>
      </div>

      {/* Headline */}
      <div className="relative max-w-md">
        <div className="mb-6 h-1 w-12 rounded-full bg-blue-500" />
        <h1 className="text-5xl font-bold leading-[1.05] tracking-tight">
          Keep Your <br />
          <span className="text-blue-500">Assets</span> <br />
          in Control
        </h1>
        <p className="mt-5 text-lg font-medium text-slate-200">Track. Manage. Optimize.</p>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
          A simple and powerful asset management system to streamline your IT and office assets.
        </p>

        <ul className="mt-8 space-y-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-blue-400 ring-1 ring-white/10">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <div className="font-semibold">{f.title}</div>
                  <div className="text-sm text-slate-400">{f.subtitle}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer */}
      <div className="relative text-xs text-slate-500">
        v1.0.0 &nbsp;|&nbsp; © {year} {settings.companyName}. All rights reserved.
      </div>
    </div>
  );
}
