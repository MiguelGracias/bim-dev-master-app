import * as OBC from "@thatopen/components"
import { SerializedSmartView, SmartViews } from "../../SmartViews"

export const setupSmartViews = (components: OBC.Components, savedViews: SerializedSmartView[] = []) => {
  const smartViews = components.get(SmartViews)
  // A project with stored views shows them; a new one gets the example view from the lessons
  if (savedViews.length > 0) {
    smartViews.import(savedViews)
    return
  }
  smartViews.list.set(OBC.UUID.create(), {
    name: "My Custom View",
    defaultVisibility: true,
    visibilityExceptions: {
      queries: new Set(["External Walls"])
    },
    colors: {
      queries: {
        "#ef9a9a": new Set(["Walls"]),
        "#a5d6a7": new Set(["Doors & Windows"]),
      }
    }
  })
}