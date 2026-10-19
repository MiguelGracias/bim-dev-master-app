import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { dataSourcesList } from "../tables/datasources";
import * as OBF from "@thatopen/components-front";
import { DataEnhancer } from "../../bim-components";
import { appIcons } from "../../globals";

export interface DataSourcesPanelState {
  components: OBC.Components;
}

export const dataSourcesPanelTemplate: BUI.StatefullComponent<
  DataSourcesPanelState
> = (state) => {
  const { components } = state;
  const enhancer = components.get(DataEnhancer)

  const [dataSources, updateDataSources] = dataSourcesList({
    components,
  });

  let currentSource: string | undefined

  const onSourceChange = ({ target }: { target: BUI.Dropdown }) => {
    const [source] = target.value
    currentSource = source
    updateDataSources({ source })
    BUI.ContextMenu.removeMenus()
  }

  // Selects every item sharing the source information of the selected items (e.g. same documentation)
  let message: BUI.Label | undefined
  const onMessageCreated = (e?: Element) => {
    if (e) message = e as BUI.Label
  }

  const onSelectSharing = async ({ target: button }: { target: BUI.Button }) => {
    if (!message) return
    const highlighter = components.get(OBF.Highlighter)
    const selection = highlighter.selection.select
    if (!currentSource) {
      message.textContent = "Choose a source first."
      return
    }
    if (OBC.ModelIdMapUtils.isEmpty(selection)) {
      message.textContent = "Select an item in the 3D first."
      return
    }
    button.loading = true
    const items = await enhancer.getItemsSharingData(currentSource, selection)
    button.loading = false
    const count = Object.values(items).reduce((sum, ids) => sum + ids.size, 0)
    if (count === 0) {
      message.textContent = `The selected items have no "${currentSource}" information.`
      return
    }
    await highlighter.highlightByID("select", items, true, true)
    message.textContent = `${count} item(s) share the same "${currentSource}" information.`
  }

  return BUI.html`
  <bim-panel-section fixed label="Sources">
    <div style="display: flex; gap: 0.5rem;">
      <bim-dropdown @change=${onSourceChange} placeholder="Select a datasource...">
        ${[...enhancer.sources.keys()].map(source => BUI.html`<bim-option label=${source}></bim-option>`)}
      </bim-dropdown>
    </div>
    <bim-label style="white-space: normal; color: var(--text-muted);">Click an entry to select the items with that information, or select an item in the 3D and use the button.</bim-label>
    <bim-button @click=${onSelectSharing} icon=${appIcons.SELECT_SAME} label="Select items with the same information"></bim-button>
    <bim-label ${BUI.ref(onMessageCreated)} style="white-space: normal;"></bim-label>
    ${dataSources}
  </bim-panel-section>`;
};