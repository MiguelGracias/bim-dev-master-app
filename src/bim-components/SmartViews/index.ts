import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { DataMap } from "@thatopen/fragments";
import { SerializedItems, SerializedSmartView, SmartView } from "./src";

const itemsToJSON = (map: OBC.ModelIdMap): SerializedItems[] =>
  Object.entries(map).map(([modelId, ids]) => ({ modelId, localIds: [...ids] }))

const itemsFromJSON = (list: SerializedItems[]): OBC.ModelIdMap =>
  Object.fromEntries(list.map(({ modelId, localIds }) => [modelId, new Set(localIds)]))

export class SmartViews extends OBC.Component {
  static uuid = "0d8413c5-7563-4de5-a213-5ac949eacbb1" as const;
  readonly list = new DataMap<string, SmartView>();
  /** Triggered after a view has been applied to the viewer */
  readonly onApplied = new OBC.Event<SmartView>();
  enabled = true;

  currentState: SmartView = {
    name: "SmartView",
    defaultVisibility: true,
    visibilityExceptions: {},
    colors: {},
  };

  addQueryColor(color: string, query: string) {
    let queriesColors = this.currentState.colors.queries;
    if (!queriesColors) {
      queriesColors = {};
      this.currentState.colors.queries = queriesColors;
    }

    let queriesList = queriesColors[color];
    if (!queriesList) {
      queriesList = new Set();
      queriesColors[color] = queriesList;
    }

    queriesList.add(query);
  }

  /** Records that a query was shown or hidden, so updating a view keeps it */
  setQueryVisibility(query: string, visible: boolean) {
    let exceptions = this.currentState.visibilityExceptions.queries
    if (!exceptions) {
      exceptions = new Set()
      this.currentState.visibilityExceptions.queries = exceptions
    }
    // An exception is a query whose visibility is the opposite of the default one
    if (visible !== this.currentState.defaultVisibility) exceptions.add(query)
    else exceptions.delete(query)
  }

  clone(view = this.currentState) {
    const clone: SmartView = {
      name: view.name,
      defaultVisibility: view.defaultVisibility,
      visibilityExceptions: {},
      colors: {},
    };

    if (view.colors.items) {
      clone.colors.items = {}
      for (const [style, map] of Object.entries(view.colors.items)) {
        clone.colors.items[style] = OBC.ModelIdMapUtils.clone(map);
      }
    }

    if (view.colors.queries) {
      clone.colors.queries = {};
      for (const [style, names] of Object.entries(view.colors.queries)) {
        const set = new Set<string>();
        for (const name of names) {
          set.add(name)
        };
        clone.colors.queries[style] = set;
      }
    }

    if (view.visibilityExceptions.queries) {
      const queries = new Set<string>();
      for (const name of view.visibilityExceptions.queries) {
        queries.add(name);
      }
      clone.visibilityExceptions.queries = queries;
    }

    if (view.visibilityExceptions.items) {
      clone.visibilityExceptions.items = OBC.ModelIdMapUtils.clone(
        view.visibilityExceptions.items,
      );
    }

    return clone;
  }

  /** Replaces a saved view with the current state (applied view + later changes), keeping its name */
  update(id: string) {
    const view = this.list.get(id)
    if (!view) return
    const updated = this.clone()
    updated.name = view.name
    this.list.set(id, updated)
    return updated
  }

  /** Exports the definition of the views (no images), so they can be recreated later */
  export(ids: string[] = [...this.list.keys()]): SerializedSmartView[] {
    const result: SerializedSmartView[] = []
    for (const id of ids) {
      const view = this.list.get(id)
      if (!view) continue
      const { colors, visibilityExceptions } = view
      const serialized: SerializedSmartView = {
        id,
        name: view.name,
        defaultVisibility: view.defaultVisibility,
        visibilityExceptions: {},
        colors: {},
      }
      if (visibilityExceptions.queries) serialized.visibilityExceptions.queries = [...visibilityExceptions.queries]
      if (visibilityExceptions.items) serialized.visibilityExceptions.items = itemsToJSON(visibilityExceptions.items)
      if (colors.queries) {
        serialized.colors.queries = Object.entries(colors.queries).map(([color, names]) => ({ color, queries: [...names] }))
      }
      if (colors.items) {
        serialized.colors.items = Object.entries(colors.items).map(([color, map]) => ({ color, items: itemsToJSON(map) }))
      }
      result.push(serialized)
    }
    return result
  }

