import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Calendar, TrendingUp, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/plan", label: "Plan", icon: Calendar },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const HIDE_NAV_ON = ["/", "/onboarding", "/workout"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideNav = HIDE_NAV_ON.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background text-foreground">
      <main className={cn("flex-1", !hideNav && "pb-24")}>{children}</main>
      {!hideNav && (
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="flex items-stretch justify-around px-2 py-2">
            {TABS.map((tab) => {
              const active = pathname === tab.to || pathname.startsWith(tab.to + "/");
              const Icon = tab.icon;
              return (
                <li key={tab.to} className="flex-1">
                  <Link
                    to={tab.to}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_var(--primary)]")} strokeWidth={active ? 2.4 : 1.8} />
                    <span>{tab.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}