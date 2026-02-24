import { type NodeProps } from "@xyflow/react";
import { Server, CheckCircle2 } from "lucide-react";

const ForgeStatusNode = ({ data, selected }: NodeProps) => {
  return (
    <div
      className={`min-w-[180px] rounded-md border-2 bg-card shadow-lg transition-colors ${
        selected ? "border-forge-forge shadow-forge-forge/20" : "border-forge-forge/40"
      }`}
    >
      <div className="flex items-center gap-2 rounded-t-sm bg-forge-forge/10 px-3 py-2">
        <span className="text-xs font-bold text-forge-forge">🔴 FORGE</span>
      </div>
      <div className="flex items-center gap-3 px-3 py-3">
        <Server className="h-5 w-5 text-forge-forge" />
        <div>
          <p className="text-sm font-medium text-foreground">Server Status</p>
          <div className="flex items-center gap-1 text-xs text-forge-plumbing">
            <CheckCircle2 className="h-3 w-3" />
            Provisioned
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgeStatusNode;
