"use client";

import { KeyboardEvent, PointerEvent, useRef } from "react";

interface PanelResizeHandleProps {
  readonly controlsId: string;
  readonly isOpen: boolean;
  readonly label: string;
  readonly maxWidth: number;
  readonly minWidth: number;
  readonly onOpen: () => void;
  readonly onResize: (width: number) => void;
  readonly onToggle: () => void;
  readonly side: "left" | "right";
  readonly width: number;
}

interface DragState {
  moved: boolean;
  startWidth: number;
  startX: number;
}

const KEYBOARD_RESIZE_STEP = 16;
const POINTER_DRAG_THRESHOLD = 4;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function PanelResizeHandle(props: PanelResizeHandleProps) {
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const direction = props.side === "left" ? 1 : -1;

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    drag.current = { moved: false, startWidth: props.width, startX: event.clientX };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const distance = event.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(distance) < POINTER_DRAG_THRESHOLD) return;
    drag.current.moved = true;
    suppressClick.current = true;
    if (!props.isOpen) props.onOpen();
    props.onResize(clamp(drag.current.startWidth + distance * direction, props.minWidth, props.maxWidth));
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    props.onToggle();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const screenDirection = event.key === "ArrowRight" ? 1 : -1;
    if (!props.isOpen) props.onOpen();
    props.onResize(clamp(
      props.width + screenDirection * direction * KEYBOARD_RESIZE_STEP,
      props.minWidth,
      props.maxWidth,
    ));
  }

  const action = props.isOpen ? `Resize or collapse ${props.label}` : `Expand ${props.label}`;

  return (
    <button
      aria-controls={props.controlsId}
      aria-expanded={props.isOpen}
      aria-label={action}
      className={`panel-resize-handle panel-resize-handle-${props.side}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      title={`${action}. Drag horizontally to resize.`}
      type="button"
    >
      <span aria-hidden="true" className="panel-resize-grip">
        <span />
        <span />
        <span />
      </span>
    </button>
  );
}
