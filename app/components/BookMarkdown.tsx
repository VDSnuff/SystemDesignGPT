import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BookChecklistItem, BookHeading } from "../book-learning.generated";
import { HandbookChecklistInput } from "./HandbookChecklistInput";
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

interface BookMarkdownProps {
  readonly checklistItems: readonly BookChecklistItem[];
  readonly headings: readonly BookHeading[];
  readonly markdown: string;
}

function ScrollableTable({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div aria-label="Scrollable handbook table" className="table-scroll-region" role="region" tabIndex={0}>
      <p className="table-scroll-help">Table · scroll horizontally when needed</p>
      <table>{children}</table>
    </div>
  );
}

export function BookMarkdown({ checklistItems, headings, markdown }: BookMarkdownProps) {
  let headingIndex = 0;
  let checklistIndex = 0;
  const nextHeadingId = () => headings[headingIndex++]?.id;
  return (
    <div className="book-prose">
      {splitMermaid(markdown).map((part, index) => part.kind === "mermaid" ? (
        <MermaidDiagram chart={part.content.trim()} key={`diagram-${index}`} />
      ) : (
        <ReactMarkdown
          components={{
            a: ({ href, children, ...props }) => <a href={href} rel={externalLink(href) ? "noreferrer" : undefined} target={externalLink(href) ? "_blank" : undefined} {...props}>{children}</a>,
            h2: ({ children }) => <h2 id={nextHeadingId()}>{children}</h2>,
            h3: ({ children }) => <h3 id={nextHeadingId()}>{children}</h3>,
            h4: ({ children }) => <h4 id={nextHeadingId()}>{children}</h4>,
            table: ({ children }) => <ScrollableTable>{children}</ScrollableTable>,
            input: () => {
              const item = checklistItems[checklistIndex++];
              if (!item) return <input disabled type="checkbox" />;
              return <HandbookChecklistInput itemId={item.id} label={item.label} />;
            },
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
