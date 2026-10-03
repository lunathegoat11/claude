import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { TEST_DATABASE_URL } from "./env";

/** Apply migrations to the test database once before all test files. */
export default function setup() {
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
  return () => rmSync("./storage-test", { recursive: true, force: true });
}
