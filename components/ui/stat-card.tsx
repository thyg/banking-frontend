import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: "default" | "primary" | "destructive";
  className?: string;
}

export function StatCard({ title, value, icon, variant = "default", className }: StatCardProps) {
  const baseClasses = "rounded-lg border";
  const variantClasses = {
    default: "bg-card text-card-foreground",
    primary: "bg-primary/10 border-primary/20 text-primary",
    destructive: "bg-destructive/10 border-destructive/20 text-destructive",
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase font-semibold text-muted-foreground truncate">{title}</p>
          {icon && <div className="flex-shrink-0 hidden sm:block">{icon}</div>}
        </div>
        <p className="text-lg sm:text-xl font-bold mt-1 truncate">{value}</p>
      </div>
    </div>
  );
}