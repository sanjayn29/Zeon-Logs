import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, ArrowRight, GitCompare, FileText, Database, Zap, Activity, Gauge, Battery, TrendingUp, AlertCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

const BACKEND_API = "http://localhost:8000";

interface UploadedFile {
  name: string;
  size: string;
  type: string;
  status: string;
}

interface LocationState {
  uploadedFiles?: UploadedFile[];
  documentIds?: string[];
  fromUpload?: boolean;
}

interface LogStats {
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  incompleteSessions: number;
  totalEnergy: number;
  averageDuration: number;
  averagePower: number;
  peakPower: number;
}

export default function NormalizationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const state = location.state as LocationState;
  const uploadedFiles = state?.uploadedFiles || [];
  const documentIds = state?.documentIds || [];
  const hasFiles = uploadedFiles.length > 0;
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasFiles) {
      if (documentIds.length > 0) {
        fetchStatsByIds();
      } else if (user?.email) {
        fetchLatestStats();
      }
    } else {
      setLoading(false);
    }
  }, [hasFiles, documentIds, user]);

  const fetchStatsByIds = async () => {
    try {
      const response = await fetch(`${BACKEND_API}/get-by-ids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentIds),
      });
      const result = await response.json();
      
      if (result.status === "success" && result.data.length > 0) {
        // Aggregate stats from all fetched documents
        let totalStats = {
          totalSessions: 0,
          successfulSessions: 0,
          failedSessions: 0,
          incompleteSessions: 0,
          totalEnergy: 0,
          totalDuration: 0,
          totalPower: 0,
          maxPeakPower: 0,
          dataCount: 0,
        };

        result.data.forEach((doc: any) => {
          const c1 = doc.connector1_summary;
          const c2 = doc.connector2_summary;
          
          totalStats.totalSessions += (c1["Total Sessions"] || 0) + (c2["Total Sessions"] || 0);
          totalStats.successfulSessions += (c1["Successful Sessions"] || 0) + (c2["Successful Sessions"] || 0);
          totalStats.failedSessions += (c1["Failed Sessions"] || 0) + (c2["Failed Sessions"] || 0);
          totalStats.incompleteSessions += (c1["Incomplete Sessions"] || 0) + (c2["Incomplete Sessions"] || 0);
          totalStats.totalEnergy += (c1["Total Energy (kWh)"] || 0) + (c2["Total Energy (kWh)"] || 0);
          totalStats.totalDuration += (c1["Average Duration (minutes)"] || 0) + (c2["Average Duration (minutes)"] || 0);
          totalStats.totalPower += (c1["Average Power (kW)"] || 0) + (c2["Average Power (kW)"] || 0);
          totalStats.maxPeakPower = Math.max(totalStats.maxPeakPower, c1["Peak Power (kW)"] || 0, c2["Peak Power (kW)"] || 0);
          totalStats.dataCount += 2; // 2 connectors per document
        });
        
        setStats({
          totalSessions: totalStats.totalSessions,
          successfulSessions: totalStats.successfulSessions,
          failedSessions: totalStats.failedSessions,
          incompleteSessions: totalStats.incompleteSessions,
          totalEnergy: totalStats.totalEnergy,
          averageDuration: totalStats.dataCount > 0 ? totalStats.totalDuration / totalStats.dataCount : 0,
          averagePower: totalStats.dataCount > 0 ? totalStats.totalPower / totalStats.dataCount : 0,
          peakPower: totalStats.maxPeakPower,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats by IDs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestStats = async () => {
    try {
      const response = await fetch(`${BACKEND_API}/user-data/${user?.email}`);
      const result = await response.json();
      
      if (result.status === "success" && result.data.length > 0) {
        // Get the latest uploaded file
        const latestData = result.data[result.data.length - 1];
        const c1 = latestData.connector1_summary;
        const c2 = latestData.connector2_summary;
        
        // Combine stats from both connectors
        setStats({
          totalSessions: (c1["Total Sessions"] || 0) + (c2["Total Sessions"] || 0),
          successfulSessions: (c1["Successful Sessions"] || 0) + (c2["Successful Sessions"] || 0),
          failedSessions: (c1["Failed Sessions"] || 0) + (c2["Failed Sessions"] || 0),
          incompleteSessions: (c1["Incomplete Sessions"] || 0) + (c2["Incomplete Sessions"] || 0),
          totalEnergy: (c1["Total Energy (kWh)"] || 0) + (c2["Total Energy (kWh)"] || 0),
          averageDuration: ((c1["Average Duration (minutes)"] || 0) + (c2["Average Duration (minutes)"] || 0)) / 2,
          averagePower: ((c1["Average Power (kW)"] || 0) + (c2["Average Power (kW)"] || 0)) / 2,
          peakPower: Math.max(c1["Peak Power (kW)"] || 0, c2["Peak Power (kW)"] || 0),
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Log Normalization</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasFiles ? "Your logs have been processed and normalized" : "Standardize your charger logs for consistent analysis"}
          </p>
        </div>
      </div>

      {hasFiles ? (
        <>
          {/* File Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glow-card rounded-xl bg-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Uploaded Log Files</h3>
                <p className="text-sm text-muted-foreground">{uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} processed successfully</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.size} · {file.type}
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              ))}
            </div>
          </motion.div>

          

          {/* Log File Statistics - RESTORED */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glow-card rounded-xl bg-card p-6 text-center"
            >
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading statistics...</p>
            </motion.div>
          ) : stats ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glow-card rounded-xl bg-card p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-foreground">Uploaded File Statistics</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500 font-medium">
                      This Upload Only
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Metrics for the file(s) you just uploaded</p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Sessions */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <p className="text-xs font-medium text-muted-foreground">TOTAL SESSIONS</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalSessions}</p>
                </div>

                {/* Successful Sessions */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <p className="text-xs font-medium text-muted-foreground">SUCCESSFUL</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.successfulSessions}</p>
                </div>

                {/* Failed Sessions */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-xs font-medium text-muted-foreground">FAILED</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.failedSessions}</p>
                </div>

                {/* Incomplete Sessions */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <p className="text-xs font-medium text-muted-foreground">INCOMPLETE</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.incompleteSessions}</p>
                </div>

                {/* Total Energy */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Battery className="w-5 h-5 text-purple-500" />
                    <p className="text-xs font-medium text-muted-foreground">TOTAL ENERGY</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalEnergy.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">kWh</p>
                </div>

                {/* Average Duration */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-cyan-500" />
                    <p className="text-xs font-medium text-muted-foreground">AVG DURATION</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.averageDuration.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">minutes</p>
                </div>

                {/* Average Power */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-5 h-5 text-orange-500" />
                    <p className="text-xs font-medium text-muted-foreground">AVG POWER</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.averagePower.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">kW</p>
                </div>

                {/* Peak Power */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/10 to-pink-600/10 border border-pink-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-pink-500" />
                    <p className="text-xs font-medium text-muted-foreground">PEAK POWER</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.peakPower.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">kW</p>
                </div>
              </div>
            </motion.div>
          ) : null}

          {/* Normalization Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glow-card rounded-xl bg-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Normalization Complete</h3>
                <p className="text-sm text-muted-foreground">All data has been standardized and stored</p>
              </div>
            </div>
            
            <div className="grid gap-3 md:grid-cols-3 mt-4">
              <div className="p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-xs font-medium text-muted-foreground">TIMESTAMPS</p>
                </div>
                <p className="text-sm text-foreground">ISO 8601 Format</p>
              </div>
              <div className="p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-xs font-medium text-muted-foreground">CONNECTOR IDs</p>
                </div>
                <p className="text-sm text-foreground">Standardized Mapping</p>
              </div>
              <div className="p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-xs font-medium text-muted-foreground">STATUS CODES</p>
                </div>
                <p className="text-sm text-foreground">Unified Classification</p>
              </div>
            </div>
          </motion.div>

          {/* Proceed to Dashboard Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground text-center">
                <span className="font-medium text-foreground">Next:</span> View your <span className="font-semibold text-primary">cumulative statistics</span> from all uploaded files in the Dashboard
              </p>
            </div>
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              <Zap className="w-4 h-4 mr-2" />
              View Cumulative Dashboard
            </Button>
          </motion.div>
        </>
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glow-card rounded-xl bg-card p-12 text-center"
        >
          <GitCompare className="w-16 h-16 text-primary/40 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Logs to Normalize</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Upload your charger log files first. The system will automatically standardize timestamps, 
            connector IDs, status codes, and handle null values for consistent analysis.
          </p>
          <Button
            onClick={() => navigate("/upload")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Upload Logs
          </Button>
        </motion.div>
      )}

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glow-card rounded-xl bg-card p-5">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Timestamp Standardization</h3>
          <p className="text-sm text-muted-foreground">
            Converts all date-time formats to ISO 8601 standard
          </p>
        </div>
        <div className="glow-card rounded-xl bg-card p-5">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Connector ID Mapping</h3>
          <p className="text-sm text-muted-foreground">
            Standardizes connector naming across different formats
          </p>
        </div>
        <div className="glow-card rounded-xl bg-card p-5">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Status Code Unification</h3>
          <p className="text-sm text-muted-foreground">
            Maps various status descriptions to standard codes
          </p>
        </div>
      </div>
    </div>
  );
}
