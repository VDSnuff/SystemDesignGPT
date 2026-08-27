"use client";

import { ReactNode, useId, useState } from "react";
import { PanelResizeHandle } from "./PanelResizeHandle";

interface CollapsibleNavigationProps {
  readonly children: ReactNode;
  readonly defaultWidth: number;
  readonly label: string;
}

const MINIMUM_NAVIGATION_WIDTH = 200;
const MAXIMUM_NAVIGATION_WIDTH = 360;

export function CollapsibleNavigation({ children, defaultWidth, label }: CollapsibleNavigationProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState(defaultWidth);
  const contentId = useId();

  return (
    <aside className={`desktop-navigation ${isOpen ? "" : "is-collapsed"}`} style={{ width: isOpen ? width : 0 }}>
      <PanelResizeHandle
        controlsId={contentId}
        isOpen={isOpen}
        label={label}
        maxWidth={MAXIMUM_NAVIGATION_WIDTH}
        minWidth={MINIMUM_NAVIGATION_WIDTH}
        onOpen={() => setIsOpen(true)}
        onResize={setWidth}
        onToggle={() => setIsOpen((current) => !current)}
        side="left"
        width={width}
      />
      <div hidden={!isOpen} id={contentId}>{children}</div>
    </aside>
  );
}
