/**
 * Server-side logger.
 * Console-based in development, structured JSON in production.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  message: string;
  [key: string]: unknown;
}

const isProd = process.env.NODE_ENV === "production";

function formatLog(level: LogLevel, payload: LogPayload): string {
  if (isProd) {
    return JSON.stringify({
      level,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }
  const prefix = `[${level.toUpperCase()}]`;
  const { message, ...rest } = payload;
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `${prefix} ${message}${extra}`;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (isProd) return; // suppress debug in production
    console.debug(formatLog("debug", { message, ...meta }));
  },

  info(message: string, meta?: Record<string, unknown>) {
    console.info(formatLog("info", { message, ...meta }));
  },

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(formatLog("warn", { message, ...meta }));
  },

  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    const errorMeta: Record<string, unknown> = { ...meta };
    if (error instanceof Error) {
      errorMeta.errorMessage = error.message;
      errorMeta.stack = isProd ? undefined : error.stack;
    } else if (error !== undefined) {
      errorMeta.error = error;
    }
    console.error(formatLog("error", { message, ...errorMeta }));
  },
};
