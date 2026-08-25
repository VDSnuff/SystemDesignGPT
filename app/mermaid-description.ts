const nodePattern = /\b([A-Za-z][\w]*)\s*(\[\[|\[\(|\[|\{|\()"?(.+?)"?(\]\]|\)\]|\]|\}|\))/g;

function cleanLabel(label: string) {
  return label
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/^"|"$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nodeLabels(chart: string) {
  const labels = new Map<string, string>();
  for (const match of chart.matchAll(nodePattern)) labels.set(match[1], cleanLabel(match[3]));
  for (const line of chart.split("\n")) {
    const match = line.trim().match(/^participant\s+(\w+)(?:\s+as\s+(.+))?$/i);
    if (match) labels.set(match[1], cleanLabel(match[2] ?? match[1]));
  }
  return labels;
}

function name(id: string, labels: ReadonlyMap<string, string>) {
  return labels.get(id) ?? id;
}

function describeSequence(line: string, labels: ReadonlyMap<string, string>) {
  const match = line.match(/^(\w+)\s*-+>+\s*(\w+)\s*:\s*(.+)$/);
  if (!match) return null;
  return `${name(match[1], labels)} to ${name(match[2], labels)}: ${cleanLabel(match[3])}`;
}

function describeFlow(line: string, labels: ReadonlyMap<string, string>) {
  const ids = [...line.matchAll(/\b([A-Za-z][\w]*)\b/g)].map((match) => match[1]);
  const knownIds = ids.filter((id) => labels.has(id));
  if (knownIds.length < 2 || !/(?:-->|\.->|==>)/.test(line.replace(/\s+/g, ""))) return null;
  const edgeLabel = line.match(/\|"?(.+?)"?\|/)?.[1]
    ?? line.match(/--\s+(.+?)\s+-->/)?.[1]
    ?? line.match(/-\.\s*(.+?)\s*\.->/)?.[1];
  const from = name(knownIds[0], labels);
  const to = name(knownIds.at(-1) ?? "", labels);
  return edgeLabel ? `${from} to ${to}: ${cleanLabel(edgeLabel)}` : `${from} connects to ${to}`;
}

export function describeMermaid(chart: string) {
  const labels = nodeLabels(chart);
  const isSequence = /^\s*sequenceDiagram/m.test(chart);
  const connections = chart.split("\n").flatMap((line) => {
    const description = isSequence ? describeSequence(line.trim(), labels) : describeFlow(line.trim(), labels);
    return description ? [description] : [];
  });
  const prefix = isSequence ? "Sequence diagram." : "Flow diagram.";
  return connections.length ? `${prefix} ${connections.join(". ")}.` : `${prefix} ${[...labels.values()].join(", ")}.`;
}
