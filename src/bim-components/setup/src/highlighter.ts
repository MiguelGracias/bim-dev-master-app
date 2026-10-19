import * as OBC from "@thatopen/components"
import * as OBF from "@thatopen/components-front"

export const setupHighlighter = (components: OBC.Components, world: OBC.World) => {
  const highlighter = components.get(OBF.Highlighter)
  highlighter.setup({world})
}