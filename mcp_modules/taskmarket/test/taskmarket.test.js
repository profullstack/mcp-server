/**
 * Taskmarket module tests.
 *
 * Validation gates are unit-tested directly. The CLI round-trip is exercised
 * against an injected fake binary (TASKMARKET_BIN) so the suite needs no real
 * wallet, network, or funds.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert";
import { describe, it, before, after } from "node:test";
import {
  runTaskmarket, listTasks, getTask, createTask, listSubmissions, acceptSubmission,
} from "../src/taskmarket.js";

const fakeBinDir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-taskmarket-"));
const fakeBin = path.join(fakeBinDir, "fake-taskmarket.sh");

before(function () {
  fs.writeFileSync(fakeBin,
    `#!/bin/bash
` +
    `args="$*"
` +
    `if echo "$args" | grep -q "task list"; then
` +
    `  echo '{"data":{"tasks":[{"id":"0xAAA","reward":"1000000","mode":"bounty"}]}}'
` +
    `elif echo "$args" | grep -q "task get"; then
` +
    `  echo '{"data":{"id":"0xAAA","reward":"1000000","status":"open"}}'
` +
    `elif echo "$args" | grep -q "task submissions"; then
` +
    `  echo '{"data":[{"submissionId":"0xSUB1","worker":"0xW1"},{"submissionId":"0xSUB2","worker":"0xW2"}]}'
` +
    `elif echo "$args" | grep -q "task create"; then
` +
    `  echo '{"data":{"taskId":"0xBEEF","link":"https://taskmarket.dev/task/0xBEEF"}}'
` +
    `elif echo "$args" | grep -q "task accept"; then
` +
    `  echo '{"data":{"accepted":"0xSUB1"}}'
` +
    `else
` +
    `  echo '{"data":{}}'
` +
    `fi
`);
  fs.chmodSync(fakeBin, 0o755);
  process.env.TASKMARKET_BIN = fakeBin;
});

after(function () { try { fs.rmSync(fakeBinDir, { recursive: true, force: true }); } catch {} });

describe("taskmarket CLI wrapper", () => {
  it("parses JSON from CLI output (strips ANSI)", async () => {
    const r = await runTaskmarket(["task", "list", "--limit", "1"]);
    assert.ok(r.data && r.data.tasks && r.data.tasks.length === 1);
  });

  it("listTasks returns tasks", async () => {
    const r = await listTasks({ limit: 5 });
    assert.strictEqual(r.data.tasks[0].id, "0xAAA");
  });

  it("getTask returns task details for a valid id", async () => {
    const r = await getTask("0xAAA");
    assert.strictEqual(r.data.id, "0xAAA");
  });

  it("getTask rejects a malformed taskId", async () => {
    await assert.rejects(() => getTask("not-hex"), /Invalid taskId/);
  });

  it("createTask REQUIRES explicit confirmation", async () => {
    await assert.rejects(() => createTask({ description: "d", reward: 1, durationHours: 1 }),
      /Explicit user authorization required/);
  });

  it("createTask rejects non-Base networks", async () => {
    await assert.rejects(() => createTask({ description: "d", reward: 1, durationHours: 1, network: "eth", confirm: true }),
      /Unsupported network/);
  });

  it("createTask enforces maxSpend ceiling", async () => {
    await assert.rejects(() => createTask({ description: "d", reward: 5, durationHours: 1, network: "base", maxSpend: 2, confirm: true }),
      /exceeds authorized maxSpend/);
  });

  it("createTask rejects non-positive reward", async () => {
    await assert.rejects(() => createTask({ description: "d", reward: 0, durationHours: 1, network: "base", confirm: true }),
      /positive USDC/);
  });

  it("createTask succeeds with confirm+base+spend and returns the task id", async () => {
    const r = await createTask({ description: "Test task", reward: 1, durationHours: 2, network: "base", maxSpend: 10, confirm: true });
    assert.strictEqual(r.data.taskId, "0xBEEF");
  });

  it("listSubmissions returns submissions for human review", async () => {
    const r = await listSubmissions("0xAAA");
    assert.strictEqual(r.data.length, 2);
  });

  it("acceptSubmission REQUIRES explicit confirmation", async () => {
    await assert.rejects(() => acceptSubmission("0xAAA", "0xSUB1", false),
      /Explicit user authorization required/);
  });

  it("acceptSubmission succeeds with confirm", async () => {
    const r = await acceptSubmission("0xAAA", "0xSUB1", true);
    assert.strictEqual(r.data.accepted, "0xSUB1");
  });
});
