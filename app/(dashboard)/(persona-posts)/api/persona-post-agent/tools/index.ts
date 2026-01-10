import { AgentContext } from "../types";
import {
  createSearchPersonasTool,
  createGetPersonaPostHistoryTool,
  createGetPostByIdTool,
} from "./persona";
import {
  createReadKnowledgeBaseTool,
  createSearchInformationTool,
  createSearchProjectsTool,
} from "./knowledge";
import { createGeneratePostTool, createGeneratePosterTool } from "./post";
import { createSearchPexelsImageTool } from "./image";

export function getPersonaPostTools(context: AgentContext) {
  return {
    generatePost: createGeneratePostTool(context),
    readKnowledgeBase: createReadKnowledgeBaseTool(context),
    searchInformation: createSearchInformationTool(),
    getPersonaPostHistory: createGetPersonaPostHistoryTool(context),
    getPostById: createGetPostByIdTool(context),
    generatePoster: createGeneratePosterTool(context),
    searchProjects: createSearchProjectsTool(context),
    searchPersonas: createSearchPersonasTool(context),
    searchPexelsImage: createSearchPexelsImageTool(),
  };
}
