import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";

let loaded = false;

/** Load .env from the nearest ancestor directory (repo root) once, then local cwd. */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) {
      dotenv.config({ path: candidate });
      break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  dotenv.config();
}
