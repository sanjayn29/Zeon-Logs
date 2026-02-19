import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Zap, Upload, BarChart3, MessageCircle, GitCompare, Battery, Plug, TrendingUp, Shield, Clock, FileText, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import heroBg from "@/assets/hero-bg.jpg";

const BACKEND_API = "http://localhost:8000";

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
    title: "Ask Zeon AI",
    desc: "Natural-language Q&A about your charger performance and errors.",
    route: "/chat",
  },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface UserData {
  filename: string;
  upload_time: string;
  connector1_summary: any;
  connector2_summary: any;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLogs: 0,
    totalSessions: 0,
    totalEnergy: 0,
    successRate: 0,
    totalErrors: 0,
    avgPower: 0,
  });

  useEffect(() => {
    if (user?.email) {
      fetchUserData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${BACKEND_API}/user-data/${user?.email}`);
      const result = await response.json();
      if (result.status === "success") {
        setUserData(result.data);
        calculateStats(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: UserData[]) => {
    let totalSessions = 0;
    let totalEnergy = 0;
    let successfulSessions = 0;
    let totalErrors = 0;
    let totalPower = 0;
    let connectorCount = 0;

    data.forEach((log) => {
      const c1 = log.connector1_summary;
      const c2 = log.connector2_summary;

      totalSessions += (c1["Total Sessions"] || 0) + (c2["Total Sessions"] || 0);
      totalEnergy += parseFloat(c1["Total Energy (kWh)"] || 0) + parseFloat(c2["Total Energy (kWh)"] || 0);
      successfulSessions += (c1["Successful Sessions"] || 0) + (c2["Successful Sessions"] || 0);
      totalErrors += (c1["Idle Time Error Count"] || 0) + (c2["Idle Time Error Count"] || 0);
      totalErrors += (c1["Precharging Failures"] || 0) + (c2["Precharging Failures"] || 0);
      
      const c1Power = parseFloat(c1["Average Power (kW)"] || 0);
      const c2Power = parseFloat(c2["Average Power (kW)"] || 0);
      if (c1Power > 0) { totalPower += c1Power; connectorCount++; }
      if (c2Power > 0) { totalPower += c2Power; connectorCount++; }
    });

    setStats({
      totalLogs: data.length,
      totalSessions,
      totalEnergy: Math.round(totalEnergy * 100) / 100,
      successRate: totalSessions > 0 ? Math.round((successfulSessions / totalSessions) * 100) : 0,
      totalErrors,
      avgPower: connectorCount > 0 ? Math.round((totalPower / connectorCount) * 100) / 100 : 0,
    });
  };

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
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Zeon Charging</span>
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

      {/* Real-time Stats Grid */}
      {user && !isLoading && userData.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {/* Total Logs */}
          <div className="glow-card rounded-xl bg-card p-5 border-l-4 border-primary">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">LOGS</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.totalLogs}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Files</p>
          </div>

          {/* Total Sessions */}
          <div className="glow-card rounded-xl bg-card p-5 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">SESSIONS</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">Charging Sessions</p>
          </div>

          {/* Total Energy */}
          <div className="glow-card rounded-xl bg-card p-5 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">ENERGY</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.totalEnergy}</div>
            <p className="text-xs text-muted-foreground mt-1">kWh Delivered</p>
          </div>

          {/* Success Rate */}
          <div className="glow-card rounded-xl bg-card p-5 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">SUCCESS</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Success Rate</p>
          </div>

          {/* Total Errors */}
          <div className="glow-card rounded-xl bg-card p-5 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span className="text-xs font-medium text-muted-foreground">ERRORS</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.totalErrors}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Errors</p>
          </div>

          {/* Average Power */}
          <div className="glow-card rounded-xl bg-card p-5 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">POWER</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.avgPower}</div>
            <p className="text-xs text-muted-foreground mt-1">Avg kW</p>
          </div>
        </motion.div>
      ) : user && !isLoading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glow-card rounded-xl bg-card p-8 text-center"
        >
          <Zap className="w-12 h-12 text-primary/40 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Data Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your charger logs to see statistics and insights
          </p>
          <Button onClick={() => navigate("/upload")} size="sm" variant="outline">
            Upload Logs
          </Button>
        </motion.div>
      ) : null}

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
          {user && userData.length > 0 ? (
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {userData.slice(0, 5).map((log, idx) => {
                const totalSessions = (log.connector1_summary["Total Sessions"] || 0) + (log.connector2_summary["Total Sessions"] || 0);
                const date = new Date(log.upload_time);
                const timeAgo = getTimeAgo(date);
                
                return (
                  <div key={idx} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Upload className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{log.filename}</p>
                        <p className="text-xs text-muted-foreground mt-1">{totalSessions} sessions analyzed</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">{timeAgo}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Upload logs to see activity</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Connector Health Overview */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glow-card rounded-xl bg-card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Battery className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Connector Health Overview</h3>
        </div>
        {user && userData.length > 0 ? (
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Connector 1 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Plug className="w-4 h-4 text-primary" />
                    Connector 1
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    getConnectorHealthStatus(userData, 1) === 'Good' 
                      ? 'bg-green-500/10 text-green-500' 
                      : getConnectorHealthStatus(userData, 1) === 'Warning'
                      ? 'bg-orange-500/10 text-orange-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {getConnectorHealthStatus(userData, 1)}
                  </span>
                </div>
                <div className="space-y-2">
                  {getConnectorMetrics(userData, 1).map((metric, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{metric.label}</span>
                      <span className="font-medium text-foreground">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connector 2 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Plug className="w-4 h-4 text-primary" />
                    Connector 2
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    getConnectorHealthStatus(userData, 2) === 'Good' 
                      ? 'bg-green-500/10 text-green-500' 
                      : getConnectorHealthStatus(userData, 2) === 'Warning'
                      ? 'bg-orange-500/10 text-orange-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {getConnectorHealthStatus(userData, 2)}
                  </span>
                </div>
                <div className="space-y-2">
                  {getConnectorMetrics(userData, 2).map((metric, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{metric.label}</span>
                      <span className="font-medium text-foreground">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Battery className="w-12 h-12 text-primary/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No connector data available. Upload and analyze logs to monitor connector health.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Helper functions
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getConnectorHealthStatus(userData: UserData[], connectorNum: number): string {
  let totalSessions = 0;
  let failedSessions = 0;
  let totalErrors = 0;

  userData.forEach((log) => {
    const connector = connectorNum === 1 ? log.connector1_summary : log.connector2_summary;
    totalSessions += connector["Total Sessions"] || 0;
    failedSessions += connector["Failed Sessions"] || 0;
    totalErrors += (connector["Idle Time Error Count"] || 0) + (connector["Precharging Failures"] || 0);
  });

  const failureRate = totalSessions > 0 ? (failedSessions / totalSessions) * 100 : 0;
  
  if (failureRate > 20 || totalErrors > 50) return 'Critical';
  if (failureRate > 10 || totalErrors > 20) return 'Warning';
  return 'Good';
}

function getConnectorMetrics(userData: UserData[], connectorNum: number) {
  let totalSessions = 0;
  let successfulSessions = 0;
  let totalEnergy = 0;
  let totalErrors = 0;
  let totalPower = 0;
  let count = 0;

  userData.forEach((log) => {
    const connector = connectorNum === 1 ? log.connector1_summary : log.connector2_summary;
    totalSessions += connector["Total Sessions"] || 0;
    successfulSessions += connector["Successful Sessions"] || 0;
    totalEnergy += parseFloat(connector["Total Energy (kWh)"] || 0);
    totalErrors += (connector["Idle Time Error Count"] || 0) + (connector["Precharging Failures"] || 0);
    const power = parseFloat(connector["Average Power (kW)"] || 0);
    if (power > 0) {
      totalPower += power;
      count++;
    }
  });

  const successRate = totalSessions > 0 ? Math.round((successfulSessions / totalSessions) * 100) : 0;
  const avgPower = count > 0 ? Math.round((totalPower / count) * 100) / 100 : 0;

  return [
    { label: 'Total Sessions', value: totalSessions.toString() },
    { label: 'Success Rate', value: `${successRate}%` },
    { label: 'Total Energy', value: `${Math.round(totalEnergy * 100) / 100} kWh` },
    { label: 'Total Errors', value: totalErrors.toString() },
    { label: 'Avg Power', value: `${avgPower} kW` },
  ];
}
