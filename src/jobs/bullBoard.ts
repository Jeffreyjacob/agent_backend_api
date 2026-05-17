import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { allQueues } from ".";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: allQueues.map((queue) => new BullMQAdapter(queue)),
  serverAdapter,
  options: {
    uiConfig: {
      boardTitle: "real estate job queue",
    },
  },
});

export const bullboardRouter = serverAdapter.getRouter();
