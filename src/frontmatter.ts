import defaultTemplate from "../default-template.md";

const IMG_ORIGINAL = "https://image.tmdb.org/t/p/original";
const TMDB_SHOW_BASE = "https://www.themoviedb.org/tv";

interface Provider {
  name: string;
}

interface Providers {
  stream: Provider[];
  rent: Provider[];
  buy: Provider[];
}

interface Nameable {
  name?: string;
  title?: string;
  username?: string;
  iso_3166_1?: string;
  iso_639_1?: string;
  id?: number;
}

function extractItemName(item: Nameable | string): string {
  if (typeof item === "string") return item;
  return (
    item.name ||
    item.title ||
    item.username ||
    item.iso_3166_1 ||
    item.iso_639_1 ||
    (item.id ? String(item.id) : "") ||
    ""
  );
}

function needsYamlQuotes(v: string): boolean {
  if (v.length === 0) return true;
  if (v !== v.trim()) return true;

  if (
    v.includes(":") ||
    v.includes("'") ||
    v.includes('"') ||
    v.includes("\n") ||
    v.includes("\r") ||
    v.includes("\t") ||
    v.includes("{") ||
    v.includes("}") ||
    v.includes("[") ||
    v.includes("]") ||
    v.includes(",") ||
    v.includes("&") ||
    v.includes("*") ||
    v.includes("#")
  ) {
    return true;
  }

  if (/[!%@`]/.test(v[0])) return true;
  if (v.startsWith("-") || v.startsWith("?") || v.startsWith("|") || v.startsWith(">")) return true;

  const lower = v.toLowerCase();
  if (["true", "false", "yes", "no", "on", "off", "null", "~"].includes(lower)) {
    return true;
  }

  if (/^[+-]?\d+(\.\d+)?$/.test(v)) return true;

  return false;
}

function escapeYamlString(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/"/g, '\\"');
}

function quoteValue(v: string): string {
  return needsYamlQuotes(v) ? `"${escapeYamlString(v)}"` : v;
}

function serializeScalar(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (obj.name || obj.title) return String(obj.name || obj.title);
    if (obj.id) return String(obj.id);
    return JSON.stringify(value);
  }
  return String(value);
}

function formatScalar(value: unknown): string {
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  return quoteValue(serializeScalar(value));
}

export const DEFAULT_TEMPLATE = defaultTemplate.trim();

function buildTemplateData(
  show: Record<string, any>,
  providers: Providers
): Record<string, any> {
  const data: Record<string, any> = {};
  const skipKeys = new Set(["homepage"]);

  for (const [key, value] of Object.entries(show)) {
    if (skipKeys.has(key)) continue;
    if (value === null || value === undefined) continue;

    if (key === "poster_path" && value) {
      data[key] = `${IMG_ORIGINAL}${value}`;
      continue;
    }
    if (key === "backdrop_path" && value) {
      data[key] = `${IMG_ORIGINAL}${value}`;
      continue;
    }

    if (Array.isArray(value)) {
      const items = value
        .map((item) => serializeScalar(extractItemName(item as Nameable | string)))
        .filter((s) => s !== "");
      data[key] = items.length > 0 ? items : null;
      continue;
    }

    const v = serializeScalar(value);
    if (v === "") continue;
    data[key] = value;
  }

  data.streaming_providers = (providers.stream || []).map((p) => p.name);
  data.rent_providers = (providers.rent || []).map((p) => p.name);
  data.buy_providers = (providers.buy || []).map((p) => p.name);

  if (typeof show.id === "number") {
    data.tmdb_url = `${TMDB_SHOW_BASE}/${show.id}`;
  }

  return data;
}

export function generateFrontmatter(
  show: Record<string, any>,
  providers: Providers,
  region: string,
  template: string
): string {
  const tmpl = template.trim() || DEFAULT_TEMPLATE;
  const preprocessed = tmpl.replace(/\{\{region\}\}/g, region.toLowerCase());
  const data = buildTemplateData(show, providers);
  const lines = preprocessed.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const matches = [...line.matchAll(placeholderRegex)];

    if (matches.length === 0) {
      result.push(line);
      continue;
    }

    let skipLine = false;
    let arrayKey: string | null = null;

    for (const match of matches) {
      const key = match[1];
      const value = data[key];
      if (value === null || value === undefined) {
        skipLine = true;
        break;
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          skipLine = true;
          break;
        }
        arrayKey = key;
      }
    }

    if (skipLine) continue;

    if (arrayKey !== null) {
      let rendered = line;
      for (const match of matches) {
        const key = match[1];
        if (key === arrayKey) continue;
        rendered = rendered.replace(match[0], formatScalar(data[key]));
      }
      const keyLine = rendered
        .replace(`{{${arrayKey}}}`, "")
        .replace(/:\s*$/, ":");
      result.push(keyLine);
      const arrayValue = data[arrayKey] as string[];
      for (const item of arrayValue) {
        result.push(`  - ${quoteValue(item)}`);
      }
    } else {
      let rendered = line;
      for (const match of matches) {
        const key = match[1];
        rendered = rendered.replace(match[0], formatScalar(data[key]));
      }
      result.push(rendered);
    }
  }

  return result.join("\n");
}
