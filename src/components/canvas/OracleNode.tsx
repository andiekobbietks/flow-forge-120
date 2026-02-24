import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Brain } from "lucide-react";

const OracleNode = ({ data, selected }: NodeProps) => {
  return (
    <div
      className={`min-w-[200px] rounded-md border-2 bg-card shadow-lg transition-colors ${
        selected ? "border-forge-oracle shadow-forge-oracle/20" : "border-forge-oracle/40"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-forge-oracle !w-3 !h-3 !border-2 !border-card" />

      <div className="flex items-center gap-2 rounded-t-sm bg-forge-oracle/10 px-3 py-2">
        <span className="text-xs font-bold text-forge-oracle">🟣 ORACLE</span>
      </div>
      <div className="flex items-center gap-3 px-3 py-3">
        <Brain className="h-5 w-5 text-forge-oracle" />
        <div>
          <p className="text-sm font-medium text-foreground">AI Validation</p>
          <p className="text-xs text-muted-foreground">{(data as any).label || "Schema looks good ✓"}</p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-forge-oracle !w-3 !h-3 !border-2 !border-card" />
    </div>
  );
};

export default OracleNode;
