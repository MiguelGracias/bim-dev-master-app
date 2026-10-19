import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import { SmartViewsListState, SmartViewsListTableData } from "./types";
import { appIcons, hasHover, tip } from "../../../../globals";
import { SmartViews } from "../../../../bim-components";

export const setDefaults = (
  state: SmartViewsListState,
  table: BUI.Table<SmartViewsListTableData>,
) => {
  const { components } = state

  table.noIndentation = true
  table.headersHidden = true
  table.columns = ["Name", { name: "Actions", width: "auto" }]
  table.hiddenColumns = ["guid"]

  // Tapping the row (not only the small Apply icon) applies the view: easier on a phone
  table.addEventListener("rowcreated", (e: CustomEvent<BUI.RowCreatedEventDetail>) => {
    const { row } = e.detail
    row.style.cursor = "pointer"
    row.addEventListener("click", async (event) => {
      // The Apply and Update icons do their own thing
      if (event.composedPath().some((el) => el instanceof HTMLElement && el.tagName === "BIM-BUTTON")) return
      const guid = row.data.guid as string | undefined
      const smartViews = components.get(SmartViews)
      const view = guid ? smartViews.list.get(guid) : undefined
      if (view) await smartViews.apply(view)
    })
  })
  table.dataTransform = {
    Actions: (cellValue, rowData) => {
      const { guid } = rowData
      if (!guid) return cellValue

      const smartViews = components.get(SmartViews)
      const view = smartViews.list.get(guid)
      if (!view) return cellValue

      const onClick = async ({target: button}: {target: BUI.Button}) => {
        button.loading = true
        await smartViews.apply(view)
        button.loading = false
      }
      // Saves the current state (e.g. new query colors after applying the view) into this view
      // It replaces the view, so it asks first (on a phone it is easy to tap it instead of Apply)
      const onUpdate = () => {
        if (!confirm(`Replace "${view.name}" with the current colors and visibility?`)) return
        smartViews.update(guid)
      }

      return BUI.html`
        <bim-button @click=${onClick} style="flex: 0;" icon=${appIcons.APPLY} tooltip-title=${tip("Apply")}></bim-button>
        <bim-button @click=${onUpdate} style="flex: 0; ${hasHover ? "" : "margin-left: 16px;"}" icon=${appIcons.SAVE} tooltip-title=${tip("Update with the current state")}></bim-button>
      `
    }
  }
}