import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Bell, Globe, Ruler, Moon, Sun, Target, Database, LogOut, Shield } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile - Atlas" }] }),
  component: Profile,
});

function Profile() {
  const { theme, toggle } = useTheme();
  return (
    <div className="px-5 pb-6 pt-8">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-[var(--shadow-glow)]">A</div>
        <div>
          <h1 className="text-2xl font-bold">Alex Carter</h1>
          <p className="text-sm text-muted-foreground">Intermediate · Push/Pull/Legs</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4">
        <Stat label="Workouts" value="47" />
        <Stat label="Hours" value="52" />
        <Stat label="Streak" value="6w" />
      </div>

      <Section title="Goals & program">
        <Row icon={Target} label="Primary goal" value="Build muscle" />
        <Row icon={Ruler} label="Units" value="Metric (kg, cm)" />
      </Section>

      <Section title="Preferences">
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-4 transition-colors hover:bg-card/70"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </div>
          <span className="flex-1 text-left text-sm font-medium">Theme</span>
          <span className="text-sm text-muted-foreground capitalize">{theme}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <Row icon={Globe} label="Language" value="English" />
        <Row icon={Bell} label="Notifications" value="On" />
      </Section>

      <Section title="Account">
        <Row icon={Shield} label="Privacy & data" />
        <Row icon={Database} label="Reset progress" tone="warning" />
        <Link to="/" className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-4 text-destructive transition-colors hover:bg-card/70">
          <LogOut className="h-5 w-5" />
          <span className="flex-1 text-left text-sm font-medium">Sign out</span>
        </Link>
      </Section>

      <p className="mt-8 text-center text-xs text-muted-foreground">Atlas v0.1 · Account, backend & sync wired up in next pass.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value, tone }: { icon: any; label: string; value?: string; tone?: "warning" }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-4 transition-colors hover:bg-card/70">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${tone === "warning" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}