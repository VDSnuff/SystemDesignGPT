import path from "node:path";
import { glob as find, globSync as findSync } from "tinyglobby";

function normalize(matches, options) {
  return options.onlyDirectories
    ? matches.map((match) => match.length > 1 ? match.replace(/\/$/, "") : match)
    : matches;
}

function matchingOptions(patterns, options) {
  return typeof patterns === "string" && path.isAbsolute(patterns)
    ? { absolute: true, ...options } : options;
}

export function globSync(patterns, options = {}) {
  return normalize(findSync(patterns, matchingOptions(patterns, options)), options);
}

export async function glob(patterns, options = {}) {
  return normalize(await find(patterns, matchingOptions(patterns, options)), options);
}

export { globSync as sync };
export default Object.assign(glob, { glob, globSync, sync: globSync });
