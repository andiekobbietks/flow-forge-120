import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, BookOpen, ShoppingCart, GraduationCap, Sparkles, ArrowRight, Zap, Award, Star, Rocket } from "lucide-react";
import { toast } from "sonner";
import { forgeSchema, type ForgeProgress } from "@/lib/forge-ai";
import type { ScaffoldLevel } from "@/lib/forge-types";

const templates = [
  {
    id: "library",
    title: "Library System",
    description: "Multi-user book catalog with checkout, returns, and member management.",
    icon: BookOpen,
    intent: "I need a multi-user library system with a book catalog, member registration, and a checkout/return feature with overdue tracking.",
  },
  {
    id: "ecommerce",
    title: "E-Commerce Shop",
    description: "Product catalog with shopping cart, orders, and customer accounts.",
    icon: ShoppingCart,
    intent: "I need an e-commerce shop with a product catalog, shopping cart, customer accounts, and order management with payment tracking.",
  },
  {
    id: "school",
    title: "School Management",
    description: "Student records, class enrollment, grades, and teacher assignments.",
    icon: GraduationCap,
    intent: "I need a school management system with student records, class enrollment, teacher assignments, and grade tracking.",
  },
];

const scaffoldOptions: { value: ScaffoldLevel; label: string; description: string; icon: typeof Zap }[] = [
  {
    value: "exploratory",
    label: "Exploratory",
    description: "Grade E/D — 1NF, raw HTML, basic queries",
    icon: Zap,
  },
  {
    value: "competent",
    label: "Competent",
    description: "Grade C/B — 2NF, Bootstrap, mysqli",
    icon: Award,
  },
  {
    value: "exemplary",
    label: "Exemplary",
    description: "Grade A* — 3NF, PDO, sessions + CSRF",
    icon: Star,
  },
  {
    value: "rad",
    label: "RAD 2.0",
    description: "No grade target — just build it",
    icon: Rocket,
  },
];

const LandingPage = () => {
  const [intent, setIntent] = useState("");
  const [scaffoldLevel, setScaffoldLevel] = useState<ScaffoldLevel>("rad");
  const [isForging, setIsForging] = useState(false);
  const [forgeStatus, setForgeStatus] = useState("");
  const navigate = useNavigate();

  const handleForge = async (text: string) => {
    if (!text.trim()) return;
    setIsForging(true);
    setForgeStatus("Initializing forge pipeline...");

    try {
      const onProgress: ForgeProgress = (status) => {
        setForgeStatus(status);
      };

      const result = await forgeSchema(text, scaffoldLevel, onProgress);

      // Store blueprint + metadata in sessionStorage
      sessionStorage.setItem("lampforge-blueprint", JSON.stringify(result.blueprint));
      sessionStorage.setItem("lampforge-provider", result.provider);
      sessionStorage.setItem("lampforge-route", result.route || "schema_generation");

      setForgeStatus("Compiling architecture...");
      toast.success(`Blueprint forged via ${result.provider}`, {
        description: `${result.blueprint.entities.length} entities, scaffold: ${scaffoldLevel}`,
      });

      setTimeout(() => navigate("/canvas"), 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Forge failed";
      toast.error("Forge Error", { description: message });
      setIsForging(false);
      setForgeStatus("");
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-7 w-7 text-forge-transaction" />
            <span className="text-xl font-bold tracking-tight">
              LAMP<span className="text-primary">Forge</span>
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/workbench")}>
              SQL Workbench
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/evidence")}>
              Evidence Log
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-forge-oracle" />
            Cognitive Engineering Platform
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Declare your intent.
            <br />
            <span className="text-primary">We'll forge the architecture.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Describe the system you want to build in plain English. LAMPForge translates your intent into entities, relationships, and working CRUD operations — instantly.
          </p>
        </div>

        {/* Scaffold Level Selector */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Target Level
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {scaffoldOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setScaffoldLevel(opt.value)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-center transition-all ${
                  scaffoldLevel === opt.value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-accent"
                }`}
              >
                <opt.icon className={`h-4 w-4 ${scaffoldLevel === opt.value ? "text-primary" : ""}`} />
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-[10px] leading-tight opacity-70">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Intent Input */}
        <div className="mb-12">
          <div className="relative rounded-lg border border-border bg-card p-1">
            <Textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder='e.g. "I need a multi-user library system with a book checkout feature and overdue tracking"'
              className="min-h-[120px] resize-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {intent.length > 0 ? `${intent.split(" ").filter(Boolean).length} words` : "Natural language → Architecture → Code"}
                </span>
                {forgeStatus && (
                  <span className="text-xs font-mono text-primary animate-pulse">
                    {forgeStatus}
                  </span>
                )}
              </div>
              <Button
                onClick={() => handleForge(intent)}
                disabled={!intent.trim() || isForging}
                className="gap-2"
              >
                {isForging ? (
                  <>
                    <Flame className="h-4 w-4 animate-forge-pulse" />
                    Forging...
                  </>
                ) : (
                  <>
                    <Flame className="h-4 w-4" />
                    Forge It
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Template Gallery */}
        <div>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Or start from a template
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {templates.map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer border-border bg-card transition-colors hover:border-primary/50 hover:bg-accent"
                onClick={() => {
                  setIntent(t.intent);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                    <t.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{t.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t.description}</CardDescription>
                  <div className="mt-3 flex items-center gap-1 text-xs text-primary">
                    Use template <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
