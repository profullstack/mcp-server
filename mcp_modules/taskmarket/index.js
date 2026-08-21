/**
 * Taskmarket Module
 *
 * Delegate real work to Taskmarket from inside the Profullstack MCP server.
 * Browse open tasks, create a funded task after explicit user authorization,
 * and retrieve submissions for human review — all on Base mainnet via the
 * official taskmarket CLI (first-party tooling; no secrets handled here).
 */

import { logger } from "../../src/utils/logger.js";
import {
  listTasksHandler, getTaskHandler, createTaskHandler,
  listSubmissionsHandler, acceptSubmissionHandler, capabilities,
} from "./src/controller.js";
import { listCapabilities } from "./src/service.js";

export async function register(app) {
  logger.info("Registering taskmarket module");

  app.get("/taskmarket", (c) => c.json({
    module: "taskmarket",
    status: "active",
    message: "Delegate work to Taskmarket — browse, create (authorized), and review submissions on Base.",
    version: listCapabilities().version,
    network: listCapabilities().network,
  }));

  app.get("/taskmarket/capabilities", capabilities);
  app.get("/taskmarket/tasks", listTasksHandler);
  app.get("/taskmarket/tasks/:id", getTaskHandler);
  app.post("/taskmarket/tasks", createTaskHandler);
  app.get("/taskmarket/tasks/:id/submissions", listSubmissionsHandler);
  app.post("/taskmarket/tasks/:id/submissions/:subId/accept", acceptSubmissionHandler);

  app.get("/tools/taskmarket/info", (c) => c.json({
    name: "taskmarket",
    description:
      "Browse Taskmarket tasks, create a funded task with explicit user authorization, and review " +
      "submissions for human approval — all on Base mainnet via first-party taskmarket CLI.",
    examples: [
      "GET /taskmarket/tasks",
      "GET /taskmarket/tasks/:id",
      "POST /taskmarket/tasks {confirm:true, description, reward, durationHours, network:'base', maxSpend}",
      "GET /taskmarket/tasks/:id/submissions",
    ],
  }));
}

export { listCapabilities } from "./src/service.js";
export const metadata = { version: "1.0.0" };
