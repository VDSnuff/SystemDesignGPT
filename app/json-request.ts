export type JsonRequestResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly status: 400 | 413 | 415 };

const jsonMediaType = "application/json";

function contentLength(request: Request) {
  const value = request.headers.get("content-length");
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function isJson(request: Request) {
  return request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() === jsonMediaType;
}

async function boundedText(request: Request, maximumBytes: number) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) return text + decoder.decode();
    size += chunk.value.byteLength;
    if (size > maximumBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
}

export async function readJsonRequest(request: Request, maximumBytes: number): Promise<JsonRequestResult> {
  if (!isJson(request)) return { ok: false, status: 415 };
  const declaredLength = contentLength(request);
  if (declaredLength !== null && declaredLength > maximumBytes) return { ok: false, status: 413 };
  try {
    const text = await boundedText(request, maximumBytes);
    if (text === null) return { ok: false, status: 413 };
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400 };
  }
}
