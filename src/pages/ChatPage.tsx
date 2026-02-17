import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "bot", text: "Hi! I'm **ChargeSense AI**. I'll help you analyze your EV charger logs once you upload them. I can answer questions about connector health, error patterns, usage trends, and more." },
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
      const reply = "I'm ready to help analyze your charger logs! Please upload your log files first, and then I'll be able to provide detailed insights about connector performance, error patterns, charging trends, and more.";
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
