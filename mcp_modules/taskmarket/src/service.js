/**
 * Taskmarket service — thin wrapper exposing the CLI-backed operations and
 * capability metadata to the HTTP/tool layer. All safety gates (explicit
 * confirmation, Base-only network, max-spend ceiling) live in src/taskmarket.js.
 */
import {
  listTasks, getTask, createTask, listSubmissions, acceptSubmission,
  TASKMARKET_MODULE_VERSION, SUPPORTED_NETWORK,
} from "./taskmarket.js";

export const TASKMARKET_VERSION = TASKMARKET_MODULE_VERSION;

export function listCapabilities() {
  return {
    version: TASKMARKET_MODULE_VERSION,
    network: SUPPORTED_NETWORK,
    tools: ["listTasks", "getTask", "createTask", "listSubmissions", "acceptSubmission"],
    notes:
      "Uses first-party taskmarket CLI; no secrets stored. Mutating calls " +
      "(createTask, acceptSubmission) require confirm:true from the caller.",
  };
}

export { listTasks, getTask, createTask, listSubmissions, acceptSubmission };
