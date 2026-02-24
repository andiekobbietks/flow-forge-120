import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import sdk, { type VM } from "@stackblitz/sdk";
import { buildProject, getDefaultFiles } from "@/lib/webcontainer-project";

export interface WebContainerEditorHandle {
  /** Update files in the running WebContainer */
  applyFsDiff: (create: Record<string, string>, destroy?: string[]) => Promise<void>;
  /** Get a snapshot of the filesystem */
  getFsSnapshot: () => Promise<Record<string, string> | undefined>;
}

interface WebContainerEditorProps {
  /** Initial files to embed (beyond defaults) */
  files?: Record<string, string>;
  /** File to open initially */
  openFile?: string;
}

const WebContainerEditor = forwardRef<WebContainerEditorHandle, WebContainerEditorProps>(
  ({ files, openFile = "sql/schema.sql" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const vmRef = useRef<VM | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mountedRef = useRef(false);

    useImperativeHandle(ref, () => ({
      applyFsDiff: async (create, destroy = []) => {
        if (vmRef.current) {
          await vmRef.current.applyFsDiff({ create, destroy });
        }
      },
      getFsSnapshot: async () => {
        if (vmRef.current) {
          return (await vmRef.current.getFsSnapshot()) as Record<string, string>;
        }
        return undefined;
      },
    }));

    useEffect(() => {
      if (mountedRef.current || !containerRef.current) return;
      mountedRef.current = true;

      const allFiles = { ...getDefaultFiles(), ...files };
      const project = buildProject(allFiles);

      sdk
        .embedProject(containerRef.current, project, {
          theme: "dark",
          view: "editor",
          hideExplorer: false,
          openFile,
          terminalHeight: 30,
          height: "100%",
        })
        .then((vm) => {
          vmRef.current = vm;
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to boot WebContainer:", err);
          setIsLoading(false);
        });
    }, []); // mount once

    return (
      <div className="relative h-full w-full">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground font-mono">
                Booting WebContainer…
              </span>
            </div>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    );
  }
);

WebContainerEditor.displayName = "WebContainerEditor";

export default WebContainerEditor;
