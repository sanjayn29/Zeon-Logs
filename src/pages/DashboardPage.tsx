import { motion } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { Zap, CheckCircle, XCircle, Plug, AlertTriangle, Battery } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const sessionsByDay = [
  { day: "Mon", sessions: 42 },
  { day: "Tue", sessions: 58 },
  { day: "Wed", sessions: 35 },
  { day: "Thu", sessions: 64 },
  { day: "Fri", sessions: 71 },
  { day: "Sat", sessions: 49 },
  { day: "Sun", sessions: 33 },
];

const connectorPerf = [
  { name: "CCS2-01", success: 89, failure: 11 },
  { name: "CCS2-02", success: 94, failure: 6 },
  { name: "CHAdeMO-01", success: 72, failure: 28 },
  { name: "TYPE2-01", success: 97, failure: 3 },
  { name: "TYPE2-02", success: 91, failure: 9 },
];

const statusPie = [
  { name: "Completed", value: 298, color: "hsl(152, 55%, 42%)" },
  { name: "Failed", value: 38, color: "hsl(0, 72%, 55%)" },
  { name: "Interrupted", value: 16, color: "hsl(38, 92%, 50%)" },
];

const errorReasons = [
  { reason: "Connector Timeout", count: 14, pct: "36.8%" },
  { reason: "Communication Failure", count: 9, pct: "23.7%" },
  { reason: "Overcurrent Protection", count: 7, pct: "18.4%" },
  { reason: "Vehicle Not Responding", count: 5, pct: "13.2%" },
  { reason: "Ground Fault", count: 3, pct: "7.9%" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Charging Insights Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Performance overview from analyzed charger logs.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Sessions" value="352" subtitle="Last 7 days" icon={<Zap className="w-5 h-5" />} trend={{ value: "12% vs prev week", positive: true }} />
        <StatCard title="Success Rate" value="84.7%" subtitle="298 completed" icon={<CheckCircle className="w-5 h-5" />} trend={{ value: "2.3% improvement", positive: true }} />
        <StatCard title="Failure Rate" value="10.8%" subtitle="38 failed" icon={<XCircle className="w-5 h-5" />} trend={{ value: "1.1% decrease", positive: true }} />
        <StatCard title="Avg Energy / Session" value="28.4 kWh" subtitle="Across all connectors" icon={<Battery className="w-5 h-5" />} />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glow-card rounded-xl bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Sessions by Day</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sessionsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,18%,88%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(210,10%,50%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(210,10%,50%)" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(210,18%,88%)", fontSize: 12 }} />
              <Bar dataKey="sessions" fill="hsl(174,62%,38%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glow-card rounded-xl bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Session Outcomes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusPie} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                {statusPie.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(210,18%,88%)", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Connector performance & error table */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glow-card rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plug className="w-4 h-4 text-primary" /> Connector Performance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2.5 text-muted-foreground text-xs font-medium">Connector</th>
                  <th className="text-right px-5 py-2.5 text-muted-foreground text-xs font-medium">Success %</th>
                  <th className="text-right px-5 py-2.5 text-muted-foreground text-xs font-medium">Failure %</th>
                  <th className="px-5 py-2.5 text-muted-foreground text-xs font-medium">Health</th>
                </tr>
              </thead>
              <tbody>
                {connectorPerf.map((c) => (
                  <tr key={c.name} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-5 py-3 text-right text-accent font-medium">{c.success}%</td>
                    <td className="px-5 py-3 text-right text-destructive">{c.failure}%</td>
                    <td className="px-5 py-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${c.success}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glow-card rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-chart-warning" /> Common Error Reasons
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2.5 text-muted-foreground text-xs font-medium">Error Reason</th>
                  <th className="text-right px-5 py-2.5 text-muted-foreground text-xs font-medium">Count</th>
                  <th className="text-right px-5 py-2.5 text-muted-foreground text-xs font-medium">% of Errors</th>
                </tr>
              </thead>
              <tbody>
                {errorReasons.map((e) => (
                  <tr key={e.reason} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-foreground">{e.reason}</td>
                    <td className="px-5 py-3 text-right font-medium text-foreground">{e.count}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{e.pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
