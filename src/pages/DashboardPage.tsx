import { motion } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { Zap, CheckCircle, XCircle, Plug, AlertTriangle, Battery, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

const BACKEND_API = "http://localhost:8000";

interface ProcessedData {
  document_id: string;
  filename: string;
  upload_time: string;
  user_email: string;
  connector1_summary: {
    "Total Sessions": number;
    "Successful Sessions": number;
    "Failed Sessions": number;
    "Incomplete Sessions": number;
    "Interrupted Sessions"?: number;
    "Total Energy (kWh)": number;
    "Average Energy per Session (kWh)": number;
    "Total Duration (hours)": number;
    "Average Duration (minutes)": number;
    "Average Power (kW)": number;
    "Peak Power (kW)": number;
  };
  connector2_summary: {
    "Total Sessions": number;
    "Successful Sessions": number;
    "Failed Sessions": number;
    "Incomplete Sessions": number;
    "Interrupted Sessions"?: number;
    "Total Energy (kWh)": number;
    "Average Energy per Session (kWh)": number;
    "Total Duration (hours)": number;
    "Average Duration (minutes)": number;
    "Average Power (kW)": number;
    "Peak Power (kW)": number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ProcessedData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${BACKEND_API}/user-data/${user?.email}`);
      const result = await response.json();
      if (result.status === "success") {
        console.log("📊 Fetched user data:", result.data);
        // Sort by upload_time in descending order (most recent first)
        const sortedData = result.data.sort((a: ProcessedData, b: ProcessedData) => {
          return new Date(b.upload_time).getTime() - new Date(a.upload_time).getTime();
        });
        setData(sortedData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate aggregate stats
  const totalSessions = data.reduce((sum, d) => 
    sum + d.connector1_summary["Total Sessions"] + d.connector2_summary["Total Sessions"], 0
  );
  const successfulSessions = data.reduce((sum, d) => 
    sum + (d.connector1_summary["Successful Sessions"] || 0) + (d.connector2_summary["Successful Sessions"] || 0), 0
  );
  const failedSessions = data.reduce((sum, d) => 
    sum + (d.connector1_summary["Failed Sessions"] || 0) + (d.connector2_summary["Failed Sessions"] || 0), 0
  );
  const incompleteSessions = data.reduce((sum, d) => 
    sum + (d.connector1_summary["Incomplete Sessions"] || 0) + (d.connector2_summary["Incomplete Sessions"] || 0), 0
  );
  const totalEnergy = data.reduce((sum, d) => 
    sum + (d.connector1_summary["Total Energy (kWh)"] || 0) + (d.connector2_summary["Total Energy (kWh)"] || 0), 0
  );
  
  // Calculate average duration safely
  const totalDurationSum = data.reduce((sum, d) => 
    sum + (d.connector1_summary["Average Duration (minutes)"] || 0) + (d.connector2_summary["Average Duration (minutes)"] || 0), 0
  );
  const avgDuration = data.length > 0 ? totalDurationSum / (data.length * 2) : 0;
  
  // Calculate average power safely
  const totalPowerSum = data.reduce((sum, d) => 
    sum + (d.connector1_summary["Average Power (kW)"] || 0) + (d.connector2_summary["Average Power (kW)"] || 0), 0
  );
  const avgPower = data.length > 0 ? totalPowerSum / (data.length * 2) : 0;
  
  // Calculate peak power safely
  const allPeakPowers = data.flatMap(d => [
    d.connector1_summary["Peak Power (kW)"] || 0,
    d.connector2_summary["Peak Power (kW)"] || 0
  ]);
  const peakPower = allPeakPowers.length > 0 ? Math.max(...allPeakPowers) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Charging Insights Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Performance overview from {data.length} analyzed log file{data.length !== 1 ? "s" : ""}.
        </p>
        {data.length > 0 && (totalEnergy === 0 || isNaN(totalEnergy)) && (
          <div className="mt-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ Old data detected. Please re-upload your files to see enhanced metrics (energy, power, duration).
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {data.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Sessions"
              value={totalSessions}
              icon={Zap}
              variant="default"
            />
            <StatCard
              label="Successful Sessions"
              value={successfulSessions}
              icon={CheckCircle}
              variant="success"
            />
            <StatCard
              label="Failed Sessions"
              value={failedSessions}
              icon={XCircle}
              variant="error"
            />
            <StatCard
              label="Incomplete Sessions"
              value={incompleteSessions}
              icon={AlertTriangle}
              variant="warning"
            />
          </div>

          {/* Energy & Power Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Energy"
              value={`${(totalEnergy || 0).toFixed(2)} kWh`}
              icon={Battery}
              variant="success"
            />
            <StatCard
              label="Average Duration"
              value={`${(avgDuration || 0).toFixed(1)} min`}
              icon={Zap}
              variant="default"
            />
            <StatCard
              label="Average Power"
              value={`${(avgPower || 0).toFixed(2)} kW`}
              icon={Plug}
              variant="default"
            />
            <StatCard
              label="Peak Power"
              value={`${(peakPower || 0).toFixed(2)} kW`}
              icon={BarChart3}
              variant="warning"
            />
          </div>

          {/* My Uploads Table */}
          <div className="glow-card rounded-xl bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                My Uploaded Files
              </h3>
              <div className="text-sm text-muted-foreground">
                {data.length} total • Sorted by most recent
              </div>
            </div>
            <div className="space-y-3">
              {data.map((item) => {
                const totalSessionsItem = (item.connector1_summary["Total Sessions"] || 0) + (item.connector2_summary["Total Sessions"] || 0);
                const successfulSessionsItem = (item.connector1_summary["Successful Sessions"] || 0) + (item.connector2_summary["Successful Sessions"] || 0);
                const totalEnergyItem = (item.connector1_summary["Total Energy (kWh)"] || 0) + (item.connector2_summary["Total Energy (kWh)"] || 0);
                const avgPowerItem = ((item.connector1_summary["Average Power (kW)"] || 0) + (item.connector2_summary["Average Power (kW)"] || 0)) / 2;
                const totalDurationHours = (item.connector1_summary["Total Duration (hours)"] || 0) + (item.connector2_summary["Total Duration (hours)"] || 0);
                
                return (
                  <div key={item.document_id} className="p-4 rounded-lg bg-background/50 border border-border hover:bg-background/70 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground">{item.filename}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            ID: {item.document_id}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Uploaded by: <span className="font-medium text-foreground">{item.user_email}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.upload_time).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {totalSessionsItem} sessions
                        </p>
                        <p className="text-xs text-green-500">
                          {successfulSessionsItem} successful
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Energy</p>
                        <p className="text-sm font-semibold text-foreground">{totalEnergyItem.toFixed(2)} kWh</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Power</p>
                        <p className="text-sm font-semibold text-foreground">{avgPowerItem.toFixed(2)} kW</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-semibold text-foreground">
                          {(totalDurationHours * 60).toFixed(0)} min
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* Empty State */
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
      )}
    </div>
  );
}
