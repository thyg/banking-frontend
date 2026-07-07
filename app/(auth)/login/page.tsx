/**
 * @file app/(auth)/login/page.tsx
 * @description Page de connexion autonome — hors layout dashboard.
 * Connectée au backend via POST /api/auth/login avec X-Api-Key.
 */

"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginApi, registerApi } from "@/lib/api/auth";
import { useAuth } from "@/hooks/use-auth";

export const dynamic = "force-dynamic";

// ─── Schémas Zod ────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Minimum 6 caractères"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

// ─── Composant ──────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuth((s) => s.login);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("tab") === "register") {
      setTab("register");
    }
  }, [searchParams]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const handleLogin = async (data: LoginForm) => {
    setError(null);
    setLoading(true);
    try {
      const user = await loginApi(data);
      login(user);
      router.push("/banking");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setError(null);
    setLoading(true);
    try {
      await registerApi({ email: data.email, password: data.password });
      setTab("login");
      loginForm.setValue("email", data.email);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-border/60 rounded-2xl overflow-hidden py-0 gap-0">
      {/* En-tête */}
      <CardHeader className="bg-gradient-to-br from-primary to-primary/70 p-8 text-center space-y-2 border-b-0">
        <div className="mx-auto w-14 h-14 bg-primary-foreground/15 rounded-xl flex items-center justify-center mb-2">
          <Building2 className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary-foreground">KSM Pro</h1>
        <p className="text-primary-foreground/80 text-sm">Solution de gestion commerciale</p>
      </CardHeader>

      <CardContent className="p-8 space-y-6">
        {/* Onglets */}
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                tab === t
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "login" ? "Connexion" : "Inscription"}
            </button>
          ))}
        </div>

        {/* Erreur globale */}
        {error && (
          <Alert variant="destructive" className="py-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── FORMULAIRE CONNEXION ── */}
        {tab === "login" && (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="vous@entreprise.com"
                  className="pl-10"
                  {...loginForm.register("email")}
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-pwd">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-pwd"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  {...loginForm.register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPwd(!showPwd)}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        )}

        {/* ── FORMULAIRE INSCRIPTION ── */}
        {tab === "register" && (
          <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="vous@entreprise.com"
                  className="pl-10"
                  {...registerForm.register("email")}
                />
              </div>
              {registerForm.formState.errors.email && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-pwd">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-pwd"
                  type={showPwd ? "text" : "password"}
                  placeholder="Minimum 6 caractères"
                  className="pl-10 pr-10"
                  {...registerForm.register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPwd(!showPwd)}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {registerForm.formState.errors.password && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-confirm">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-confirm"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10"
                  {...registerForm.register("confirm")}
                />
              </div>
              {registerForm.formState.errors.confirm && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.confirm.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Création du compte..." : "Créer mon compte"}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          En vous connectant, vous acceptez les conditions d'utilisation de KSM Pro.
        </p>
      </CardContent>
    </Card>
  );
}
