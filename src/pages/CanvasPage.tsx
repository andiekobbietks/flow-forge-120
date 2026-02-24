import { useCallback, useState, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Flame, Database, FileCode, Plus, Play, ArrowLeft } from "lucide-react";
import EntityNode from "@/components/canvas/EntityNode";
import TransactionNode from "@/components/canvas/TransactionNode";
import ForgeStatusNode from "@/components/canvas/ForgeStatusNode";
import OracleNode from "@/components/canvas/OracleNode";
import WebContainerEditor, { type WebContainerEditorHandle } from "@/components/canvas/WebContainerEditor";
import TerminalPanel from "@/components/canvas/TerminalPanel";

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const CanvasPage = () => {
  const navigate = useNavigate();
  const editorRef = useRef<WebContainerEditorHandle>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "LAMPForge CLI v1.0.0",
    "Type 'help' for available commands.",
    "",
    "lampforge> ",
  ]);

  const nodeTypes = useMemo(
    () => ({
      entity: EntityNode,
      transaction: TransactionNode,
      forgeStatus: ForgeStatusNode,
      oracle: OracleNode,
    }),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "hsl(142, 72%, 50%)" } }, eds));
      // Animate SQL in terminal
      const sql = `ALTER TABLE ... ADD FOREIGN KEY (...) REFERENCES ...;`;
      setTerminalOutput((prev) => [...prev, `-- Relationship created`, sql, "", "lampforge> "]);
    },
    [setEdges]
  );

  const addEntityNode = () => {
    const id = `entity-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "entity",
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
      data: {
        label: "NewEntity",
        fields: [
          { name: "id", type: "INT", constraint: "PRIMARY KEY" },
          { name: "name", type: "VARCHAR(255)", constraint: "NOT NULL" },
        ],
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addTransactionNode = () => {
    const id = `txn-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "transaction",
      position: { x: 400 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { label: "CRUD Operation", operation: "CREATE" },
    };
    setNodes((nds) => [...nds, newNode]);
  };


  return (
    <div className="dark flex h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Flame className="h-5 w-5 text-forge-transaction" />
          <span className="font-semibold">LAMPForge Canvas</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/workbench")}>
            <Database className="mr-1.5 h-4 w-4" />
            SQL Workbench
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/evidence")}>
            <FileCode className="mr-1.5 h-4 w-4" />
            Evidence
          </Button>
          <Button size="sm" className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
        </div>
      </header>

      {/* Main content */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={70} minSize={40}>
          <ResizablePanelGroup direction="horizontal">
            {/* Pane A: Architecture Canvas */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="relative h-full">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  fitView
                  className="bg-background"
                >
                  <Background gap={20} size={1} />
                  <Controls className="!bg-card !border-border !shadow-none [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
                  <MiniMap
                    nodeColor={(n) => {
                      if (n.type === "entity") return "hsl(210, 100%, 60%)";
                      if (n.type === "transaction") return "hsl(32, 95%, 60%)";
                      if (n.type === "forgeStatus") return "hsl(0, 72%, 55%)";
                      if (n.type === "oracle") return "hsl(270, 70%, 65%)";
                      return "hsl(220, 15%, 16%)";
                    }}
                    className="!bg-card !border-border"
                  />
                  <Panel position="top-left" className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={addEntityNode}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span className="text-forge-blueprint">■</span> Entity
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={addTransactionNode}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span className="text-forge-transaction">■</span> Transaction
                    </Button>
                  </Panel>
                </ReactFlow>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Pane B: WebContainer Editor */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <WebContainerEditor ref={editorRef} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Bottom: Terminal */}
        <ResizablePanel defaultSize={30} minSize={15}>
          <TerminalPanel output={terminalOutput} onCommand={(cmd) => {
            setTerminalOutput((prev) => [...prev, `lampforge> ${cmd}`, `Executing: ${cmd}`, "", "lampforge> "]);
          }} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CanvasPage;
