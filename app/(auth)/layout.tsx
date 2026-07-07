import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — KSM Pro",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-chart-4/10 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}