  /** Recreates exported views as if they were made in this session (same id = the view is replaced) */
  import(views: SerializedSmartView[]) {
    const imported: string[] = []
    for (const data of views) {
      if (!data || typeof data.name !== "string") continue
      const view: SmartView = {
        name: data.name,
        defaultVisibility: data.defaultVisibility ?? true,
        visibilityExceptions: {},
        colors: {},
      }
      const { visibilityExceptions = {}, colors = {} } = data
      if (visibilityExceptions.queries) view.visibilityExceptions.queries = new Set(visibilityExceptions.queries)
      if (visibilityExceptions.items) view.visibilityExceptions.items = itemsFromJSON(visibilityExceptions.items)
      if (colors.queries) {
        view.colors.queries = Object.fromEntries(colors.queries.map(({ color, queries }) => [color, new Set(queries)]))
      }
      if (colors.items) {
        view.colors.items = Object.fromEntries(colors.items.map(({ color, items }) => [color, itemsFromJSON(items)]))
      }
      const id = data.id ?? OBC.UUID.create()
      this.list.set(id, view)
      imported.push(id)
    }
    return imported
  }

  saveCurrentState(name: string) {
    const smartView = this.clone();
    smartView.name = name
    const id = OBC.UUID.create()
    this.list.set(id, smartView)
    return { id, smartView }
  }

  async reset() {
    const highlighter = this.components.get(OBF.Highlighter);
    const hider = this.components.get(OBC.Hider);
    const promises = [highlighter.clear(), hider.set(true)];
    await Promise.all(promises);

    this.currentState = {
      name: "SmartView",
      defaultVisibility: true,
      visibilityExceptions: {},
      colors: {},
    };
  }

  async apply(view: SmartView) {
    if (!this.enabled) return;
    const { defaultVisibility, visibilityExceptions, colors } = view;

    const highlighter = this.components.get(OBF.Highlighter);
    const hider = this.components.get(OBC.Hider);
    const finder = this.components.get(OBC.ItemsFinder);

    // The reset (clear colors, show everything) must finish before the new colors are applied:
    // running them together let the clear wipe the new colors on slower devices (phones)
    await this.reset();
    // Same for the visibility: first the default for every item, then the exceptions
    await hider.set(defaultVisibility);
    const promises: Promise<unknown>[] = [];

    if (visibilityExceptions.items) {
      promises.push(hider.set(!defaultVisibility, visibilityExceptions.items));
    }

    if (visibilityExceptions.queries) {
      const queryPromises = [];
      for (const name of visibilityExceptions.queries) {
        const finderQuery = finder.list.get(name);
        if (!finderQuery) continue;
        queryPromises.push(finderQuery.test());
      }
      const maps = await Promise.all(queryPromises);
      const map = OBC.ModelIdMapUtils.join(maps);
      promises.push(hider.set(!defaultVisibility, map));
    }

    const colorsMap = new Map<string, OBC.ModelIdMap>();
    const addStyleMap = (color: string, map: OBC.ModelIdMap) => {
      let colorMap = colorsMap.get(color);
      if (!colorMap) {
        colorMap = {};
        colorsMap.set(color, colorMap);
      }
      OBC.ModelIdMapUtils.add(colorMap, map);
    };

    if (colors.queries) {
      for (const [color, queryNames] of Object.entries(colors.queries)) {
        const queryPromises = []
        for (const name of queryNames) {
          const finderQuery = finder.list.get(name);
          if (!finderQuery) continue;
          queryPromises.push(finderQuery.test())
        }
        const maps = await Promise.all(queryPromises);
        const map = OBC.ModelIdMapUtils.join(maps);
        addStyleMap(color, map);
      }
    }

    if (colors.items) {
      for (const [style, map] of Object.entries(colors.items)) {
        addStyleMap(style, map);
      }
    }

    for (const [color, map] of colorsMap.entries()) {
      if (!highlighter.styles.has(color)) {
        highlighter.styles.set(color, {
          color: new THREE.Color(color),
          renderedFaces: 1,
          opacity: 1,
          transparent: false,
        });
      }
      promises.push(highlighter.highlightByID(color, map));
    }

    await Promise.all(promises);

    this.currentState = this.clone(view);
    this.onApplied.trigger(view);
  }
}

export * from "./src";