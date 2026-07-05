import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, Power, ShieldAlert, Unlock, Wand2 } from "lucide-react";
import { GlassCard } from "@/components/hydrax/GlassCard";
import { PageHeader } from "@/components/hydrax/PageHeader";
import { StatusPill } from "@/components/hydrax/StatusPill";
import { ValveIcon } from "@/components/hydrax/WaterFlowIcon";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { setNodeMode, setValve, useHydrax } from "@/lib/hydrax-store";
import type { HydraxNode, OperatingMode, ValveState } from "@/lib/hydrax-types";

export const Route = createFileRoute("/control")({
  head: () => ({
    meta: [
      { title: "Manual Valve Control · HYDRAX" },
      { name: "description", content: "Manually open, close or emergency-shutdown valves on any HYDRAX node." },
    ],
  }),
  component: ControlPage,
});

type Pending =
  | { kind: "valve"; nodeId: string; state: ValveState; label: string }
  | { kind: "mode"; nodeId: string; mode: OperatingMode; label: string }
  | null;

function ControlPage() {
  const data = useHydrax();
  const nodes = Object.values(data.nodes);
  const [pending, setPending] = useState<Pending>(null);

  return (
    <div>
      <PageHeader
        eyebrow="Manual override"
        title="Valve control center"
        description="Trigger emergency shutdown, override AI decisions or force valves open for maintenance. All actions require confirmation."
        actions={<StatusPill tone="warning" pulse>Requires confirmation</StatusPill>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {nodes.map((n) => (
          <ControlCard key={n.id} node={n} onAction={setPending} />
        ))}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="glass-strong border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm action</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.label} — this will be sent to Firebase and applied to the physical valve.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pending) return;
                if (pending.kind === "valve") {
                  await setValve(pending.nodeId, pending.state);
                  toast.success(`Valve set to ${pending.state}`);
                } else {
                  await setNodeMode(pending.nodeId, pending.mode);
                  toast.success(`Mode set to ${pending.mode}`);
                }
                setPending(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ControlCard({ node, onAction }: { node: HydraxNode; onAction: (p: Pending) => void }) {
  const open = node.valveState !== "closed";
  return (
    <GlassCard>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
        <ValveIcon open={open} size={56} />
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">{node.name}</div>
          <div className="text-xs text-muted-foreground">{node.location}</div>
        </div>
        <StatusPill tone={open ? "success" : "muted"} pulse={open}>
          {node.valveState}
        </StatusPill>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          className="justify-start"
          onClick={() => onAction({ kind: "valve", nodeId: node.id, state: "open", label: `Open valve on ${node.name}` })}
        >
          <Unlock className="mr-2 h-4 w-4" /> Open valve
        </Button>
        <Button
          variant="secondary"
          className="justify-start"
          onClick={() => onAction({ kind: "valve", nodeId: node.id, state: "closed", label: `Close valve on ${node.name}` })}
        >
          <Lock className="mr-2 h-4 w-4" /> Close valve
        </Button>
        <Button
          variant="secondary"
          className="justify-start"
          onClick={() => onAction({ kind: "mode", nodeId: node.id, mode: "auto", label: `Enable AUTO mode on ${node.name}` })}
        >
          <Wand2 className="mr-2 h-4 w-4" /> Auto mode
        </Button>
        <Button
          variant="secondary"
          className="justify-start"
          onClick={() => onAction({ kind: "mode", nodeId: node.id, mode: "manual", label: `Switch to MANUAL mode on ${node.name}` })}
        >
          <Power className="mr-2 h-4 w-4" /> Manual mode
        </Button>
        <Button
          variant="destructive"
          className="justify-start col-span-2 sm:col-span-1"
          onClick={() => onAction({ kind: "mode", nodeId: node.id, mode: "emergency", label: `Emergency SHUTDOWN on ${node.name}` })}
        >
          <ShieldAlert className="mr-2 h-4 w-4" /> Emergency shutdown
        </Button>
        <Button
          variant="default"
          className="justify-start col-span-2 sm:col-span-1"
          onClick={() => onAction({ kind: "valve", nodeId: node.id, state: "open", label: `Emergency OPEN on ${node.name}` })}
        >
          <Unlock className="mr-2 h-4 w-4" /> Emergency open
        </Button>
      </div>
    </GlassCard>
  );
}