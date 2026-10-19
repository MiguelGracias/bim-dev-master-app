import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { appIcons, tip } from "../../globals";
import { SmartViews } from "../../bim-components/SmartViews";

export interface GridSidebarState {
  grid?: BUI.Grid<any, any>;
  components?: OBC.Components;
}

export const gridSidebarTemplate: BUI.StatefullComponent<GridSidebarState> = (
  state,
  update
) => {
  const { grid, components } = state;

  // Resets the model: no colors, everything visible (same as the reset of the smart views)
  const onReset = async ({ target: button }: { target: BUI.Button }) => {
    if (!components) return
    button.loading = true
    await components.get(SmartViews).reset()
    button.loading = false
  }

  // The layout buttons (Models, SmartViews, Viewer) are in the Project panel of the side menu
  let sidebarButtons: BUI.TemplateResult | undefined
  if (grid) {
    sidebarButtons = BUI.html`
      <div style="display: flex; flex-direction: row; gap: 0.5rem; width: 100%">
        <bim-button style="flex: 0; margin-left: auto;" icon=${appIcons.REFRESH} label="Reset" tooltip-title=${tip("Reset the model: no colors, everything visible")} @click=${onReset}></bim-button>
      </div>
    `
  }

  return BUI.html`
    <div style="display: flex; flex-direction: column; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--bim-ui_bg-contrast-40); padding: 0.5rem 0.5rem 0.5rem 3.5rem;">
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%">
        ${sidebarButtons}
      </div>
    </div>
  `;
};