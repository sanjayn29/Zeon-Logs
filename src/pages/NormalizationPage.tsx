import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";

const rawData = [
  { timestamp: "2024-03-15T08:23:11Z", connector: "CCS2-01", status: "CHARGING_STARTED", energy: "0.00", error: "" },
  { timestamp: "2024-03-15T08:45:33Z", connector: "CCS2-01", status: "CHARGING_COMPLETE", energy: "32.50", error: "" },
  { timestamp: "2024-03-15T09:01:45Z", connector: "CHAdeMO-02", status: "ERR_TIMEOUT", energy: "N/A", error: "CONNECTOR_TIMEOUT" },
  { timestamp: "2024/03/15 09:15", connector: "ccs2_01", status: "started", energy: "0", error: "-" },
  { timestamp: "15-Mar-2024 10:00", connector: "Type2 #3", status: "Complete", energy: "18.2kWh", error: "none" },
];

const normalizedData = [
  { timestamp: "2024-03-15 08:23:11", connector: "CCS2-01", status: "SESSION_START", energy_kwh: 0.0, error_code: null },
  { timestamp: "2024-03-15 08:45:33", connector: "CCS2-01", status: "SESSION_END", energy_kwh: 32.5, error_code: null },
  { timestamp: "2024-03-15 09:01:45", connector: "CHADEMO-02", status: "ERROR", energy_kwh: null, error_code: "TIMEOUT" },
  { timestamp: "2024-03-15 09:15:00", connector: "CCS2-01", status: "SESSION_START", energy_kwh: 0.0, error_code: null },
  { timestamp: "2024-03-15 10:00:00", connector: "TYPE2-03", status: "SESSION_END", energy_kwh: 18.2, error_code: null },
];

function DataTable({ data, title, variant }: { data: Record<string, any>[]; title: string; variant: "raw" | "normalized" }) {
  const keys = Object.keys(data[0]);
  return (
    <div className="glow-card rounded-xl bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${variant === "raw" ? "bg-chart-warning" : "bg-accent"}`} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {keys.map((k) => (
                <th key={k} className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                {keys.map((k) => (
                  <td key={k} className="px-4 py-2.5 text-foreground font-mono whitespace-nowrap">
                    {row[k] === null ? <span className="text-muted-foreground italic">null</span> : String(row[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function NormalizationPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Log Normalization</h2>
          <p className="text-sm text-muted-foreground mt-1">Raw logs are standardized for consistent analysis.</p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium"
        >
          <CheckCircle className="w-4 h-4" />
          Normalization Complete
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <DataTable data={rawData} title="Raw Log Data" variant="raw" />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <DataTable data={normalizedData} title="Normalized Log Data" variant="normalized" />
        </motion.div>
      </div>

      <div className="glow-card rounded-xl bg-card p-5">
        <h3 className="text-sm font-semibold mb-3 text-foreground">Normalization Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: "Timestamps Fixed", value: "3" },
            { label: "Connectors Standardized", value: "5" },
            { label: "Statuses Mapped", value: "4" },
            { label: "Nulls Handled", value: "6" },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={() => navigate("/dashboard")}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        size="lg"
      >
        View Dashboard <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
