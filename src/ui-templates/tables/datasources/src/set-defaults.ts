import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { DataSourcesListState } from "./types";
import { DataEnhancer } from "../../../../bim-components";

export const setDefaults = (
  state: DataSourcesListState,
  table: BUI.Table,
) => {
  const { components } = state

  table.noIndentation = true
  table.addEventListener("rowcreated", (e: CustomEvent<BUI.RowCreatedEventDetail>) => {
    const { row } = e.detail
    // Clicking an entry selects every item that has that same information
    row.style.cursor = "pointer"
    row.addEventListener("click", async () => {
      const source = table.dataset.source
      if (!source) return
      const enhancer = components.get(DataEnhancer)
      const items = await enhancer.getItemsWithData(source, row.data)
      const highlighter = components.get(OBF.Highlighter)
      if (OBC.ModelIdMapUtils.isEmpty(items)) {
        await highlighter.clear("select")
        return
      }
      await highlighter.highlightByID("select", items, true, true)
    })
  })
}