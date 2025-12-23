const parsePort = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const tz = process.env.TZ ?? "UTC";
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const port = parsePort(process.env.PORT ?? process.env.API_PORT, 4000);

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = nodeEnv;
}

if (!process.env.TZ) {
  process.env.TZ = tz;
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: port,
  TZ: tz,
  CORS_ORIGIN: corsOrigin
} as const;
