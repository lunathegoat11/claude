import "server-only";

type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Keys that may contain health data or secrets. Values are never logged. */
const REDACT =
  /(password|token|secret|cookie|authorization|notes|content|value|text|name|email|phone|dob|dateOfBirth|question|answer)/i;

function redact(meta: unknown, depth = 0): unknown {
  if (meta == null || depth > 3) return meta;
  if (meta instanceof Error) return { name: meta.name, message: meta.message, stack: meta.stack };
  if (Array.isArray(meta)) return meta.slice(0, 20).map((m) => redact(m, depth + 1));
  if (typeof meta === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
      out[k] = REDACT.test(k) && k !== "errorName" ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return meta;
}

function threshold(): number {
  const lvl = (process.env.LOG_LEVEL as Level) || "info";
  return order[lvl] ?? order.info;
}

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (order[level] < threshold()) return;
  if (process.env.NODE_ENV === "test" && level !== "error") return;
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    msg,
    ...(meta ? { meta: redact(meta) } : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * Structured server logger. Automatically redacts fields that could carry
 * personal or clinical information. Never use it to log record contents.
 */
export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};
