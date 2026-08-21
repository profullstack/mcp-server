/**
 * Taskmarket module — first-party CLI wrapper.
 *
 * Uses the OFFICIAL `taskmarket` CLI as first-party Taskmarket tooling.
 * No private keys, seed phrases, tokens, cookies, or secrets are requested,
 * stored, logged, or committed: the CLI reads the operator's configured wallet
 * from its own secure store. This module only shells out to the CLI and parses
 * its JSON output. Every mutating call (create / accept) is gated on an explicit
 * `confirm` flag so no funds move without fresh, deliberate user authorization.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Binary resolved at call time so tests can inject a fake via TASKMARKET_BIN.
export const TASKMARKET_MODULE_VERSION = "1.0.0";
export const SUPPORTED_NETWORK = "base"; // Base mainnet only — never blindly spend elsewhere

function stripAnsi(s) {
  return String(s).replace(/\x1b\[[0-9;]*m/g, "");
}

function extractJson(text) {
  const clean = stripAnsi(text);
  const s = clean.indexOf("{");
  const e = clean.lastIndexOf("}");
  if (s < 0 || e < 0 || e <= s) return null;
  try {
    return JSON.parse(clean.slice(s, e + 1));
  } catch {
    return null;
  }
}

/** Run the taskmarket CLI and return parsed JSON (or {raw} when no JSON is emitted). */
export async function runTaskmarket(args, { timeout = 120000 } = {}) {
  const bin = process.env.TASKMARKET_BIN || "taskmarket";
  const { stdout, stderr } = await execFileAsync(bin, args, {
    timeout,
    maxBuffer: 16 * 1024 * 1024,
  });
  const out = stripAnsi((stdout || "") + "\n" + (stderr || ""));
  const data = extractJson(out);
  return data === null ? { raw: out.trim() } : data;
}

const HEX = /^0x[0-9a-fA-F]+$/;

export async function listTasks({ limit = 20, mode = null } = {}) {
  const args = ["task", "list", "--limit", String(limit)];
  if (mode) args.push("--mode", mode);
  return runTaskmarket(args);
}

export async function getTask(taskId) {
  if (!HEX.test(taskId)) throw new Error("Invalid taskId");
  return runTaskmarket(["task", "get", taskId]);
}

/**
 * Create a Taskmarket task (costs `reward` USDC from the configured wallet).
 * Requires explicit `confirm: true`. Enforces Base network + spending ceiling.
 * Never retries blindly: any failure is surfaced to the caller.
 */
export async function createTask(params) {
  const { description, reward, durationHours, mode = "bounty", visibility = "public",
          network = "base", confirm, maxSpend } = params;

  if (confirm !== true) {
    throw new Error("Explicit user authorization required: pass confirm:true to create a funded task.");
  }
  if (network !== SUPPORTED_NETWORK) {
    throw new Error(`Unsupported network "${network}". This integration only operates on Base mainnet.`);
  }
  if (typeof description !== "string" || !description.trim()) {
    throw new Error("description (non-empty string) is required");
  }
  const rewardNum = Number(reward);
  if (!Number.isFinite(rewardNum) || rewardNum <= 0) {
    throw new Error("reward must be a positive USDC amount");
  }
  const maxNum = maxSpend == null ? Infinity : Number(maxSpend);
  if (!Number.isFinite(maxNum) || rewardNum > maxNum) {
    throw new Error(`reward ${rewardNum} USDC exceeds authorized maxSpend ${maxNum} USDC`);
  }
  const dur = Number(durationHours);
  if (!Number.isFinite(dur) || dur <= 0) {
    throw new Error("durationHours must be a positive number");
  }

  const args = [
    "task", "create",
    "--description", description,
    "--reward", String(rewardNum),
    "--duration", String(dur),
    "--mode", mode,
    "--task-visibility", visibility,
  ];
  // Returns the created task id / link on success. No blind retry on failure.
  return runTaskmarket(args);
}

export async function listSubmissions(taskId) {
  if (!HEX.test(taskId)) throw new Error("Invalid taskId");
  return runTaskmarket(["task", "submissions", taskId]);
}

/**
 * Accept a submission (costs 0.001 USDC). Requires explicit `confirm: true`.
 * Presented only after human review — never silently auto-accepted.
 */
export async function acceptSubmission(taskId, submissionId, confirm) {
  if (!HEX.test(taskId)) throw new Error("Invalid taskId");
  if (confirm !== true) {
    throw new Error("Explicit user authorization required: pass confirm:true to accept a submission.");
  }
  const args = ["task", "accept", taskId];
  if (submissionId) args.push("--submission", String(submissionId));
  return runTaskmarket(args);
}
