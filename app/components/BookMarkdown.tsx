import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./MermaidDiagram";

type MarkdownPart = { readonly kind: "markdown"; readonly content: string } | { readonly kind: "mermaid"; readonly content: string };

function splitMermaid(markdown: string): readonly MarkdownPart[] {
  const parts = markdown.split(/```mermaid\s*\n([\s\S]*?)```/g);
  return parts.flatMap((content, index): MarkdownPart[] => {
    if (!content.trim()) return [];
    return [{ kind: index % 2 === 0 ? "markdown" : "mermaid", content }];
  });
}

function externalLink(href: string | undefined) {
  return href?.startsWith("https://") || href?.startsWith("http://");
}

export function BookMarkdown({ markdown }: Readonly<{ markdown: string }>) {
  return (
    <div className="book-prose">
      {splitMermaid(markdown).map((part, index) => part.kind === "mermaid" ? (
        <MermaidDiagram chart={part.content.trim()} key={`diagram-${index}`} />
      ) : (
        <ReactMarkdown
          components={{
            a: ({ href, children, ...props }) => <a href={href} rel={externalLink(href) ? "noreferrer" : undefined} target={externalLink(href) ? "_blank" : undefined} {...props}>{children}</a>,
          }}
          key={`markdown-${index}`}
          remarkPlugins={[remarkGfm]}
        >
          {part.content}
        </ReactMarkdown>
      ))}
    </div>
  );
}
