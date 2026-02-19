import { motion } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { Zap, CheckCircle, XCircle, Plug, AlertTriangle, Battery, BarChart3, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const BACKEND_API = "http://localhost:8000";

// Helper function to format enriched error display
function formatErrorDisplay(error: string): { mainError: string; subError: string | null; displayText: string } {
  if (error.includes(':')) {
    const [mainError, subError] = error.split(':', 2);
    return {
      mainError,
      subError,
      displayText: `${mainError} (${subError.replace(/([A-Z])/g, ' $1').trim()})`
    };
  }
  return {
    mainError: error,
    subError: null,
    displayText: error
  };
}

interface IdleTimeError {
  timestamp: string;
  status: string;
  errorCode: string;
  info: string;
  vendorErrorCode: string;
  connectorId?: number;
  category?: string;
}

interface ProcessedData {
  document_id: string;
  filename: string;
  upload_time: string;
  user_email: string;
  connector1_summary: {
    "Total Sessions": number;
    "Successful Sessions": number;
    "Successful Session Errors"?: Record<string, number>;
    "Failed Sessions": number;
    "Failed Session Reasons"?: Record<string, number>;
    "Incomplete Sessions": number;
    "Interrupted Sessions"?: number;
    "Precharging Failures"?: number;
    "Idle Time Errors"?: IdleTimeError[];
    "Idle Time Error Count"?: number;
    "Idle Time Warnings"?: IdleTimeError[];
    "Idle Time Faults"?: IdleTimeError[];
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
    "Successful Session Errors"?: Record<string, number>;
    "Failed Sessions": number;
    "Failed Session Reasons"?: Record<string, number>;
    "Incomplete Sessions": number;
    "Interrupted Sessions"?: number;
    "Precharging Failures"?: number;
    "Idle Time Errors"?: IdleTimeError[];
    "Idle Time Error Count"?: number;
    "Idle Time Warnings"?: IdleTimeError[];
    "Idle Time Faults"?: IdleTimeError[];
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
  const [selectedLog, setSelectedLog] = useState<ProcessedData | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

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

  const handleLogClick = (log: ProcessedData) => {
    setSelectedLog(log);
  };

  const handleCloseModal = () => {
    setSelectedLog(null);
  };

  const handleDeleteClick = () => {
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLog) return;

    try {
      const response = await fetch(`${BACKEND_API}/delete-log/${selectedLog.document_id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.status === "success") {
        // Remove the deleted log from the state
        setData(prevData => prevData.filter(item => item.document_id !== selectedLog.document_id));
        console.log("Log deleted successfully:", selectedLog.document_id);
      } else {
        console.error("Failed to delete log:", result.message);
      }
    } catch (error) {
      console.error("Error deleting log:", error);
    } finally {
      // Close both dialogs
      setIsAlertOpen(false);
      setSelectedLog(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedLog) return;

    try {
      const response = await fetch(`${BACKEND_API}/download-pdf/${selectedLog.document_id}`);
      
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedLog.filename.replace('.csv', '')}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log("PDF downloaded successfully:", selectedLog.filename);
    } catch (error) {
      console.error("Error downloading PDF:", error);
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
  const prechargingFailures = data.reduce((sum, d) => 
    sum + (d.connector1_summary["Precharging Failures"] || 0) + (d.connector2_summary["Precharging Failures"] || 0), 0
  );
  const totalIdleTimeErrors = data.reduce((sum, d) => 
    sum + (d.connector1_summary["Idle Time Error Count"] || 0) + (d.connector2_summary["Idle Time Error Count"] || 0), 0
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

  // Aggregate error summaries
  const aggregateSuccessfulErrors: Record<string, number> = {};
  const aggregateFailedReasons: Record<string, number> = {};
  
  data.forEach(d => {
    // Aggregate successful session errors
    if (d.connector1_summary["Successful Session Errors"]) {
      Object.entries(d.connector1_summary["Successful Session Errors"]).forEach(([error, count]) => {
        aggregateSuccessfulErrors[error] = (aggregateSuccessfulErrors[error] || 0) + count;
      });
    }
    if (d.connector2_summary["Successful Session Errors"]) {
      Object.entries(d.connector2_summary["Successful Session Errors"]).forEach(([error, count]) => {
        aggregateSuccessfulErrors[error] = (aggregateSuccessfulErrors[error] || 0) + count;
      });
    }
    
    // Aggregate failed session reasons
    if (d.connector1_summary["Failed Session Reasons"]) {
      Object.entries(d.connector1_summary["Failed Session Reasons"]).forEach(([reason, count]) => {
        aggregateFailedReasons[reason] = (aggregateFailedReasons[reason] || 0) + count;
      });
    }
    if (d.connector2_summary["Failed Session Reasons"]) {
      Object.entries(d.connector2_summary["Failed Session Reasons"]).forEach(([reason, count]) => {
        aggregateFailedReasons[reason] = (aggregateFailedReasons[reason] || 0) + count;
      });
    }
  });

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
          Cumulative performance overview from all {data.length} analyzed log file{data.length !== 1 ? "s" : ""}.
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
          {/* Cumulative Session Statistics */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">Cumulative Statistics</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                All {data.length} file{data.length !== 1 ? "s" : ""} combined
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Total metrics aggregated from all your uploaded log files
            </p>
          </div>

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

          {/* Pre-Charging Failures */}
          {prechargingFailures > 0 && (
            <div className="glow-card rounded-xl bg-card p-4 border-2 border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Plug className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pre-Charging Failures</p>
                    <p className="text-2xl font-bold text-foreground">{prechargingFailures}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Sessions that never reached charging</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">&lt; 1 min, no errors</p>
                </div>
              </div>
            </div>
          )}

          {/* Idle Time Errors */}
          {totalIdleTimeErrors > 0 && (
            <div className="glow-card rounded-xl bg-card p-4 border-2 border-orange-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Idle Time Errors</p>
                    <p className="text-2xl font-bold text-foreground">{totalIdleTimeErrors}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Unique idle faults detected</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">(deduplicated & filtered)</p>
                </div>
              </div>
            </div>
          )}

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

          {/* Visual Analytics Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">Visual Analytics</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                Charts & Insights
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Sessions Distribution Chart */}
              <div className="glow-card rounded-xl bg-card p-6 border-2 border-blue-500/20">
                <h4 className="text-md font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Sessions Overview
                </h4>
                <ChartContainer
                  config={{
                    successful: {
                      label: "Successful",
                      color: "hsl(142, 76%, 36%)",
                    },
                    failed: {
                      label: "Failed",
                      color: "hsl(0, 84%, 60%)",
                    },
                    incomplete: {
                      label: "Incomplete",
                      color: "hsl(38, 92%, 50%)",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Connector 1",
                          successful: data[0]?.connector1_summary["Successful Sessions"] || 0,
                          failed: data[0]?.connector1_summary["Failed Sessions"] || 0,
                          incomplete: data[0]?.connector1_summary["Incomplete Sessions"] || 0,
                        },
                        {
                          name: "Connector 2",
                          successful: data[0]?.connector2_summary["Successful Sessions"] || 0,
                          failed: data[0]?.connector2_summary["Failed Sessions"] || 0,
                          incomplete: data[0]?.connector2_summary["Incomplete Sessions"] || 0,
                        },
                        {
                          name: "Total",
                          successful: successfulSessions,
                          failed: failedSessions,
                          incomplete: incompleteSessions,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="successful" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="failed" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="incomplete" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              {/* Energy & Power Comparison */}
              <div className="glow-card rounded-xl bg-card p-6 border-2 border-green-500/20">
                <h4 className="text-md font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Battery className="w-5 h-5 text-green-500" />
                  Energy & Power Metrics
                </h4>
                <ChartContainer
                  config={{
                    energy: {
                      label: "Energy (kWh)",
                      color: "hsl(142, 76%, 36%)",
                    },
                    avgPower: {
                      label: "Avg Power (kW)",
                      color: "hsl(217, 91%, 60%)",
                    },
                    peakPower: {
                      label: "Peak Power (kW)",
                      color: "hsl(38, 92%, 50%)",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Connector 1",
                          energy: data[0]?.connector1_summary["Total Energy (kWh)"] || 0,
                          avgPower: data[0]?.connector1_summary["Average Power (kW)"] || 0,
                          peakPower: data[0]?.connector1_summary["Peak Power (kW)"] || 0,
                        },
                        {
                          name: "Connector 2",
                          energy: data[0]?.connector2_summary["Total Energy (kWh)"] || 0,
                          avgPower: data[0]?.connector2_summary["Average Power (kW)"] || 0,
                          peakPower: data[0]?.connector2_summary["Peak Power (kW)"] || 0,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="energy" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avgPower" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="peakPower" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              {/* Session Results Pie Chart */}
              <div className="glow-card rounded-xl bg-card p-6 border-2 border-purple-500/20">
                <h4 className="text-md font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-500" />
                  Session Results Distribution
                </h4>
                <ChartContainer
                  config={{
                    successful: {
                      label: "Successful",
                      color: "hsl(142, 76%, 36%)",
                    },
                    failed: {
                      label: "Failed",
                      color: "hsl(0, 84%, 60%)",
                    },
                    incomplete: {
                      label: "Incomplete",
                      color: "hsl(38, 92%, 50%)",
                    },
                    precharging: {
                      label: "Pre-Charging Failures",
                      color: "hsl(280, 76%, 56%)",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Successful", value: successfulSessions, fill: "hsl(142, 76%, 36%)" },
                          { name: "Failed", value: failedSessions, fill: "hsl(0, 84%, 60%)" },
                          { name: "Incomplete", value: incompleteSessions, fill: "hsl(38, 92%, 50%)" },
                          { name: "Pre-Charging", value: prechargingFailures, fill: "hsl(280, 76%, 56%)" },
                        ].filter((item) => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {[
                          { name: "Successful", value: successfulSessions, fill: "hsl(142, 76%, 36%)" },
                          { name: "Failed", value: failedSessions, fill: "hsl(0, 84%, 60%)" },
                          { name: "Incomplete", value: incompleteSessions, fill: "hsl(38, 92%, 50%)" },
                          { name: "Pre-Charging", value: prechargingFailures, fill: "hsl(280, 76%, 56%)" },
                        ]
                          .filter((item) => item.value > 0)
                          .map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              {/* Duration Comparison */}
              <div className="glow-card rounded-xl bg-card p-6 border-2 border-amber-500/20">
                <h4 className="text-md font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Duration & Session Metrics
                </h4>
                <ChartContainer
                  config={{
                    avgDuration: {
                      label: "Avg Duration (min)",
                      color: "hsl(38, 92%, 50%)",
                    },
                    totalSessions: {
                      label: "Total Sessions",
                      color: "hsl(217, 91%, 60%)",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Connector 1",
                          avgDuration: data[0]?.connector1_summary["Average Duration (minutes)"] || 0,
                          totalSessions: data[0]?.connector1_summary["Total Sessions"] || 0,
                        },
                        {
                          name: "Connector 2",
                          avgDuration: data[0]?.connector2_summary["Average Duration (minutes)"] || 0,
                          totalSessions: data[0]?.connector2_summary["Total Sessions"] || 0,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="avgDuration" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalSessions" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          </div>

          {/* Error Breakdown Section */}
          {(Object.keys(aggregateFailedReasons).length > 0 || Object.keys(aggregateSuccessfulErrors).length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">Error Analysis</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                  Diagnostics
                </span>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {/* Failed Session Reasons */}
                {Object.keys(aggregateFailedReasons).length > 0 && (
                  <div className="glow-card rounded-xl bg-card p-6 border-2 border-red-500/20">
                    <div className="flex flex-col gap-1 mb-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <h4 className="text-md font-semibold text-foreground">Failed Session Reasons</h4>
                      </div>
                      <p className="text-xs text-muted-foreground ml-7">Sessions may have multiple errors</p>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(aggregateFailedReasons)
                        .sort(([, a], [, b]) => b - a)
                        .map(([reason, count]) => {
                          const { displayText, subError } = formatErrorDisplay(reason);
                          return (
                            <div key={reason} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-foreground">{displayText}</span>
                                  {subError && (
                                    <span className="text-xs text-muted-foreground mt-0.5">Enhanced info extracted</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-lg font-bold text-red-600 dark:text-red-400">{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Successful Session Errors */}
                {Object.keys(aggregateSuccessfulErrors).length > 0 && (
                  <div className="glow-card rounded-xl bg-card p-6 border-2 border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <h4 className="text-md font-semibold text-foreground">Successful Session Errors</h4>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(aggregateSuccessfulErrors)
                        .sort(([, a], [, b]) => b - a)
                        .map(([error, count]) => {
                          const { displayText, subError } = formatErrorDisplay(error);
                          return (
                            <div key={error} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-foreground">{displayText}</span>
                                  {subError && (
                                    <span className="text-xs text-muted-foreground mt-0.5">Enhanced info extracted</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
                  <div 
                    key={item.document_id} 
                    className="p-4 rounded-lg bg-background/50 border border-border hover:bg-background/70 transition-colors cursor-pointer"
                    onClick={() => handleLogClick(item)}
                  >
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

      {/* Log Details Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(isOpen) => !isOpen && handleCloseModal()}>
        <DialogContent className="sm:max-w-[625px]">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">{selectedLog.filename}</DialogTitle>
                <DialogDescription>
                  Uploaded on {new Date(selectedLog.upload_time).toLocaleString()} by {selectedLog.user_email}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <h4 className="text-md font-semibold text-foreground">Connector 1 Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><strong>Total Sessions:</strong> {selectedLog.connector1_summary["Total Sessions"]}</p>
                  <p><strong>Successful:</strong> {selectedLog.connector1_summary["Successful Sessions"]}</p>
                  <p><strong>Failed:</strong> {selectedLog.connector1_summary["Failed Sessions"]}</p>
                  <p><strong>Incomplete:</strong> {selectedLog.connector1_summary["Incomplete Sessions"]}</p>
                  {(selectedLog.connector1_summary["Precharging Failures"] ?? 0) > 0 && (
                    <p className="col-span-2">
                      <strong className="text-purple-600 dark:text-purple-400">Pre-Charging Failures:</strong> 
                      <span className="ml-1 text-purple-600 dark:text-purple-400">
                        {selectedLog.connector1_summary["Precharging Failures"]}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">(never reached charging)</span>
                    </p>
                  )}
                  <p><strong>Total Energy:</strong> {selectedLog.connector1_summary["Total Energy (kWh)"]} kWh</p>
                  <p><strong>Avg Duration:</strong> {selectedLog.connector1_summary["Average Duration (minutes)"]} min</p>
                  <p><strong>Avg Power:</strong> {selectedLog.connector1_summary["Average Power (kW)"]} kW</p>
                  <p><strong>Peak Power:</strong> {selectedLog.connector1_summary["Peak Power (kW)"]} kW</p>
                </div>
                {selectedLog.connector1_summary["Successful Session Errors"] && 
                 Object.keys(selectedLog.connector1_summary["Successful Session Errors"]).length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <h5 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">Successful Session Errors:</h5>
                    <div className="space-y-1">
                      {Object.entries(selectedLog.connector1_summary["Successful Session Errors"]).map(([error, count]) => {
                        const { displayText } = formatErrorDisplay(error);
                        return (
                          <p key={error} className="text-xs text-yellow-600 dark:text-yellow-400">
                            • {displayText}: <strong>{count}</strong>
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedLog.connector1_summary["Failed Session Reasons"] && 
                 Object.keys(selectedLog.connector1_summary["Failed Session Reasons"]).length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <h5 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                      Failed Session Reasons:
                      <span className="ml-2 text-xs font-normal opacity-70">(sessions may have multiple errors)</span>
                    </h5>
                    <div className="space-y-1">
                      {Object.entries(selectedLog.connector1_summary["Failed Session Reasons"]).map(([reason, count]) => {
                        const { displayText } = formatErrorDisplay(reason);
                        return (
                          <p key={reason} className="text-xs text-red-600 dark:text-red-400">
                            • {displayText}: <strong>{count}</strong>
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
                <h4 className="text-md font-semibold text-foreground">Connector 2 Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><strong>Total Sessions:</strong> {selectedLog.connector2_summary["Total Sessions"]}</p>
                  <p><strong>Successful:</strong> {selectedLog.connector2_summary["Successful Sessions"]}</p>
                  <p><strong>Failed:</strong> {selectedLog.connector2_summary["Failed Sessions"]}</p>
                  <p><strong>Incomplete:</strong> {selectedLog.connector2_summary["Incomplete Sessions"]}</p>
                  {(selectedLog.connector2_summary["Precharging Failures"] ?? 0) > 0 && (
                    <p className="col-span-2">
                      <strong className="text-purple-600 dark:text-purple-400">Pre-Charging Failures:</strong> 
                      <span className="ml-1 text-purple-600 dark:text-purple-400">
                        {selectedLog.connector2_summary["Precharging Failures"]}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">(never reached charging)</span>
                    </p>
                  )}
                  <p><strong>Total Energy:</strong> {selectedLog.connector2_summary["Total Energy (kWh)"]} kWh</p>
                  <p><strong>Avg Duration:</strong> {selectedLog.connector2_summary["Average Duration (minutes)"]} min</p>
                  <p><strong>Avg Power:</strong> {selectedLog.connector2_summary["Average Power (kW)"]} kW</p>
                  <p><strong>Peak Power:</strong> {selectedLog.connector2_summary["Peak Power (kW)"]} kW</p>
                </div>
                {selectedLog.connector2_summary["Successful Session Errors"] && 
                 Object.keys(selectedLog.connector2_summary["Successful Session Errors"]).length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <h5 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">Successful Session Errors:</h5>
                    <div className="space-y-1">
                      {Object.entries(selectedLog.connector2_summary["Successful Session Errors"]).map(([error, count]) => {
                        const { displayText } = formatErrorDisplay(error);
                        return (
                          <p key={error} className="text-xs text-yellow-600 dark:text-yellow-400">
                            • {displayText}: <strong>{count}</strong>
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedLog.connector2_summary["Failed Session Reasons"] && 
                 Object.keys(selectedLog.connector2_summary["Failed Session Reasons"]).length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <h5 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                      Failed Session Reasons:
                      <span className="ml-2 text-xs font-normal opacity-70">(sessions may have multiple errors)</span>
                    </h5>
                    <div className="space-y-1">
                      {Object.entries(selectedLog.connector2_summary["Failed Session Reasons"]).map(([reason, count]) => {
                        const { displayText } = formatErrorDisplay(reason);
                        return (
                          <p key={reason} className="text-xs text-red-600 dark:text-red-400">
                            • {displayText}: <strong>{count}</strong>
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Idle Time Errors - Combined from both connectors */}
                {((selectedLog.connector1_summary["Idle Time Errors"] && selectedLog.connector1_summary["Idle Time Errors"].length > 0) ||
                  (selectedLog.connector2_summary["Idle Time Errors"] && selectedLog.connector2_summary["Idle Time Errors"].length > 0)) && (
                  <div className="mt-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <h5 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2">
                      Idle Time Errors ({[...(selectedLog.connector1_summary["Idle Time Errors"] || []), 
                        ...(selectedLog.connector2_summary["Idle Time Errors"] || [])].length} unique):
                      <span className="ml-2 text-xs font-normal opacity-70">(deduplicated, outside sessions)</span>
                    </h5>
                    
                    {/* Show Faults separately if they exist */}
                    {(() => {
                      const allFaults = [...(selectedLog.connector1_summary["Idle Time Faults"] || []), 
                                          ...(selectedLog.connector2_summary["Idle Time Faults"] || [])]
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                      const allWarnings = [...(selectedLog.connector1_summary["Idle Time Warnings"] || []), 
                                            ...(selectedLog.connector2_summary["Idle Time Warnings"] || [])]
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                      
                      return (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {allFaults.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">
                                🔴 Faults ({allFaults.length}):
                              </p>
                              <div className="space-y-2">
                                {allFaults.map((error, idx) => {
                                  const { displayText } = formatErrorDisplay(error.errorCode);
                                  return (
                                    <div key={idx} className="text-xs p-2 bg-red-500/5 rounded border border-red-500/20">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-red-600 dark:text-red-400">{displayText}</span>
                                        <span className="text-muted-foreground text-[10px]">{new Date(error.timestamp).toLocaleString()}</span>
                                      </div>
                                      <div className="text-muted-foreground space-y-0.5">
                                        <p>Status: <strong>{error.status}</strong> | Connector: <strong>{error.connectorId || 0}</strong></p>
                                        {error.info && error.info !== "None" && (
                                          <p>Info: <strong className="text-red-600 dark:text-red-400">{error.info}</strong></p>
                                        )}
                                        {error.vendorErrorCode && error.vendorErrorCode !== "None" && (
                                          <p>Vendor: <strong className="text-red-600 dark:text-red-400">{error.vendorErrorCode}</strong></p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {allWarnings.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                                ⚠️ Warnings ({allWarnings.length}):
                              </p>
                              <div className="space-y-2">
                                {allWarnings.map((error, idx) => {
                                  const { displayText } = formatErrorDisplay(error.errorCode);
                                  return (
                                    <div key={idx} className="text-xs p-2 bg-yellow-500/5 rounded border border-yellow-500/20">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-yellow-600 dark:text-yellow-400">{displayText}</span>
                                        <span className="text-muted-foreground text-[10px]">{new Date(error.timestamp).toLocaleString()}</span>
                                      </div>
                                      <div className="text-muted-foreground space-y-0.5">
                                        <p>Status: <strong>{error.status}</strong> | Connector: <strong>{error.connectorId || 0}</strong></p>
                                        {error.info && error.info !== "None" && (
                                          <p>Info: <strong className="text-yellow-600 dark:text-yellow-400">{error.info}</strong></p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              <DialogFooter>
                <div className="flex gap-2 w-full justify-between">
                  <Button variant="default" onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleDeleteClick}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                    <Button variant="outline" onClick={handleCloseModal}>Close</Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the log file
              and its associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
