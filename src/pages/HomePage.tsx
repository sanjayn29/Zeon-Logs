import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Zap, Upload, BarChart3, MessageCircle, GitCompare, Battery, Plug, TrendingUp, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const quickStats = [
  { label: "Logs Processed", value: "12.4K", icon: <Zap className="w-5 h-5" />, color: "text-primary" },
  { label: "Connectors Tracked", value: "86", icon: <Plug className="w-5 h-5" />, color: "text-accent" },
  { label: "Avg Uptime", value: "97.3%", icon: <TrendingUp className="w-5 h-5" />, color: "text-chart-info" },
  { label: "Alerts Resolved", value: "342", icon: <Shield className="w-5 h-5" />, color: "text-chart-warning" },
];

const features = [
  {
    icon: <Upload className="w-6 h-6" />,
    title: "Smart Upload",
    desc: "Drag & drop CSV, Excel, or JSON charger logs with auto-detection.",
    route: "/upload",
  },
  {
    icon: <GitCompare className="w-6 h-6" />,
    title: "Log Normalization",
    desc: "Standardize timestamps, connector IDs, and status codes automatically.",
    route: "/normalization",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Analytics Dashboard",
    desc: "Visualize charging sessions, failures, and connector health at a glance.",
    route: "/dashboard",
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: "Ask ChargeSense",
    desc: "Natural-language Q&A about your charger performance and errors.",
    route: "/chat",
  },
];

const recentActivity = [
  { time: "2 min ago", event: "CCS2-01 session completed", status: "success" },
  { time: "15 min ago", event: "CHAdeMO-02 timeout error", status: "error" },
  { time: "32 min ago", event: "TYPE2-03 session completed", status: "success" },
  { time: "1 hr ago", event: "CCS2-02 overcurrent alert", status: "warning" },
  { time: "1.5 hr ago", event: "Batch log upload (148 entries)", status: "info" },
];

const statusColors: Record<string, string> = {
  success: "bg-accent",
  error: "bg-destructive",
  warning: "bg-chart-warning",
  info: "bg-chart-info",
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative rounded-2xl overflow-hidden h-64 md:h-72"
      >
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center h-full px-8 md:px-12 max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center backdrop-blur-sm">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">ChargeSense</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground leading-tight">
            Smart EV Log <br />
            <span className="gradient-text">Analysis Platform</span>
          </h1>
          <p className="text-sm text-primary-foreground/70 mt-3 leading-relaxed">
            Upload, normalize, and analyze EV charger logs with intelligent insights and natural-language queries.
          </p>
          <Button
            onClick={() => navigate("/upload")}
            size="lg"
            className="mt-5 w-fit bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
          >
            <Upload className="w-4 h-4 mr-2" /> Upload Logs
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((s) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            className="glow-card rounded-xl bg-card p-5 flex items-center gap-4"
          >
            <div className={`w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Feature Cards + Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Feature cards */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              onClick={() => navigate(f.route)}
              className="glow-card rounded-xl bg-card p-6 cursor-pointer group hover:border-primary/20 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glow-card rounded-xl bg-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          </div>
          <div className="divide-y divide-border/50">
            {recentActivity.map((a, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusColors[a.status]}`} />
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{a.event}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs text-primary font-medium hover:underline"
            >
              View full dashboard →
            </button>
          </div>
        </motion.div>
      </div>

      {/* System health mini bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glow-card rounded-xl bg-card p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Battery className="w-4 h-4 text-primary" /> Connector Health Overview
          </h3>
          <span className="text-xs text-muted-foreground">5 active connectors</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { name: "CCS2-01", health: 89 },
            { name: "CCS2-02", health: 94 },
            { name: "CHAdeMO-01", health: 72 },
            { name: "TYPE2-01", health: 97 },
            { name: "TYPE2-02", health: 91 },
          ].map((c) => (
            <div key={c.name} className="text-center p-3 rounded-lg bg-muted/40">
              <p className="text-xs font-medium text-muted-foreground mb-2">{c.name}</p>
              <div className="w-full bg-muted rounded-full h-2 mb-1">
                <div
                  className={`h-2 rounded-full transition-all ${c.health >= 90 ? "bg-accent" : c.health >= 80 ? "bg-chart-warning" : "bg-destructive"}`}
                  style={{ width: `${c.health}%` }}
                />
              </div>
              <p className="text-lg font-bold text-foreground">{c.health}%</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
