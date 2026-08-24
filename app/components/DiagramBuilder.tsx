"use client";

import { PointerEvent, useState } from "react";

type NodeKind = "Client" | "Service" | "Database" | "Queue";
interface DiagramNode { readonly id: number; readonly kind: NodeKind; readonly label: string; readonly x: number; readonly y: number }
interface Connection { readonly from: number; readonly to: number }

const initialNodes: readonly DiagramNode[] = [
  { id: 1, kind: "Client", label: "Web client", x: 60, y: 110 },
  { id: 2, kind: "Service", label: "API", x: 280, y: 110 },
  { id: 3, kind: "Database", label: "Primary store", x: 500, y: 110 },
];
const initialConnections: readonly Connection[] = [{ from: 1, to: 2 }, { from: 2, to: 3 }];

function useDiagram() {
  const [nodes, setNodes] = useState(initialNodes);
  const [connections, setConnections] = useState(initialConnections);
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [dragId, setDragId] = useState<number | null>(null);

  function addNode(kind: NodeKind) {
    const id = Math.max(0, ...nodes.map((node) => node.id)) + 1;
    const offset = nodes.length * 34;
    setNodes([...nodes, { id, kind, label: `New ${kind.toLowerCase()}`, x: 80 + offset % 480, y: 230 + offset % 160 }]);
  }

  function toggleNode(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current.slice(-1), id]);
  }

  function connectSelected() {
    if (selected.length !== 2) return;
    const [from, to] = selected;
    const exists = connections.some((item) => item.from === from && item.to === to);
    if (!exists) setConnections([...connections, { from, to }]);
    setSelected([]);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragId === null) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(8, Math.min(bounds.width - 140, event.clientX - bounds.left - 64));
    const y = Math.max(8, Math.min(bounds.height - 72, event.clientY - bounds.top - 32));
    setNodes((current) => current.map((node) => node.id === dragId ? { ...node, x, y } : node));
  }

  function reset() {
    setNodes(initialNodes);
    setConnections(initialConnections);
    setSelected([]);
  }

  return { nodes, connections, selected, dragId, addNode, toggleNode, connectSelected, moveDrag, reset, setDragId };
}

function lineStyle(from: DiagramNode, to: DiagramNode) {
  const startX = from.x + 128;
  const startY = from.y + 32;
  const endX = to.x;
  const endY = to.y + 32;
  const width = Math.hypot(endX - startX, endY - startY);
  const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
  return { left: startX, top: startY, width, transform: `rotate(${angle}deg)` };
}

function Connector({ connection, nodes }: Readonly<{ connection: Connection; nodes: readonly DiagramNode[] }>) {
  const from = nodes.find((node) => node.id === connection.from);
  const to = nodes.find((node) => node.id === connection.to);
  if (!from || !to) return null;
  return <span aria-hidden="true" className="diagram-line" style={lineStyle(from, to)} />;
}

interface CanvasProps {
  readonly diagram: ReturnType<typeof useDiagram>;
}

function DiagramCanvas({ diagram }: CanvasProps) {
  function startDrag(id: number, event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    diagram.setDragId(id);
  }

  return (
    <div
      aria-label="System diagram canvas"
      className="diagram-grid relative h-[520px] touch-none overflow-hidden rounded-3xl border border-ink/15 bg-white"
      onPointerMove={diagram.moveDrag}
      onPointerUp={() => diagram.setDragId(null)}
    >
      {diagram.connections.map((connection) => <Connector connection={connection} key={`${connection.from}-${connection.to}`} nodes={diagram.nodes} />)}
      {diagram.nodes.map((node) => (
        <button
          aria-pressed={diagram.selected.includes(node.id)}
          className={`diagram-node diagram-${node.kind.toLowerCase()} ${diagram.selected.includes(node.id) ? "is-selected" : ""}`}
          key={node.id}
          onClick={() => diagram.toggleNode(node.id)}
          onPointerDown={(event) => startDrag(node.id, event)}
          style={{ left: node.x, top: node.y }}
          type="button"
        >
          <span>{node.kind}</span>
          <strong>{node.label}</strong>
        </button>
      ))}
      <p className="absolute bottom-4 left-5 text-xs text-muted">Drag to move · click two nodes to connect</p>
    </div>
  );
}

interface ToolbarProps {
  readonly canConnect: boolean;
  readonly onAdd: (kind: NodeKind) => void;
  readonly onConnect: () => void;
  readonly onReset: () => void;
}

function DiagramToolbar({ canConnect, onAdd, onConnect, onReset }: ToolbarProps) {
  const kinds: readonly NodeKind[] = ["Client", "Service", "Database", "Queue"];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {kinds.map((kind) => <button className="tool-button" key={kind} onClick={() => onAdd(kind)} type="button">+ {kind}</button>)}
      <span className="hidden h-7 w-px bg-ink/15 sm:block" />
      <button className="tool-button-dark" disabled={!canConnect} onClick={onConnect} type="button">Connect selected</button>
      <button className="tool-button ml-auto" onClick={onReset} type="button">Reset</button>
    </div>
  );
}

export function DiagramBuilder() {
  const diagram = useDiagram();
  return (
    <section aria-labelledby="canvas-heading" className="mt-9">
      <div className="mb-5">
        <p className="kicker">Diagram constructor</p>
        <h2 className="mt-2 font-serif text-4xl tracking-[-0.03em]" id="canvas-heading">Make the boundaries visible.</h2>
      </div>
      <DiagramToolbar canConnect={diagram.selected.length === 2} onAdd={diagram.addNode} onConnect={diagram.connectSelected} onReset={diagram.reset} />
      <DiagramCanvas diagram={diagram} />
    </section>
  );
}
