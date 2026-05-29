import { createFileRoute, Link } from "@tanstack/react-router";
import { Dumbbell, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas - Smart training, real progress" },
      { name: "description", content: "Your AI-feel personal trainer. Smart plans, progressive overload, no fluff." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
      <div className="pointer-events-none absolute bottom-0 -left-32 h-96 w-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--gradient-primary)" }} />

      <div className="relative flex flex-1 flex-col justify-between p-6 pt-16">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <Dumbbell className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Atlas</span>
          </div>

          <div className="mt-16">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Smart training, no fluff
            </div>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight">
              Train like you have a coach <span className="text-primary">in your pocket.</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground">
              Atlas builds your plan, picks your weights, and adapts as you go. All driven by smart algorithms - not vibes.
            </p>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <Button asChild size="lg" className="h-14 w-full rounded-2xl text-base font-semibold shadow-[var(--shadow-glow)]">
            <Link to="/onboarding">
              Get started <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-12 w-full rounded-2xl text-sm">
            <Link to="/dashboard">I already have an account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
