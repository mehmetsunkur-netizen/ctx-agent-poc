import {
  AgentStatusHandler,
  ConsoleStatusHandler,
} from "@isara-ctx/agent-framework";
import { BCPAgentTypes } from "./schemas";

// Rename from BCPAgentStatusHandler to CTXAgentStatusHandler
export interface CTXAgentStatusHandler extends AgentStatusHandler<BCPAgentTypes> {
  // No additional methods needed (removed onQueryUpdate since no query retrieval)
}

export class CTXAgentConsoleStatusHandler
  extends ConsoleStatusHandler<BCPAgentTypes>
  implements CTXAgentStatusHandler
{
  // Inherits all methods from ConsoleStatusHandler
}
