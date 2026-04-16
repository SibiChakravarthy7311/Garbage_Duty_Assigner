import { buildApp } from "./app.js";

const { app, config } = await buildApp();

let halifaxSyncInterval: NodeJS.Timeout | undefined;

async function syncHalifaxSchedule(reason: string): Promise<void> {
  if (config.scheduleSource !== "halifax") {
    return;
  }

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/jobs/sync-schedule"
    });

    if (response.statusCode >= 400) {
      app.log.error({ reason, body: response.body }, "Automatic Halifax sync failed");
      return;
    }

    app.log.info({ reason }, "Automatic Halifax sync completed");
  } catch (error) {
    app.log.error({ reason, error }, "Automatic Halifax sync threw an error");
  }
}

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
  if (config.scheduleSource === "halifax") {
    void syncHalifaxSchedule("startup");
    halifaxSyncInterval = setInterval(() => {
      void syncHalifaxSchedule("daily");
    }, 24 * 60 * 60 * 1000);
  }
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

process.on("SIGINT", async () => {
  if (halifaxSyncInterval) {
    clearInterval(halifaxSyncInterval);
  }
  await app.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (halifaxSyncInterval) {
    clearInterval(halifaxSyncInterval);
  }
  await app.close();
  process.exit(0);
});
