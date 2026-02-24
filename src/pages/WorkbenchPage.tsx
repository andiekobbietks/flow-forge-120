import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flame, ArrowLeft, Play, Clock, Database, TableIcon } from "lucide-react";
import CodeEditor from "@/components/canvas/CodeEditor";

interface QueryResult {
  columns: string[];
  rows: string[][];
}

interface QueryHistory {
  sql: string;
  timestamp: string;
  rowsAffected: number;
}

const WorkbenchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("SELECT * FROM information_schema.tables;");
  const [results, setResults] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<QueryHistory[]>([
    { sql: "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));", timestamp: new Date().toISOString(), rowsAffected: 0 },
  ]);
  const [activeTab, setActiveTab] = useState("editor");

  const runQuery = () => {
    // Mock execution
    const entry: QueryHistory = {
      sql: query,
      timestamp: new Date().toISOString(),
      rowsAffected: 0,
    };
    setHistory((prev) => [entry, ...prev]);
    setResults({
      columns: ["TABLE_NAME", "TABLE_TYPE", "ENGINE"],
      rows: [
        ["users", "BASE TABLE", "InnoDB"],
        ["books", "BASE TABLE", "InnoDB"],
      ],
    });
  };

  return (
    <div className="dark flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Flame className="h-5 w-5 text-forge-transaction" />
          <span className="font-semibold">SQL Workbench</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/canvas")}>
            Canvas
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/evidence")}>
            Evidence
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Schema viewer */}
        <div className="w-64 border-r border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4 text-forge-blueprint" />
              Schema Explorer
            </h3>
          </div>
          <ScrollArea className="h-full p-3">
            <div className="space-y-2">
              {["users", "books", "loans"].map((table) => (
                <div
                  key={table}
                  className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
                  onClick={() => setQuery(`SELECT * FROM ${table};`)}
                >
                  <div className="flex items-center gap-2">
                    <TableIcon className="h-3.5 w-3.5 text-forge-blueprint" />
                    <span className="font-mono">{table}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Editor + Results */}
        <div className="flex flex-1 flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-border px-4">
              <TabsList className="h-auto bg-transparent p-0">
                <TabsTrigger value="editor" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  Query Editor
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  <Clock className="mr-1.5 h-3 w-3" />
                  History ({history.length})
                </TabsTrigger>
              </TabsList>
              <Button size="sm" onClick={runQuery} className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                Run Query
              </Button>
            </div>

            <TabsContent value="editor" className="mt-0 flex flex-1 flex-col">
              <div className="h-48 border-b border-border">
                <CodeEditor value={query} language="sql" onChange={setQuery} />
              </div>

              {/* Results grid */}
              <div className="flex-1 overflow-auto">
                {results ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {results.columns.map((col) => (
                          <TableHead key={col} className="font-mono text-xs">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.rows.map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => (
                            <TableCell key={j} className="font-mono text-xs">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <p className="text-sm">Run a query to see results</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0 flex-1 overflow-auto">
              <ScrollArea className="h-full">
                <div className="space-y-2 p-4">
                  {history.map((h, i) => (
                    <div
                      key={i}
                      className="cursor-pointer rounded-md border border-border p-3 transition-colors hover:bg-accent"
                      onClick={() => {
                        setQuery(h.sql);
                        setActiveTab("editor");
                      }}
                    >
                      <code className="block text-xs font-mono text-foreground">{h.sql}</code>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default WorkbenchPage;
