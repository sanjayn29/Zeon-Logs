import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const GROQ_API_KEY = "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";
const BACKEND_API = "http://localhost:8000";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
  isLoading?: boolean;
}

interface UserData {
  filename: string;
  upload_time: string;
  connector1_summary: any;
  connector2_summary: any;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "bot", text: "Hi! I'm **Zeon AI**. I can help you analyze your EV charger logs. Ask me about connector health, error patterns, session statistics, energy consumption, and more!" },
  ]);
  const [input, setInput] = useState("");
  const [userData, setUserData] = useState<UserData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (user?.email) {
      fetchUserData();
    } else {
      setIsLoadingData(false);
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${BACKEND_API}/user-data/${user?.email}`);
      const result = await response.json();
      if (result.status === "success") {
        setUserData(result.data);
        if (result.data.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              role: "bot",
              text: `I've loaded **${result.data.length} log file(s)** from your account. You can now ask me questions about your charging data!`,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const createDataContext = (userData: UserData[]) => {
    if (userData.length === 0) {
      return "No charging session data available yet.";
    }

    const summary = userData.map((log, index) => {
      const c1 = log.connector1_summary;
      const c2 = log.connector2_summary;
      
      return `
Log File ${index + 1}: ${log.filename}
- Uploaded: ${log.upload_time}
- Connector 1: ${c1["Total Sessions"]} sessions (${c1["Successful Sessions"]} successful, ${c1["Failed Sessions"]} failed)
  * Energy: ${c1["Total Energy (kWh)"]} kWh
  * Avg Power: ${c1["Average Power (kW)"]} kW
  * Peak Power: ${c1["Peak Power (kW)"]} kW
  * Idle Errors: ${c1["Idle Time Error Count"] || 0}
  * Pre-charging Failures: ${c1["Precharging Failures"] || 0}
  * Failed Reasons: ${JSON.stringify(c1["Failed Session Reasons"] || {})}
- Connector 2: ${c2["Total Sessions"]} sessions (${c2["Successful Sessions"]} successful, ${c2["Failed Sessions"]} failed)
  * Energy: ${c2["Total Energy (kWh)"]} kWh
  * Avg Power: ${c2["Average Power (kW)"]} kW
  * Peak Power: ${c2["Peak Power (kW)"]} kW
  * Idle Errors: ${c2["Idle Time Error Count"] || 0}
  * Pre-charging Failures: ${c2["Precharging Failures"] || 0}
  * Failed Reasons: ${JSON.stringify(c2["Failed Session Reasons"] || {})}
`;
    }).join("\n---\n");

    return summary;
  };

  const recommendedQuestions = [
    "How many total charging sessions do I have?",
    "Which connector has more errors?",
    "What are the most common error types?",
    "Compare energy consumption between connectors",
    "What's my charging success rate?",
    "Show me idle time error statistics",
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: Message = { id: Date.now(), role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Add loading message
    const loadingMsg: Message = { id: Date.now() + 1, role: "bot", text: "", isLoading: true };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      const dataContext = createDataContext(userData);
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are Zeon AI, an expert assistant for analyzing EV charging station data. You help users understand their OCPP charging logs.

**Available Data:**
${dataContext}

**Your Role:**
- Answer questions about charging sessions, connectors, errors, and performance metrics
- Provide insights on energy consumption, power usage, and session success rates
- Explain error patterns and suggest troubleshooting steps
- Compare connector performance
- Be concise but informative
- Use the data above to answer questions accurately
- If data is not available, clearly state that

**Format:**
- Use bullet points for clarity
- Highlight important numbers
- Be friendly and professional`,
            },
            {
              role: "user",
              content: text.trim(),
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI");
      }

      const data = await response.json();
      const botReply = data.choices[0]?.message?.content || "Sorry, I couldn't process that request.";

      // Remove loading message and add real response
      setMessages((prev) =>
        prev.filter((msg) => !msg.isLoading).concat({
          id: Date.now() + 2,
          role: "bot",
          text: botReply,
        })
      );
    } catch (error) {
      console.error("Error calling Groq API:", error);
      setMessages((prev) =>
        prev.filter((msg) => !msg.isLoading).concat({
          id: Date.now() + 2,
          role: "bot",
          text: "Sorry, I encountered an error. Please try again.",
        })
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-5rem)]">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Ask Zeon AI</h2>
        <p className="text-sm text-muted-foreground mt-1">Natural-language Q&A about your charger data.</p>
        {isLoadingData && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading your data...</span>
          </div>
        )}
        {!isLoadingData && userData.length === 0 && (
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            No logs uploaded yet. Upload logs to start asking questions!
          </div>
        )}
        {!isLoadingData && userData.length > 0 && (
          <div className="mt-2 text-xs text-green-600 dark:text-green-400">
            ✓ {userData.length} log file(s) loaded
          </div>
        )}
      </div>

      {/* Recommended Questions */}
      {!isLoadingData && userData.length > 0 && messages.filter(m => m.role === "user").length === 0 && (
        <div className="mb-4 p-4 bg-card border border-border rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-3">💡 Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {recommendedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => sendMessage(question)}
                className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full border border-primary/20 transition-colors duration-200"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

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
                  {msg.isLoading ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary" />
                  )}
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}
              >
                {msg.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {msg.text.split("\n").map((line, lineIndex) => {
                      // Handle bullet points
                      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                        return (
                          <div key={lineIndex} className="flex gap-2 ml-2">
                            <span className="text-primary">•</span>
                            <span className="flex-1">
                              {line.replace(/^[\-\*]\s/, "").split("**").map((part, i) =>
                                i % 2 === 1 ? (
                                  <strong key={i} className="font-semibold">{part}</strong>
                                ) : (
                                  <span key={i}>{part}</span>
                                )
                              )}
                            </span>
                          </div>
                        );
                      }
                      // Handle regular text with bold
                      return (
                        <div key={lineIndex}>
                          {line.split("**").map((part, i) =>
                            i % 2 === 1 ? (
                              <strong key={i} className="font-semibold">{part}</strong>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
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
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Ask about charging sessions, errors, connectors..."
          className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isLoadingData}
        />
        <Button
          onClick={() => sendMessage(input)}
          size="icon"
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-[46px] w-[46px] rounded-lg disabled:opacity-50"
          disabled={isLoadingData || !input.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
