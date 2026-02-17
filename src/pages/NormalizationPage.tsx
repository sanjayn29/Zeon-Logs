import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, GitCompare } from "lucide-react";

export default function NormalizationPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Log Normalization</h2>
          <p className="text-sm text-muted-foreground mt-1">Standardize your charger logs for consistent analysis.</p>
        </div>
      </div>

      {/* Empty State */}
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
