import { EnvironmentVars } from "./types.js";
import Handler from "./handler.js";

export default {
  async scheduled(
    event: ScheduledEvent,
    env: EnvironmentVars,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(Handler(event, env));
  },
};
