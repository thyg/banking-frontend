"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Landmark,
  RefreshCw,
  Users,
  ShieldCheck,
  BarChart3,
  Zap,
  ArrowRight,
  Menu,
  X,
  Clock,
  CreditCard,
  CheckCircle2,
  Check,
  Minus,
  Star,
} from "lucide-react";

const NAV_LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#comparatif", label: "Comparatif" },
];

const FEATURES = [
  {
    icon: CreditCard,
    title: "Comptes & transactions unifiés",
    description:
      "Dépôts, retraits, virements et paiements de factures depuis une seule interface, sans ressaisie ni double saisie comptable.",
  },
  {
    icon: RefreshCw,
    title: "Rapprochement automatique",
    description:
      "Relevés bancaires, transactions et chèques rapprochés en temps réel — le moindre écart saute aux yeux immédiatement.",
  },
  {
    icon: Users,
    title: "Multi-comptes & rôles",
    description:
      "Caissiers, comptables et administrateurs : chacun voit exactement son périmètre, banque par banque, compte par compte.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité de niveau bancaire",
    description:
      "Authentification forte (MFA), sessions chiffrées et piste d'audit complète sur chaque écriture et chaque rapprochement.",
  },
  {
    icon: BarChart3,
    title: "Reporting en direct",
    description:
      "Soldes, chèques en attente et journaux d'écritures par compte, exportables en PDF pour votre comptabilité.",
  },
  {
    icon: Zap,
    title: "Temps réel",
    description:
      "Chaque opération met à jour instantanément les soldes théoriques et la trésorerie consolidée de votre organisation.",
  },
];

const STATS = [
  { number: "100%", label: "Rapprochement automatisé" },
  { number: "Multi", label: "Comptes & banques" },
  { number: "24/7", label: "Disponibilité" },
  { number: "< 1 j", label: "Mise en route" },
];

// "full" = inclus, "partial" = partiel / module payant, "none" = absent
type ComparisonState = "full" | "partial" | "none";

const COMPARISON_COLUMNS = ["KSM Banking", "Odoo (module bancaire)", "Excel / cahier", "Logiciel bancaire générique"];

const COMPARISON_ROWS: { criterion: string; values: ComparisonState[] }[] = [
  {
    criterion: "Rapprochement bancaire automatique",
    values: ["full", "partial", "none", "none"],
  },
  {
    criterion: "Multi-comptes & multi-banques natif",
    values: ["full", "partial", "none", "partial"],
  },
  {
    criterion: "Piste d'audit par opération",
    values: ["full", "partial", "none", "none"],
  },
  {
    criterion: "Gestion des chèques en attente",
    values: ["full", "partial", "none", "partial"],
  },
  {
    criterion: "Authentification forte (MFA)",
    values: ["full", "partial", "none", "partial"],
  },
  {
    criterion: "Rôles & permissions par compte",
    values: ["full", "partial", "none", "partial"],
  },
  {
    criterion: "Intégré à l'ERP (ventes, stock, RH...)",
    values: ["full", "full", "none", "none"],
  },
  {
    criterion: "Mise en route en moins d'un jour",
    values: ["full", "none", "partial", "none"],
  },
];

const COMPARISON_LEGEND: { state: ComparisonState; label: string }[] = [
  { state: "full", label: "Inclus" },
  { state: "partial", label: "Partiel / module payant" },
  { state: "none", label: "Absent" },
];

