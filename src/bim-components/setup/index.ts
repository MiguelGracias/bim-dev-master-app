import * as OBC from "@thatopen/components";
import { SerializedSmartView } from "../SmartViews";
import { createWorld, setupDataEnhancer, setupFragmentsManager, setupHighlighter, setupIfcLoader, setupItemsFinder, setupSmartViews } from "./src";

// savedViews: the smart views stored with the project (Firestore)
export const setupComponents = async (savedViews: SerializedSmartView[] = []) => {
  const components = new OBC.Components();
  const { world, viewport } = createWorld(components)

  setupIfcLoader(components)
  setupFragmentsManager(components, world)
  setupHighlighter(components, world)
  setupItemsFinder(components)
  setupDataEnhancer(components)
  setupSmartViews(components, savedViews)

  components.init()

  return { components, viewport }
}