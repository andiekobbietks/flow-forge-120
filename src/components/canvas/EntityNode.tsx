import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface Field {
  name: string;
  type: string;
  constraint: string;
}

const EntityNode = ({ data, selected }: NodeProps) => {
  const [label, setLabel] = useState((data as any).label || "Entity");
  const [fields, setFields] = useState<Field[]>((data as any).fields || []);
  const [isEditing, setIsEditing] = useState(false);

  const addField = () => {
    setFields([...fields, { name: "new_field", type: "VARCHAR(255)", constraint: "" }]);
  };

  const removeField = (i: number) => {
    setFields(fields.filter((_, idx) => idx !== i));
  };

  return (
    <div
      className={`min-w-[220px] rounded-md border-2 bg-card shadow-lg transition-colors ${
        selected ? "border-forge-blueprint shadow-forge-blueprint/20" : "border-forge-blueprint/40"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-forge-blueprint !w-3 !h-3 !border-2 !border-card" />

      {/* Header */}
      <div className="flex items-center gap-2 rounded-t-sm bg-forge-blueprint/10 px-3 py-2">
        <span className="text-xs font-bold text-forge-blueprint">🔵 BLUEPRINT</span>
        <span className="ml-auto text-[10px] text-muted-foreground">Entity</span>
      </div>

      {/* Entity name */}
      <div className="border-b border-border px-3 py-2">
        {isEditing ? (
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
            className="h-6 border-0 bg-transparent p-0 text-sm font-bold focus-visible:ring-0"
            autoFocus
          />
        ) : (
          <span
            className="cursor-pointer text-sm font-bold text-foreground"
            onDoubleClick={() => setIsEditing(true)}
          >
            {label}
          </span>
        )}
      </div>

      {/* Fields */}
      <div className="px-3 py-2 space-y-1">
        {fields.map((f, i) => (
          <div key={i} className="group flex items-center gap-1 text-xs font-mono">
            <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
            <span className="text-foreground">{f.name}</span>
            <span className="text-muted-foreground">{f.type}</span>
            {f.constraint && (
              <span className="rounded bg-forge-blueprint/10 px-1 text-[10px] text-forge-blueprint">
                {f.constraint}
              </span>
            )}
            <button
              onClick={() => removeField(i)}
              className="ml-auto opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-full justify-start gap-1 px-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={addField}
        >
          <Plus className="h-3 w-3" /> Add field
        </Button>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-forge-blueprint !w-3 !h-3 !border-2 !border-card" />
    </div>
  );
};

export default EntityNode;
