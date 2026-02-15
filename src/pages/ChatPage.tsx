import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
}

const presetReplies: Record<string, string> = {
  "which connector fails the most": "Based on the analyzed logs, **CHAdeMO-01** has the highest failure rate at 28%, primarily caused by Connector Timeout errors (14 occurrences). Recommend scheduling maintenance inspection.",
  "what is the average charging session duration": "The average charging session duration across all connectors is approximately **47 minutes**, with CCS2 connectors averaging 42 min and Type 2 connectors averaging 55 min.",
  "what are the peak charging hours": "Peak charging activity is observed between **8:00 AM - 10:00 AM** and **5:00 PM - 7:00 PM**, aligning with typical commuter patterns. Friday sees the highest overall volume.",
};

const suggestions = [
  "Which connector fails the most",
  "What is the average charging session duration",
  "What are the peak charging hours",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "bot", text: "Hi! I'm **ChargeSense AI**. Ask me anything about your EV charger logs — connector health, error patterns, usage trends, and more." },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const key = text.trim().toLowerCase();
      const reply = presetReplies[key] || "That's a great question! In a production environment, I'd analyze your uploaded log data to provide detailed insights. Try asking about connector failures, session durations, or peak hours.";
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "bot", text: reply }]);
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-5rem)]">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Ask ChargeSense</h2>
        <p className="text-sm text-muted-foreground mt-1">Natural-language Q&A about your charger data.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "bot" && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}
              >
                {msg.text.split("**").map((part, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className="font-semibold">{part}</strong>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask about charging sessions, errors, connectors..."
          className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          onClick={() => sendMessage(input)}
          size="icon"
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-[46px] w-[46px] rounded-lg"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
