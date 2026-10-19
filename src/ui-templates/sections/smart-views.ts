import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { smartViewsList } from "../tables/smart-views";
import { appIcons, tip } from "../../globals";
import { SmartViews } from "../../bim-components";
import { downloadJSON, pickJSONFile } from "../../files";
import { getStoreyNames, storeyQuery } from "../../bim-components/setup/src/items-finder";

export interface SmartViewsPanelState {
  components: OBC.Components;
}

export const smartViewsPanelTemplate: BUI.StatefullComponent<
  SmartViewsPanelState
> = (state) => {
  const { components } = state;

  const [smartViewsElement] = smartViewsList({
    components,
  });

  const onSearch = (e: Event) => {
    const input = e.target as BUI.TextInput;
    smartViewsElement.queryString = input.value;
  };

  let textInput: BUI.TextInput | undefined;
  const onTextInputCreated = (e?: Element) => {
    if (!e) return;
    textInput = e as BUI.TextInput;
  };

  const onCreateClick = () => {
    if (!textInput) return
    const name = textInput.value
    if (name.trim() === "") return
    const smartViews = components.get(SmartViews)
    smartViews.saveCurrentState(name)
  }

  // Storey view: only the elements of the chosen storey stay visible.
  // The items are stored in the view, so it works again after reloading the project.
  let storeySelect: HTMLSelectElement | undefined
  const onStoreySelectCreated = (e?: Element) => {
    if (e) storeySelect = e as HTMLSelectElement
  }

  const fillStoreys = async () => {
    if (!storeySelect) return
    const names = await getStoreyNames(components)
    storeySelect.innerHTML = names.length === 0
      ? `<option value="">Load a model first</option>`
      : names.map((name) => `<option>${name.replace(/</g, "&lt;")}</option>`).join("")
  }

  const onCreateStoreyView = async ({ target: button }: { target: BUI.Button }) => {
    const storey = storeySelect?.value
    if (!storey) return
    button.loading = true
    const items = await components.get(OBC.ItemsFinder).getItems(storeyQuery(storey))
    components.get(SmartViews).list.set(OBC.UUID.create(), {
      name: `Storey: ${storey}`,
      defaultVisibility: false,
      visibilityExceptions: { items },
      colors: {},
    })
    button.loading = false
    BUI.ContextMenu.removeMenus()
  }

  const onDownload = () => {
    downloadJSON("smart-views.json", components.get(SmartViews).export())
  }

  const onUpload = async () => {
    const data = await pickJSONFile()
    if (!data) return
    const imported = components.get(SmartViews).import(Array.isArray(data) ? data : [data])
    if (imported.length === 0) alert("The file doesn't have valid smart views")
  }

  const onReset = async ({target: button}: {target: BUI.Button}) => {
    button.loading = true
    const smartViews = components.get(SmartViews)
    await smartViews.reset()
    button.loading = false
  }

  return BUI.html`
  <bim-panel-section fixed label="Smart Views">
    <div style="display: flex; gap: 0.5rem;">
      <bim-text-input @input=${onSearch} placeholder="Search..." debounce="200"></bim-text-input>
      <bim-button @click=${onReset} icon=${appIcons.REFRESH} style="flex: 0" tooltip-title=${tip("Reset the view")}></bim-button>
      <bim-button style="flex: 0" icon=${appIcons.STOREY} tooltip-title=${tip("New storey view")} @click=${fillStoreys}>
        <bim-context-menu>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 14rem;">
            <bim-label>Only the elements of this storey</bim-label>
            <select class="storey-select" ${BUI.ref(onStoreySelectCreated)}></select>
            <bim-button @click=${onCreateStoreyView} icon=${appIcons.ADD} label="Create storey view"></bim-button>
          </div>
        </bim-context-menu>
      </bim-button>
      <bim-button @click=${onDownload} icon=${appIcons.DOWNLOAD} style="flex: 0" tooltip-title=${tip("Download smart views")}></bim-button>
      <bim-button @click=${onUpload} icon=${appIcons.UPLOAD} style="flex: 0" tooltip-title=${tip("Upload smart views")}></bim-button>
      <bim-button style="flex: 0" icon=${appIcons.ADD}>
        <bim-context-menu>
          <div style="display: flex; gap: 0.5rem;">
            <bim-text-input ${BUI.ref(onTextInputCreated)} style="width: 10rem"></bim-text-input>
            <bim-button @click=${onCreateClick} style="flex: 0" label="Create"></bim-button>
          </div>
        </bim-context-menu>
      </bim-button>
    </div>
    ${smartViewsElement}
  </bim-panel-section>`;
};