export function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shrink-0">
                <Landmark className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-none">KSM Banking</h1>
                <p className="text-xs text-muted-foreground">Trésorerie &amp; comptes bancaires</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  {link.label}
                </a>
              ))}
              <Link href="/login">
                <Button variant="ghost">Connexion</Button>
              </Link>
              <Link href="/login?tab=register">
                <Button>
                  Inscription
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col space-y-3">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 text-sm font-medium"
                  >
                    {link.label}
                  </a>
                ))}
                <Link href="/login" className="px-3">
                  <Button variant="outline" className="w-full">
                    Connexion
                  </Button>
                </Link>
                <Link href="/login?tab=register" className="px-3">
                  <Button className="w-full">Inscription</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-grid-pattern opacity-40" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div>
              <Badge
                variant="outline"
                className="mb-6 gap-1.5 border-primary/30 bg-primary/5 text-primary px-3 py-1"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                COMPTES · RAPPROCHEMENT · TRÉSORERIE
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1]">
                Vos comptes bancaires, votre trésorerie —{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-chart-4">
                  au même endroit
                </span>
                .
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
                Encaissez, rapprochez et pilotez chaque compte bancaire en temps réel.
                Une plateforme unique, sécurisée et conforme, pensée pour les entreprises
                africaines.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto px-8 text-base">
                    Accéder à ma trésorerie
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login?tab=register">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 text-base">
                    Créer un compte
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Mise en route &lt; 1 jour
                </span>
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Multi-comptes &amp; multi-banques
                </span>
              </div>
            </div>

            {/* Right: floating live card */}
            <div className="relative lg:justify-self-end w-full max-w-md pb-9">
              <Card className="shadow-2xl border-border/60 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                  <div>
                    <CardTitle className="text-base">Compte — Société Générale</CardTitle>
                    <CardDescription className="mt-1">IBAN •••• 4821</CardDescription>
                  </div>
                  <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-transparent hover:bg-green-500/15">
                    Actif
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                    <span className="text-sm text-muted-foreground">Solde d&apos;ouverture</span>
                    <span className="font-semibold">250 000 FCFA</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                    <span className="text-sm text-muted-foreground">Encaissements</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      + 1 240 000 FCFA
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                    <span className="text-sm text-muted-foreground">Retraits &amp; chèques</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      – 430 000 FCFA
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-primary px-4 py-3.5 mt-2">
                    <span className="text-sm font-medium text-primary-foreground">
                      Solde théorique
                    </span>
                    <span className="font-bold text-primary-foreground">1 060 000 FCFA</span>
                  </div>
                </CardContent>
              </Card>

              {/* Reconciliation badge floating on the card */}
              <div className="absolute bottom-0 left-5 hidden sm:flex items-center gap-2 rounded-xl bg-card border border-border shadow-lg px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs font-semibold leading-none">Rapprochement</p>
                  <p className="text-xs text-muted-foreground mt-1">3 relevés à jour</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-14 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="text-3xl sm:text-4xl font-bold text-primary">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Tout ce qu&apos;une trésorerie devrait faire
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Conçu avec les caissiers et les comptables, pas contre eux.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparatif Section */}
      <section id="comparatif" className="py-20 sm:py-24 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Comment on se compare
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Face aux solutions habituelles des entreprises de la région, sur le module trésorerie
              &amp; banque.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-foreground px-6 py-4 whitespace-nowrap">
                    Critère
                  </th>
                  {COMPARISON_COLUMNS.map((col, idx) => (
                    <th
                      key={col}
                      className={`px-6 py-4 text-center font-semibold whitespace-nowrap ${
                        idx === 0
                          ? "text-primary bg-primary/5"
                          : "text-muted-foreground"
                      }`}
                    >
                      {idx === 0 && (
                        <Star className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5 fill-primary text-primary" />
                      )}
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, rowIdx) => (
                  <tr
                    key={row.criterion}
                    className={rowIdx !== COMPARISON_ROWS.length - 1 ? "border-b border-border" : ""}
                  >
                    <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                      {row.criterion}
                    </td>
                    {row.values.map((value, colIdx) => (
                      <td
                        key={colIdx}
                        className={`px-6 py-4 text-center ${colIdx === 0 ? "bg-primary/5" : ""}`}
                      >
                        <ComparisonMark state={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            {COMPARISON_LEGEND.map((item) => (
              <span key={item.state} className="flex items-center gap-2">
                <ComparisonMark state={item.state} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-chart-4">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-6">
            Prêt à reprendre le contrôle de votre trésorerie ?
          </h2>
          <p className="text-lg sm:text-xl text-primary-foreground/85 mb-8 leading-relaxed">
            Comptes, chèques, relevés et rapprochement bancaire réunis dans un seul module,
            au sein de votre ERP KSM.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 text-base font-semibold bg-white text-primary hover:bg-white/90"
              >
                Accéder à ma caisse
              </Button>
            </Link>
            <Link href="/login?tab=register">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-8 text-base border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
              >
                Créer un compte
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">KSM Banking</span>
              </div>
              <p className="text-background/60 text-sm">
                Le module trésorerie &amp; comptes bancaires de l&apos;ERP KSM.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Produit</h3>
              <ul className="space-y-2 text-sm text-background/60">
                <li><a href="#fonctionnalites" className="hover:text-background transition-colors">Fonctionnalités</a></li>
                <li><a href="#comparatif" className="hover:text-background transition-colors">Comparatif</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Compte</h3>
              <ul className="space-y-2 text-sm text-background/60">
                <li><Link href="/login" className="hover:text-background transition-colors">Connexion</Link></li>
                <li><Link href="/login?tab=register" className="hover:text-background transition-colors">Inscription</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-background/60">
                <li><a href="#" className="hover:text-background transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/20 mt-12 pt-8 text-center text-sm text-background/60">
            <p>&copy; 2026 KSM Banking. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ComparisonMark({ state }: { state: ComparisonState }) {
  if (state === "full") {
    return <Check className="inline h-4 w-4 text-green-600 dark:text-green-400" />;
  }
  if (state === "partial") {
    return <Minus className="inline h-4 w-4 text-chart-3" />;
  }
  return <Minus className="inline h-4 w-4 text-muted-foreground/40" />;
}
