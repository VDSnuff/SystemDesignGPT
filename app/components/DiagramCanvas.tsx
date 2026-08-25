"use client";

import { KeyboardEvent, PointerEvent } from "react";
import {
  diagramLimits,
  type DiagramNode,
  type DiagramState,
} from "../diagram-model";

interface DiagramCanvasProps {
  readonly diagram: DiagramState;
  readonly dragId: number | null;
  readonly label: string;
  readonly selected: readonly number[];
  readonly onDragEnd: () => void;
  readonly onDragStart: (id: number) => void;
  readonly onMove: (id: number, x: number, y: number) => void;
  readonly onToggle: (id: number) => void;
}

function lineStyle(from: DiagramNode, to: DiagramNode) {
  const startX = from.x + diagramLimits.nodeWidth;
  const startY = from.y + diagramLimits.nodeHeight / 2;
  const endX = to.x;
  const endY = to.y + diagramLimits.nodeHeight / 2;
  const width = Math.hypot(endX - startX, endY - startY);
  const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
  return { left: startX, top: startY, width, transform: `rotate(${angle}deg)` };
}

function Connector({ from, to }: Readonly<{ from?: DiagramNode; to?: DiagramNode }>) {
  if (!from || !to) return null;
  return <span aria-hidden="true" className="diagram-line" style={lineStyle(from, to)} />;
}

function arrowOffset(key: string) {
  const step = diagramLimits.moveStep;
  if (key === "ArrowLeft") return { x: -step, y: 0 };
  if (key === "ArrowRight") return { x: step, y: 0 };
  if (key === "ArrowUp") return { x: 0, y: -step };
  if (key === "ArrowDown") return { x: 0, y: step };
  return null;
}

export function DiagramCanvas({
  diagram,
  dragId,
  label,
  selected,
  onDragEnd,
  onDragStart,
  onMove,
  onToggle,
}: DiagramCanvasProps) {
  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragId === null) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onMove(
      dragId,
      event.clientX - bounds.left - diagramLimits.nodeWidth / 2,
      event.clientY - bounds.top - diagramLimits.nodeHeight / 2,
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, node: DiagramNode) {
    const offset = arrowOffset(event.key);
    if (!offset) return;
    event.preventDefault();
    onMove(node.id, node.x + offset.x, node.y + offset.y);
  }

  function handlePointerDown(id: number, event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onDragStart(id);
  }

  return (
    <div>
      <p className="mb-2 text-xs leading-5 text-muted" id="diagram-scroll-help">
        The canvas is horizontally scrollable on narrow screens. Select a node and use arrow keys or the move controls; dragging also works.
      </p>
      <div
        aria-describedby="diagram-scroll-help"
        aria-label={`${label}, horizontally scrollable`}
        className="diagram-scroll-region overflow-x-auto rounded-3xl"
        data-testid="diagram-scroll-region"
        role="region"
        tabIndex={0}
      >
        <div
          aria-label={label}
          className="diagram-grid relative touch-none overflow-hidden rounded-3xl border border-ink/15 bg-white"
          data-testid="diagram-canvas"
          onPointerCancel={onDragEnd}
          onPointerMove={handlePointerMove}
          onPointerUp={onDragEnd}
          role="group"
          style={{ height: diagramLimits.height, width: diagramLimits.width }}
        >
          {diagram.connections.map((connection) => (
            <Connector
              from={diagram.nodes.find((node) => node.id === connection.from)}
              key={`${connection.from}-${connection.to}`}
              to={diagram.nodes.find((node) => node.id === connection.to)}
            />
          ))}
          {diagram.nodes.map((node) => (
            <button
              aria-label={`${node.kind}: ${node.label}`}
              aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
              aria-pressed={selected.includes(node.id)}
              className={`diagram-node diagram-${node.kind.toLowerCase()} ${selected.includes(node.id) ? "is-selected" : ""}`}
              key={node.id}
              onClick={() => onToggle(node.id)}
              onKeyDown={(event) => handleKeyDown(event, node)}
              onPointerDown={(event) => handlePointerDown(node.id, event)}
              style={{ left: node.x, top: node.y }}
              type="button"
            >
              <span>{node.kind}</span>
              <strong>{node.label}</strong>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
