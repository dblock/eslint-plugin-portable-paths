import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export function fixture(context) {
  const directory = mkdtempSync(join(tmpdir(), "portable-paths-test-"));
  context.after(() => rmSync(directory, { recursive: true }));
  const root = join(directory, "project");
  mkdirSync(root);
  writeFileSync(join(root, "eslint.config.mjs"), "export default [];\n");
  return { directory, root };
}
