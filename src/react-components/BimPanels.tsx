import * as React from "react";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "../ui-templates/sections";

export type PanelsView = "Models" | "SmartViews" | "Viewer"

// Panels of each view; they are shown in the side menu so the 3D keeps the whole screen
const panelsOfView: Record<PanelsView, string[]> = {
  Models: ["models", "queries", "datasources", "itemsData"],
  SmartViews: ["smartViews", "queries"],
  Viewer: [],
}

// The That Open panels (BUI templates), created once and only shown or hidden
export function BimPanels({ components, view }: { components: OBC.Components | null, view: PanelsView }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const panelsRef = React.useRef<Record<string, HTMLElement>>({})

  React.useEffect(() => {
    const container = containerRef.current
    if (!components || !container) return
    const templates: Record<string, BUI.StatefullComponent<{ components: OBC.Components }>> = {
      models: TEMPLATES.modelsPanelTemplate,
      queries: TEMPLATES.queriesPanelTemplate,
      datasources: TEMPLATES.dataSourcesPanelTemplate,
      itemsData: TEMPLATES.itemsDataPanelTemplate,
      smartViews: TEMPLATES.smartViewsPanelTemplate,
    }
    // Same order as the views list them
    for (const name of ["models", "smartViews", "queries", "datasources", "itemsData"]) {
      const [panel] = BUI.Component.create(templates[name], { components })
      panel.classList.add("bim-side-panel")
      panelsRef.current[name] = panel
      container.append(panel)
    }
    return () => {
      for (const panel of Object.values(panelsRef.current)) panel.remove()
      panelsRef.current = {}
    }
  }, [components])

  React.useEffect(() => {
    const shown = new Set(panelsOfView[view])
    for (const [name, panel] of Object.entries(panelsRef.current)) panel.style.display = shown.has(name) ? "" : "none"
  }, [view, components])

  return <div ref={containerRef} className="bim-side-panels"></div>
}
