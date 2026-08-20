/**
 * Basic usage example for the Taskmarket module.
 *
 * Real CLI:           node examples/basic-usage.js
 * Injected fake CLI:  TASKMARKET_BIN=./fake.sh node examples/basic-usage.js
 *
 * The demo never spends funds: createTask is shown with confirm:false so the
 * authorization gate rejects it. Flip to true only with a funded, authorized wallet.
 */
import { listTasks, getTask, listSubmissions, createTask } from "../src/taskmarket.js";

async function main() {
  console.log("== Browse open tasks ==");
  const tasks = await listTasks({ limit: 5 });
  console.log(JSON.stringify(tasks, null, 2));

  const firstId = tasks?.data?.tasks?.[0]?.id;
  if (firstId) {
    console.log("\n== Get task details ==");
    console.log(JSON.stringify(await getTask(firstId), null, 2));

    console.log("\n== List submissions for human review ==");
    console.log(JSON.stringify(await listSubmissions(firstId), null, 2));
  }

  console.log("\n== Create a funded task (authorization gate) ==");
  try {
    await createTask({ description: "Demo task", reward: 1, durationHours: 24, network: "base", maxSpend: 1, confirm: false });
  } catch (e) {
    console.log("Authorization gate worked as designed ->", e.message);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
