/**
 * HTTP handlers for the taskmarket module.
 *
 * Authorization model: every fund-moving action (create a task, accept a
 * submission) requires the caller to send confirm:true. The server never
 * spends on its own — it only forwards a deliberate, authorized request to the
 * first-party taskmarket CLI.
 */
import {
  listTasks, getTask, createTask, listSubmissions, acceptSubmission, listCapabilities,
} from "./service.js";

export async function listTasksHandler(c) {
  try {
    const limit = Number(c.req.query("limit") || 20);
    const mode = c.req.query("mode") || null;
    const data = await listTasks({ limit, mode });
    return c.json({ tasks: data });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
}

export async function getTaskHandler(c) {
  try {
    const taskId = c.req.param("id");
    const data = await getTask(taskId);
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
}

export async function createTaskHandler(c) {
  try {
    const params = await c.req.json();
    if (params.confirm !== true) {
      return c.json(
        { error: "Explicit user authorization required: send confirm:true to create a funded task.",
          requireConfirmation: true }, 400);
    }
    const data = await createTask(params);
    return c.json({ created: data });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
}

export async function listSubmissionsHandler(c) {
  try {
    const taskId = c.req.param("id");
    const data = await listSubmissions(taskId);
    return c.json({ submissions: data });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
}

export async function acceptSubmissionHandler(c) {
  try {
    const taskId = c.req.param("id");
    const submissionId = c.req.param("subId");
    const body = await c.req.json().catch(() => ({}));
    if (body.confirm !== true) {
      return c.json(
        { error: "Explicit user authorization required: send confirm:true to accept a submission.",
          requireConfirmation: true }, 400);
    }
    const data = await acceptSubmission(taskId, submissionId, true);
    return c.json({ accepted: data });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
}

export async function capabilities(c) {
  return c.json(listCapabilities());
}
