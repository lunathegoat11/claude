/** Test environment. Integration tests run against a separate PostgreSQL database. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://kosha:kosha@localhost:5432/kosha_test?schema=public";

export function applyTestEnv() {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    APP_SECRET: "test-secret-test-secret-test-secret-123",
    APP_URL: "http://localhost:3000",
    AI_PROVIDER: "demo",
    STORAGE_DRIVER: "local",
    STORAGE_LOCAL_DIR: "./storage-test",
    MAX_UPLOAD_MB: "2",
    ALLOW_SIGNUP: "true",
    LOG_LEVEL: "error",
  });
}
