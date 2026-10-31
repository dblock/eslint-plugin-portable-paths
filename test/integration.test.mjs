import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, URL } from "node:url";
import { createConsumer } from "../fixtures/integration.mjs";

test("installed ESLint CLI acceptance fixtures", async (context) => {
  const consumer = createConsumer(context);
  const root = fileURLToPath(new URL("../fixtures/integration/", import.meta.url));
  const fixtures = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert(fixtures.includes("clean"));
  assert(fixtures.includes("file-collision"));
  for (const name of fixtures) {
    await context.test(name, (testContext) => consumer.run(testContext, join(root, name)));
  }
  consumer.unchanged();
});
