import {
  AgentStatusHandler,
  ConsoleStatusHandler,
} from "@isara-ctx/agent-framework";
import { CTXAgentTypes } from "./schemas";

export interface CTXAgentStatusHandler extends AgentStatusHandler<CTXAgentTypes> {
  // No additional methods needed (removed onQueryUpdate since no query retrieval)
}

export class CTXAgentConsoleStatusHandler
  extends ConsoleStatusHandler<CTXAgentTypes>
  implements CTXAgentStatusHandler
{
  // Inherits all methods from ConsoleStatusHandler
}
