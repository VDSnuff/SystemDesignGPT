"use client";

import { PointerEvent, useState } from "react";
import { initialDiagram, nodeKinds, type DiagramNode, type DiagramState, type NodeKind } from "../learning-types";

interface SectionDiagramProps {
  readonly value: DiagramState;
  readonly onChange: (value: DiagramState) => void;
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

function Connector({ from, to }: Readonly<{ from?: DiagramNode; to?: DiagramNode }>) {
  if (!from || !to) return null;
  return <span aria-hidden="true" className="diagram-line" style={lineStyle(from, to)} />;
}

export function SectionDiagram({ value, onChange }: SectionDiagramProps) {
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [dragId, setDragId] = useState<number | null>(null);

  function addNode(kind: NodeKind) {
    const id = Math.max(0, ...value.nodes.map((node) => node.id)) + 1;
    const offset = value.nodes.length * 31;
    const node = { id, kind, label: `New ${kind.toLowerCase()}`, x: 50 + offset % 500, y: 230 + offset % 170 };
    onChange({ ...value, nodes: [...value.nodes, node] });
  }

  function toggleNode(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current.slice(-1), id]);
  }

  function connectSelected() {
    if (selected.length !== 2) return;
    const [from, to] = selected;
    const exists = value.connections.some((connection) => connection.from === from && connection.to === to);
    const connections = exists ? value.connections : [...value.connections, { from, to }];
    onChange({ ...value, connections });
    setSelected([]);
  }

  function deleteSelected() {
    const nodes = value.nodes.filter((node) => !selected.includes(node.id));
    const connections = value.connections.filter((item) => !selected.includes(item.from) && !selected.includes(item.to));
    onChange({ nodes, connections });
    setSelected([]);
  }

  function renameSelected(label: string) {
    const [id] = selected;
    onChange({ ...value, nodes: value.nodes.map((node) => node.id === id ? { ...node, label } : node) });
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragId === null) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(8, Math.min(bounds.width - 140, event.clientX - bounds.left - 64));
    const y = Math.max(8, Math.min(bounds.height - 72, event.clientY - bounds.top - 32));
    const nodes = value.nodes.map((node) => node.id === dragId ? { ...node, x, y } : node);
    onChange({ ...value, nodes });
  }

  function startDrag(id: number, event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragId(id);
  }

  function reset() {
    onChange(initialDiagram);
    setSelected([]);
  }

  const selectedNode = value.nodes.find((node) => node.id === selected[0]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {nodeKinds.map((kind) => <button className="tool-button" key={kind} onClick={() => addNode(kind)} type="button">+ {kind}</button>)}
        <button className="tool-button-dark" disabled={selected.length !== 2} onClick={connectSelected} type="button">Connect selected</button>
        <button className="tool-button" disabled={!selected.length} onClick={deleteSelected} type="button">Delete</button>
        <button className="tool-button ml-auto" onClick={reset} type="button">Reset</button>
      </div>
      {selected.length === 1 ? (
        <label className="mb-4 block text-xs font-bold text-muted">
          Selected node label
          <input className="mt-1 block w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm text-ink" maxLength={80} onChange={(event) => renameSelected(event.target.value)} value={selectedNode?.label ?? ""} />
        </label>
      ) : null}
      <div className="overflow-x-auto rounded-3xl">
        <div
          aria-label="Section diagram canvas"
          className="diagram-grid relative h-[430px] min-w-[680px] touch-none overflow-hidden rounded-3xl border border-ink/15 bg-white"
          onPointerMove={moveDrag}
          onPointerUp={() => setDragId(null)}
        >
          {value.connections.map((connection) => (
            <Connector
              from={value.nodes.find((node) => node.id === connection.from)}
              key={`${connection.from}-${connection.to}`}
              to={value.nodes.find((node) => node.id === connection.to)}
            />
          ))}
          {value.nodes.map((node) => (
            <button
              aria-pressed={selected.includes(node.id)}
              className={`diagram-node diagram-${node.kind.toLowerCase()} ${selected.includes(node.id) ? "is-selected" : ""}`}
              key={node.id}
              onClick={() => toggleNode(node.id)}
              onPointerDown={(event) => startDrag(node.id, event)}
              style={{ left: node.x, top: node.y }}
              type="button"
            >
              <span>{node.kind}</span>
              <strong>{node.label}</strong>
            </button>
          ))}
          <p className="absolute bottom-4 left-5 text-xs text-muted">Drag nodes · select two · connect them</p>
        </div>
      </div>
    </div>
  );
}
