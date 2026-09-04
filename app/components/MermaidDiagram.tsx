"use client";

import { useEffect, useRef, useState } from "react";
import { stableDomId } from "../dom-id";
import { describeMermaid } from "../mermaid-description";

export function MermaidDiagram({ chart }: Readonly<{ chart: string }>) {
  const diagramId = stableDomId("diagram", chart);
  const titleId = `${diagramId}-title`;
  const descriptionId = `${diagramId}-description`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  const description = describeMermaid(chart);

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
        if (isActive) setSvg(applyStyleNonce(result.svg));
      })
      .catch(() => {
        if (isActive) setError(true);
      });
    return () => { isActive = false; };
  }, [chart, diagramId, isNearViewport]);

  if (error) return <DiagramFigure chart={chart} description={description} hasError />;
  if (!svg) return <div className="mermaid-loading" ref={containerRef} role="status">{isNearViewport ? "Rendering diagram…" : "Diagram loads as you approach it."}</div>;
  return (
    <figure>
      <div aria-describedby={descriptionId} aria-labelledby={titleId} className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} role="img" tabIndex={0} />
      <figcaption>
        <span className="sr-only" id={titleId}>Architecture diagram</span>
        <DiagramAlternative description={description} id={descriptionId} />
      </figcaption>
    </figure>
  );
}

function applyStyleNonce(svg: string) {
  const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
  if (!nonce) return svg;
  return svg.replace(/<style(?=\s|>)/gi, `<style nonce="${nonce}"`);
}

function DiagramAlternative({ description, id }: Readonly<{ description: string; id?: string }>) {
  return <details className="mermaid-alternative"><summary>Read diagram description</summary><p id={id}>{description}</p></details>;
}

function DiagramFigure({ chart, description, hasError }: Readonly<{ chart: string; description: string; hasError: boolean }>) {
  return <figure><pre className={hasError ? "book-code mermaid-fallback" : "book-code"}>{chart}</pre><figcaption><DiagramAlternative description={description} /></figcaption></figure>;
}
