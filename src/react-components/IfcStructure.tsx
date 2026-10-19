import * as React from "react";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";

// All the elements inside a root, including the ones in shadow DOMs (the BUI table uses them)
const deepQuery = (root: Element | ShadowRoot, selector: string, found: Element[] = []) => {
  for (const element of root.querySelectorAll("*")) {
    if (element.matches(selector)) found.push(element)
    if (element.shadowRoot) deepQuery(element.shadowRoot, selector, found)
  }
  return found
}

// Opens every group above a row of the tree, so the row can be seen
const revealRow = (row: Element) => {
  let node: Node | null = row
  while (node) {
    if (node instanceof HTMLElement && node.tagName === "BIM-TABLE-GROUP") (node as BUI.TableGroup<any>).childrenHidden = false
    node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null)
  }
}

// Spatial levels keep their contents; any other IFC class row is the end of the tree (no element rows)
const spatialClasses = new Set(["IFCPROJECT", "IFCSITE", "IFCBUILDING", "IFCBUILDINGSTOREY", "IFCSPACE"])

const isClassRow = (data: Record<string, any>) => typeof data.children === "string" && data.localId === undefined

// Tree only down to the IFC classes: the rows of the single elements are removed
// (the class row keeps the ids in "children", so clicking it still selects all its items)
const pruneToClasses = (groups: BUI.TableGroupData<any>[]): BUI.TableGroupData<any>[] => groups.map((group) => {
  if (isClassRow(group.data) && !spatialClasses.has(String(group.data.Name))) return { data: group.data }
  return group.children ? { data: group.data, children: pruneToClasses(group.children) } : group
})

// IFC spatial structure of the loaded models (project > site > building > storey > IFC classes).
// The IFC class rows of the elements selected in the 3D are marked and scrolled into view.
export function IfcStructure({ components }: { components: OBC.Components | null }) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!components || !container) return
    const fragments = components.get(OBC.FragmentsManager)
    const highlighter = components.get(OBF.Highlighter)
    const [tree, updateTree] = CUI.tables.spatialTree({ components, models: fragments.list.values() }, false) // updated by onModelsChange
    // Open: down to the classes the tree is small, and closed groups have no rows to mark
    // (the rows are created when a group opens)
    tree.expanded = true
    container.append(tree)

    const markSelection = (selection: OBC.ModelIdMap) => {
      const rows = deepQuery(tree.shadowRoot ?? tree, "bim-table-row") as BUI.TableRow<any>[]
      let first: Element | null = null
      for (const row of rows) {
        const { modelId, children, localId } = row.data ?? {}
        const ids = selection[modelId]
        // IFC class rows have the list of their items in "children"; element rows have a localId
        const marked = !!ids && isClassRow({ children, localId }) && !spatialClasses.has(String(row.data?.Name))
          && JSON.parse(children).some((id: number) => ids.has(id))
        row.style.backgroundColor = marked ? "var(--bim-ui_main-base, #6528d7)" : ""
        row.style.color = marked ? "white" : ""
        if (marked) {
          revealRow(row)
          first ??= row
        }
      }
      // scrollIntoView doesn't reach through the table's shadow DOM: the container is scrolled by hand
      if (first) {
        const firstRow = first as Element
        requestAnimationFrame(() => {
          const rowBox = firstRow.getBoundingClientRect()
          const box = container.getBoundingClientRect()
          if (rowBox.top < box.top || rowBox.bottom > box.bottom) {
            container.scrollTop += rowBox.top - box.top - box.height / 3
          }
        })
      }
    }

    const onHighlight = (selection: OBC.ModelIdMap) => setTimeout(() => markSelection(selection), 50)
    const onClear = () => markSelection({})
    // The tree data is loaded asynchronously: wait for it, cut it at the classes, then mark the selection
    const refresh = async () => {
      for (let i = 0; i < 50 && tree.data.length === 0; i++) await new Promise((resolve) => setTimeout(resolve, 100))
      if (tree.data.length === 0) return
      tree.data = pruneToClasses(tree.data)
      setTimeout(() => markSelection(highlighter.selection.select), 300)
    }
    const onModelsChange = () => {
      updateTree({ components, models: fragments.list.values() })
      setTimeout(refresh, 300)
    }
    highlighter.events.select.onHighlight.add(onHighlight)
    highlighter.events.select.onClear.add(onClear)
    fragments.list.onItemSet.add(onModelsChange)
    refresh()

    return () => {
      tree.remove()
      try {
        highlighter.events.select.onHighlight.remove(onHighlight)
        highlighter.events.select.onClear.remove(onClear)
        fragments.list.onItemSet.remove(onModelsChange)
      } catch {
        // the engine may be disposed already: its events go with it
      }
    }
  }, [components])

  return (
    <div className="dashboard-card ifc-structure">
      <div className="dashboard-card-header"><h4>IFC structure</h4></div>
      {!components && <p style={{ padding: "0 20px", color: "var(--text-muted)" }}>Loading the viewer...</p>}
      <div ref={containerRef} className="ifc-structure-tree"></div>
    </div>
  )
}
