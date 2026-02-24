import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TerminalPanelProps {
  output: string[];
  onCommand: (cmd: string) => void;
}

const TerminalPanel = ({ output, onCommand }: TerminalPanelProps) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  const handleSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      onCommand(input.trim());
      setInput("");
    }
  };

  return (
    <div className="flex h-full flex-col bg-terminal-bg">
      {/* Terminal header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-1.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-forge-forge" />
          <div className="h-2.5 w-2.5 rounded-full bg-forge-transaction" />
          <div className="h-2.5 w-2.5 rounded-full bg-forge-plumbing" />
        </div>
        <span className="text-xs font-mono text-muted-foreground">LAMPForge CLI</span>
      </div>

      {/* Output */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 font-mono text-sm">
        {output.map((line, i) => (
          <div key={i} className="leading-relaxed">
            {line.startsWith("--") ? (
              <span className="text-forge-plumbing">{line}</span>
            ) : line.startsWith("lampforge>") ? (
              <span className="text-terminal-fg">{line}</span>
            ) : line.startsWith("ALTER") || line.startsWith("CREATE") || line.startsWith("SELECT") ? (
              <span className="text-forge-blueprint">{line}</span>
            ) : (
              <span className="text-terminal-fg/80">{line}</span>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center border-t border-border px-4 py-2">
        <span className="mr-2 font-mono text-sm text-terminal-fg">$</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleSubmit}
          placeholder="Type SQL or 'help'..."
          className="flex-1 bg-transparent font-mono text-sm text-terminal-fg outline-none placeholder:text-muted-foreground"
        />
        <span className="animate-type-cursor font-mono text-terminal-cursor">▌</span>
      </div>
    </div>
  );
};

export default TerminalPanel;
