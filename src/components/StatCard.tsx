import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "error" | "warning";
  trend?: { value: string; positive: boolean };
}

export function StatCard({ label, value, subtitle, icon: Icon, variant = "default", trend }: StatCardProps) {
  const variantStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-500",
    error: "bg-red-500/10 text-red-500",
    warning: "bg-yellow-500/10 text-yellow-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glow-card rounded-xl bg-card p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${variantStyles[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {trend && (
        <p className={`text-xs font-medium ${trend.positive ? "text-accent" : "text-destructive"}`}>
          {trend.positive ? "↑" : "↓"} {trend.value}
        </p>
      )}
    </motion.div>
  );
}
