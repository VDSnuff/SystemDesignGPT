"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { stableDomId } from "../dom-id";
import { describeMermaid } from "../mermaid-description";

export function MermaidDiagram({ chart, renderedSvg }: Readonly<{ chart: string; renderedSvg?: string }>) {
  const diagramId = stableDomId("diagram", chart);
  const titleId = `${diagramId}-title`;
  const descriptionId = `${diagramId}-description`;
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearViewport = useNearViewport(containerRef);
  const svg = isNearViewport && renderedSvg ? applyStyleNonce(renderedSvg) : "";
  const description = describeMermaid(chart);

  if (!renderedSvg) return <DiagramFigure chart={chart} description={description} />;
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

function useNearViewport(containerRef: RefObject<HTMLDivElement | null>) {
  const [isNearViewport, setIsNearViewport] = useState(false);
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
  }, [containerRef]);
  return isNearViewport;
}

function applyStyleNonce(svg: string) {
  const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
  if (!nonce) return svg;
  return svg.replace(/<style(?=\s|>)/gi, `<style nonce="${nonce}"`);
}

function DiagramAlternative({ description, id }: Readonly<{ description: string; id?: string }>) {
  return <details className="mermaid-alternative"><summary>Read diagram description</summary><p id={id}>{description}</p></details>;
}

function DiagramFigure({ chart, description }: Readonly<{ chart: string; description: string }>) {
  return <figure><pre className="book-code mermaid-fallback">{chart}</pre><figcaption><DiagramAlternative description={description} /></figcaption></figure>;
}
