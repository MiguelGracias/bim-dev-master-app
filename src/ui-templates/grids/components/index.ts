import * as BUI from "@thatopen/ui";
import { ComponentsGrid } from "./src";
import { viewportContainerTemplate } from "../../containers";
import { dataSourcesPanelTemplate, itemsDataPanelTemplate, modelsPanelTemplate, queriesPanelTemplate, smartViewsPanelTemplate } from "../../sections";
import * as OBC from "@thatopen/components"

export interface ComponentsGridState {
  components: OBC.Components
  viewport?: BUI.Viewport
}

export const componentsGridTemplate: BUI.StatefullComponent<ComponentsGridState> = (state) => {
  const { components, viewport } = state
  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as ComponentsGrid;

    grid.elements = {
      viewport: {
        template: viewportContainerTemplate,
        initialState: { viewport },
      },
      itemsData: {
        template: itemsDataPanelTemplate,
        initialState: { components }
      },
      models: {
        template: modelsPanelTemplate,
        initialState: { components }
      },
      queries: {
        template: queriesPanelTemplate,
        initialState: { components }
      },
      datasources: {
        template: dataSourcesPanelTemplate,
        initialState: { components }
      },
      smartViews: {
        template: smartViewsPanelTemplate,
        initialState: { components }
      },
    };

    // Phones: one column, the 3D on top and the panels below it (the grid scrolls)
    // ponytail: chosen when the page opens; rotating the phone needs a reload to switch
    const isPhone = window.matchMedia("(max-width: 600px)").matches

    grid.layouts = {
      Models: {
        template: isPhone ? `
          "viewport" 50vh
          "models" 40vh
          "queries" 50vh
          "datasources" 40vh
          "itemsData" 50vh
          /1fr
        ` : `
          "models viewport itemsData" 1fr
          "queries viewport datasources" 1fr
          /22rem 1fr 22rem
        `,
      },
      SmartViews: {
        template: isPhone ? `
          "viewport" 50vh
          "smartViews" 40vh
          "queries" 50vh
          /1fr
        ` : `
          "viewport smartViews" 1fr
          "viewport queries" 1fr
          /1fr 22rem
        `,
      },
      Viewer: {
        template: `
          "viewport" 1fr
          /1fr
        `,
      },
    };

    grid.layout = "Viewer" // the 3D takes the whole screen; Models and SmartViews show the panels
  }
  return BUI.html`<bim-grid ${BUI.ref(onCreated)} class="components-grid"></bim-grid>`
}