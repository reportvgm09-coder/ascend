// Load server/.env when present. Imported first so every other module sees the values.
try {
  process.loadEnvFile();
} catch {
  // no .env file: rely on the real environment
}
