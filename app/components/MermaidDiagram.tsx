"use client";

import { useEffect, useId, useRef, useState } from "react";

export function MermaidDiagram({ chart }: Readonly<{ chart: string }>) {
  const diagramId = `diagram-${useId().replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setIsNearViewport(true);
      observer.disconnect();
    }, { rootMargin: "400px 0px" });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isNearViewport) return;
    let isActive = true;
    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
        const result = await mermaid.render(diagramId, chart);
        if (isActive) setSvg(result.svg);
      })
      .catch(() => {
        if (isActive) setError(true);
      });
    return () => { isActive = false; };
  }, [chart, diagramId, isNearViewport]);

  if (error) return <pre className="book-code mermaid-fallback">{chart}</pre>;
  if (!svg) return <div className="mermaid-loading" ref={containerRef}>{isNearViewport ? "Rendering diagram…" : "Diagram loads as you approach it."}</div>;
  return <div aria-label="Architecture diagram" className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} role="img" />;
}
