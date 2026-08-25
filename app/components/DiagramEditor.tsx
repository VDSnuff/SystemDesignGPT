"use client";

import { useState } from "react";
import {
  addDiagramNode,
  connectDiagramNodes,
  deleteDiagramNodes,
  diagramLimits,
  initialDiagram,
  moveDiagramNode,
  nodeKinds,
  renameDiagramNode,
  type DiagramState,
  type NodeKind,
} from "../diagram-model";
import { DiagramCanvas } from "./DiagramCanvas";

interface DiagramEditorProps {
  readonly label: string;
  readonly value: DiagramState;
  readonly onChange: (value: DiagramState) => void;
  readonly resetValue?: DiagramState;
}

interface MovementControlsProps {
  readonly onMove: (x: number, y: number) => void;
}

function MovementControls({ onMove }: MovementControlsProps) {
  const step = diagramLimits.moveStep;
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="mb-2 text-xs font-bold text-muted">Move selected node</legend>
      <button aria-label="Move selected node left" className="tool-button" onClick={() => onMove(-step, 0)} type="button">← Left</button>
      <button aria-label="Move selected node up" className="tool-button" onClick={() => onMove(0, -step)} type="button">↑ Up</button>
      <button aria-label="Move selected node down" className="tool-button" onClick={() => onMove(0, step)} type="button">↓ Down</button>
      <button aria-label="Move selected node right" className="tool-button" onClick={() => onMove(step, 0)} type="button">→ Right</button>
    </fieldset>
  );
}

export function DiagramEditor({ label, value, onChange, resetValue = initialDiagram }: DiagramEditorProps) {
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [dragId, setDragId] = useState<number | null>(null);
  const [undoValue, setUndoValue] = useState<DiagramState | null>(null);
  const [status, setStatus] = useState("Diagram ready.");
  const selectedNode = value.nodes.find((node) => node.id === selected[0]);

  function applyChange(next: DiagramState, message: string) {
    setUndoValue(null);
    onChange(next);
    setStatus(message);
  }

  function addNode(kind: NodeKind) {
    const next = addDiagramNode(value, kind);
    if (next === value) return setStatus(`A diagram can contain up to ${diagramLimits.maxNodes} nodes.`);
    applyChange(next, `${kind} node added.`);
  }

  function toggleNode(id: number) {
    setSelected((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current.slice(-1), id]);
  }

  function connectSelected() {
    const next = connectDiagramNodes(value, selected);
    if (next === value) return setStatus("Those nodes are already connected or the connection limit was reached.");
    applyChange(next, "Selected nodes connected.");
    setSelected([]);
  }

  function deleteSelected() {
    if (!selected.length) return;
    setUndoValue(value);
    onChange(deleteDiagramNodes(value, selected));
    setStatus(`${selected.length === 1 ? "Node" : "Nodes"} deleted. Undo is available.`);
    setSelected([]);
  }

  function reset() {
    if (!window.confirm("Reset this diagram to the default? You can undo the reset.")) {
      return setStatus("Reset canceled.");
    }
    setUndoValue(value);
    onChange(resetValue);
    setSelected([]);
    setStatus("Diagram reset to the default. Undo is available.");
  }

  function undo() {
    if (!undoValue) return;
    onChange(undoValue);
    setUndoValue(null);
    setStatus("Last delete or reset undone.");
  }

  function moveSelected(x: number, y: number) {
    if (!selectedNode) return;
    applyChange(moveDiagramNode(value, selectedNode.id, selectedNode.x + x, selectedNode.y + y), "Selected node moved.");
  }

  function moveNode(id: number, x: number, y: number) {
    applyChange(moveDiagramNode(value, id, x, y), "Node moved within the canvas.");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {nodeKinds.map((kind) => (
          <button className="tool-button" disabled={value.nodes.length >= diagramLimits.maxNodes} key={kind} onClick={() => addNode(kind)} type="button">
            + {kind}
          </button>
        ))}
        <button className="tool-button-dark" disabled={selected.length !== 2 || value.connections.length >= diagramLimits.maxConnections} onClick={connectSelected} type="button">Connect selected</button>
        <button className="tool-button" disabled={!selected.length} onClick={deleteSelected} type="button">Delete selected</button>
        <button className="tool-button" disabled={!undoValue} onClick={undo} type="button">Undo delete/reset</button>
        <button className="tool-button sm:ml-auto" onClick={reset} type="button">Reset diagram</button>
      </div>
      {selected.length === 1 ? (
        <div className="mb-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-xs font-bold text-muted">
            Selected node label
            <input
              className="mt-1 block w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm text-ink"
              maxLength={80}
              onChange={(event) => applyChange(renameDiagramNode(value, selected[0], event.target.value), "Selected node renamed.")}
              value={selectedNode?.label ?? ""}
            />
          </label>
          <MovementControls onMove={moveSelected} />
        </div>
      ) : null}
      <DiagramCanvas
        diagram={value}
        dragId={dragId}
        label={label}
        onDragEnd={() => setDragId(null)}
        onDragStart={setDragId}
        onMove={moveNode}
        onToggle={toggleNode}
        selected={selected}
      />
      <p aria-live="polite" className="mt-3 text-xs text-muted" role="status">{status}</p>
    </div>
  );
}
