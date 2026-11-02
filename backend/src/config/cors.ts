const DEVELOPMENT_ORIGIN = 'http://localhost:5173';

// The addresses of the frontend that may call the backend: CORS_ORIGINS, separated by commas.
// Only development can do without it. A browser sends an origin without a trailing slash, so one in the setting is dropped
export function getAllowedOrigins(): string[] {
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter((origin) => origin);

  if (origins.length) return origins;

  if (process.env.NODE_ENV === 'production') {
    console.error('❌ CORS_ORIGINS is missing: the backend needs the address of the frontend');
    process.exit(1);
  }
  return [DEVELOPMENT_ORIGIN];
}
