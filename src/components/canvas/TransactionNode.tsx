import { Handle, Position, type NodeProps } from "@xyflow/react";

const TransactionNode = ({ data, selected }: NodeProps) => {
  const operation = (data as any).operation || "CREATE";

  return (
    <div
      className={`min-w-[180px] rounded-md border-2 bg-card shadow-lg transition-colors ${
        selected ? "border-forge-transaction shadow-forge-transaction/20" : "border-forge-transaction/40"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-forge-transaction !w-3 !h-3 !border-2 !border-card" />

      <div className="flex items-center gap-2 rounded-t-sm bg-forge-transaction/10 px-3 py-2">
        <span className="text-xs font-bold text-forge-transaction">🟠 TRANSACTION</span>
      </div>

      <div className="px-3 py-3 text-center">
        <span className="rounded-md bg-forge-transaction/10 px-3 py-1 font-mono text-sm font-bold text-forge-transaction">
          {operation}
        </span>
        <p className="mt-2 text-xs text-muted-foreground">{(data as any).label}</p>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-forge-transaction !w-3 !h-3 !border-2 !border-card" />
    </div>
  );
};

export default TransactionNode;
