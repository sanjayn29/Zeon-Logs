import { motion } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { Zap, CheckCircle, XCircle, Plug, AlertTriangle, Battery, BarChart3 } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Charging Insights Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Performance overview from analyzed charger logs.</p>
      </div>

      {/* Empty State */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glow-card rounded-xl bg-card p-12 text-center"
      >
        <BarChart3 className="w-16 h-16 text-primary/40 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Analytics Data Available</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          Upload and analyze your EV charger logs to see detailed analytics, session statistics, 
          connector performance, and error insights.
        </p>
        <a
          href="/upload"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
        >
          Upload Logs to Get Started
        </a>
      </motion.div>

      {/* Placeholder sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glow-card rounded-xl bg-card p-6 border-2 border-dashed border-border">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold text-muted-foreground">Sessions by Day</h3>
          </div>
          <div className="h-48 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Chart will appear here</p>
          </div>
        </div>

        <div className="glow-card rounded-xl bg-card p-6 border-2 border-dashed border-border">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold text-muted-foreground">Session Outcomes</h3>
          </div>
          <div className="h-48 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Chart will appear here</p>
          </div>
        </div>

        <div className="glow-card rounded-xl bg-card p-6 border-2 border-dashed border-border">
          <div className="flex items-center gap-2 mb-4">
            <Plug className="w-5 h-5 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold text-muted-foreground">Connector Performance</h3>
          </div>
          <div className="h-48 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Data will appear here</p>
          </div>
        </div>

        <div className="glow-card rounded-xl bg-card p-6 border-2 border-dashed border-border">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold text-muted-foreground">Common Error Reasons</h3>
          </div>
          <div className="h-48 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Data will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
