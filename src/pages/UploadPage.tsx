import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ACCEPTED = [".csv", ".xlsx", ".xls"];
const BACKEND_API = "http://localhost:8000";

interface UploadedFile {
  name: string;
  size: string;
  type: string;
  status: "uploading" | "done" | "error";
  errorMessage?: string;
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const processFile = useCallback(async (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const valid = ACCEPTED.includes(ext);
    const entry: UploadedFile = {
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      type: ext.replace(".", "").toUpperCase(),
      status: valid ? "uploading" : "error",
      errorMessage: valid ? undefined : "Unsupported file format"
    };
    setFiles((prev) => [...prev, entry]);

    if (valid && user?.email) {
      try {
        // Upload to backend
        const formData = new FormData();
        formData.append("file", file);
        formData.append("user_email", user.email);
        formData.append("data_source", "cms");

        const response = await fetch(`${BACKEND_API}/process-file`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        // Mark as done
        setFiles((prev) =>
          prev.map((f) => (f.name === file.name ? { ...f, status: "done" } : f))
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) => 
            f.name === file.name 
              ? { ...f, status: "error", errorMessage: "Processing failed" } 
              : f
          )
        );
      }
    }
  }, [user]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      Array.from(e.dataTransfer.files).forEach(processFile);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) Array.from(e.target.files).forEach(processFile);
    },
    [processFile]
  );

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const doneCount = files.filter((f) => f.status === "done").length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Upload Charger Logs</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Drop your EV charger log files to begin analysis. Supports CSV and Excel formats.
        </p>
      </div>

      {/* Drop zone */}
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 bg-card"
        }`}
        whileHover={{ scale: 1.005 }}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED.join(",")}
          onChange={handleFileInput}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Drag & drop files here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse · CSV, XLSX</p>
          </div>
        </div>
      </motion.div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2"
          >
            {files.map((file) => (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
              >
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.size} · {file.type}
                  </p>
                </div>
                {file.status === "uploading" && (
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                )}
                {file.status === "done" && <CheckCircle className="w-5 h-5 text-accent" />}
                {file.status === "error" && <AlertCircle className="w-5 h-5 text-destructive" />}
                <button onClick={() => removeFile(file.name)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {doneCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
          >
            View Analysis ({doneCount} file{doneCount > 1 ? "s" : ""} processed)
          </Button>
        </motion.div>
      )}
    </div>
  );
}
