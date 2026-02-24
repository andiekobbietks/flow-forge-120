import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Flame, ArrowLeft, Download, Camera, Clock, FileText, Database, Code } from "lucide-react";

interface LogEntry {
  id: string;
  type: "screenshot" | "sql" | "code" | "milestone";
  title: string;
  description: string;
  timestamp: string;
  stage: string;
}

const mockLogs: LogEntry[] = [
  { id: "1", type: "milestone", title: "Project Initialized", description: "LAMPForge project created from intent declaration.", timestamp: new Date(Date.now() - 3600000).toISOString(), stage: "Analysis" },
  { id: "2", type: "sql", title: "Schema Generated", description: "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255));", timestamp: new Date(Date.now() - 3000000).toISOString(), stage: "Design" },
  { id: "3", type: "code", title: "CRUD Generated", description: "Auto-generated PHP CRUD operations for 'users' entity.", timestamp: new Date(Date.now() - 2400000).toISOString(), stage: "Implementation" },
  { id: "4", type: "screenshot", title: "Canvas Snapshot", description: "Architectural canvas with 3 entities and 2 relationships.", timestamp: new Date(Date.now() - 1800000).toISOString(), stage: "Implementation" },
  { id: "5", type: "sql", title: "Query Executed", description: "SELECT * FROM users WHERE id = 1;", timestamp: new Date(Date.now() - 1200000).toISOString(), stage: "Testing" },
];

const stageColors: Record<string, string> = {
  Analysis: "bg-forge-oracle/10 text-forge-oracle border-forge-oracle/30",
  Design: "bg-forge-blueprint/10 text-forge-blueprint border-forge-blueprint/30",
  Implementation: "bg-forge-transaction/10 text-forge-transaction border-forge-transaction/30",
  Testing: "bg-forge-plumbing/10 text-forge-plumbing border-forge-plumbing/30",
  Evaluation: "bg-forge-forge/10 text-forge-forge border-forge-forge/30",
};

const typeIcons: Record<string, typeof Camera> = {
  screenshot: Camera,
  sql: Database,
  code: Code,
  milestone: FileText,
};

const EvidencePage = () => {
  const navigate = useNavigate();
  const [logs] = useState<LogEntry[]>(mockLogs);

  return (
    <div className="dark flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Flame className="h-5 w-5 text-forge-transaction" />
          <span className="font-semibold">Evidence & SDLC Logger</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/canvas")}>
            Canvas
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/workbench")}>
            SQL Workbench
          </Button>
          <Button size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: SDLC stages */}
        <div className="w-56 border-r border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">SDLC Stages</h3>
          </div>
          <div className="space-y-1 p-3">
            {["Analysis", "Design", "Implementation", "Testing", "Evaluation"].map((stage) => {
              const count = logs.filter((l) => l.stage === stage).length;
              return (
                <div
                  key={stage}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <span>{stage}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {count}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Timeline */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <h2 className="mb-6 text-lg font-semibold">Development Timeline</h2>

            <div className="relative space-y-4">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

              {logs.map((log) => {
                const Icon = typeIcons[log.type];
                return (
                  <div key={log.id} className="relative flex gap-4 pl-10">
                    {/* Dot */}
                    <div className="absolute left-[13px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />

                    <Card className="flex-1 border-border bg-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {log.title}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={stageColors[log.stage]}>
                              {log.stage}
                            </Badge>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {log.type === "sql" ? (
                          <code className="block rounded bg-surface-code p-2 font-mono text-xs text-terminal-fg">
                            {log.description}
                          </code>
                        ) : (
                          <p className="text-sm text-muted-foreground">{log.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default EvidencePage;
