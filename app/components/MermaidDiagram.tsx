"use client";

import { useEffect, useId, useState } from "react";

export function MermaidDiagram({ chart }: Readonly<{ chart: string }>) {
  const diagramId = `diagram-${useId().replace(/:/g, "")}`;
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let isActive = true;
    void import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
      try {
        const result = await mermaid.render(diagramId, chart);
        if (isActive) setSvg(result.svg);
      } catch {
        if (isActive) setError(true);
      }
    });
    return () => { isActive = false; };
  }, [chart, diagramId]);

  if (error) return <pre className="book-code">{chart}</pre>;
  if (!svg) return <div className="mermaid-loading">Rendering diagram…</div>;
  return <div aria-label="Architecture diagram" className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} role="img" />;
}
