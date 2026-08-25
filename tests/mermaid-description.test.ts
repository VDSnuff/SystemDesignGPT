import { describe, expect, it } from "vitest";
import { describeMermaid } from "../app/mermaid-description";

describe("Mermaid text alternatives", () => {
  it("describes flowchart labels and relationships", () => {
    const description = describeMermaid("flowchart LR\nA[Client] --> B[API]\nB -- Failure --> C[Fallback]");

    expect(description).toContain("Client connects to API");
    expect(description).toContain("API to Fallback: Failure");
  });

  it("describes sequence participants and messages", () => {
    const description = describeMermaid("sequenceDiagram\nparticipant API\nparticipant DB as Database\nAPI->>DB: Save order");

    expect(description).toBe("Sequence diagram. API to Database: Save order.");
  });
});
