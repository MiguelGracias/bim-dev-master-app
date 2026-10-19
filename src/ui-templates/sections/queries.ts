import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc"
import { loadModelBtnTemplate } from "../buttons";
import { queriesList } from "../tables/queries";
import { appIcons, tip } from "../../globals";
import { SmartViews } from "../../bim-components/SmartViews";
import { importCustomQueries, propertyQuery } from "../../bim-components/setup/src/items-finder";
import { downloadJSON, pickJSONFile } from "../../files";

export interface QueriesPanelState {
  components: OBC.Components;
}

export const queriesPanelTemplate: BUI.StatefullComponent<
  QueriesPanelState
> = (state) => {
  const { components } = state;

  const [modelsList] = queriesList({
    components,
  });

  const onSearch = (e: Event) => {
    const input = e.target as BUI.TextInput;
    modelsList.queryString = input.value;
  };

  const finder = components.get(OBC.ItemsFinder);

  // New query: items with a property value inside a property set
  const inputs: Record<string, BUI.TextInput> = {};
  const onInput = (key: string) => (e?: Element) => {
    if (e) inputs[key] = e as BUI.TextInput;
  };

  let message: BUI.Label | undefined;
  const onMessageCreated = (e?: Element) => {
    if (e) message = e as BUI.Label;
  };

  const onCreateQuery = async ({ target: button }: { target: BUI.Button }) => {
    const [name, pset, property, value] = ["name", "pset", "property", "value"].map((key) => inputs[key]?.value.trim() ?? "");
    if (!message) return;
    if (!pset || !property || !value) {
      message.textContent = "Fill in the property set, the property and the value.";
      return;
    }
    const queryName = name || `${pset} / ${property} = ${value}`;
    const query = finder.create(queryName, propertyQuery(pset, property, value));
    button.loading = true;
    const items = await query.test();
    button.loading = false;
    const count = Object.values(items).reduce((sum, ids) => sum + ids.size, 0);
    message.textContent = `"${queryName}" created: ${count} item(s) found.`;
    for (const input of Object.values(inputs)) input.value = "";
  };

  const onDownload = () => {
    downloadJSON("queries.json", finder.export());
  };

  const onUpload = async () => {
    const data = await pickJSONFile();
    if (!data) return;
    try {
      // Queries with the name of a predefined one are skipped: those can't be replaced
      importCustomQueries(components, Array.isArray(data?.data) ? data.data : []);
    } catch {
      alert("The file doesn't have valid queries");
    }
  };

  return BUI.html`
  <bim-panel-section fixed label="Queries List">
    <div style="display: flex; gap: 0.5rem;">
      <bim-text-input @input=${onSearch} placeholder="Search..." debounce="200"></bim-text-input>
      <bim-button style="flex: 0" icon=${appIcons.ADD} tooltip-title=${tip("New property query")}>
        <bim-context-menu>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 16rem;">
            <bim-label>Find items by a property value</bim-label>
            <bim-text-input ${BUI.ref(onInput("pset"))} label="Property set" placeholder="Pset_WallCommon"></bim-text-input>
            <bim-text-input ${BUI.ref(onInput("property"))} label="Property" placeholder="IsExternal"></bim-text-input>
            <bim-text-input ${BUI.ref(onInput("value"))} label="Value" placeholder="true"></bim-text-input>
            <bim-text-input ${BUI.ref(onInput("name"))} label="Query name (optional)"></bim-text-input>
            <bim-button @click=${onCreateQuery} icon=${appIcons.APPLY} label="Create and test"></bim-button>
            <bim-label ${BUI.ref(onMessageCreated)} style="white-space: normal;"></bim-label>
          </div>
        </bim-context-menu>
      </bim-button>
      <bim-button style="flex: 0" icon=${appIcons.DOWNLOAD} tooltip-title=${tip("Download queries")} @click=${onDownload}></bim-button>
      <bim-button style="flex: 0" icon=${appIcons.UPLOAD} tooltip-title=${tip("Upload queries")} @click=${onUpload}></bim-button>
    </div>
    ${modelsList}
  </bim-panel-section>`;
};