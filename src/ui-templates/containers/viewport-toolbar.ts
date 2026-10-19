import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { setGhostEdges } from "../../bim-components/setup/src/ghost-edges";
import { appIcons, tip } from "../../globals";
import * as THREE from "three"
import * as FRAGS from "@thatopen/fragments"

const originalMaterialsData = new Map<
  FRAGS.BIMMaterial,
  { color: number; transparent: boolean; opacity: number; lodOpacity?: number }
>();

// Predefined colors for a quick colorize (status, warning, approval...)
export const colorPalette = [
  { name: "Red", color: "#e53935" },
  { name: "Orange", color: "#fb8c00" },
  { name: "Yellow", color: "#fdd835" },
  { name: "Green", color: "#43a047" },
  { name: "Blue", color: "#1e88e5" },
  { name: "Purple", color: "#8e24aa" },
  { name: "Grey", color: "#9e9e9e" },
  { name: "Brown", color: "#795548" },
]

export interface ViewerToolbarState {
  components: OBC.Components;
  world: OBC.World
}

export const viewerToolbarTemplate: BUI.StatefullComponent<
  ViewerToolbarState
> = (state) => {
  const { components, world } = state;

  let colorInput: BUI.ColorInput | undefined;

  const onInputCreated = (e?: Element) => {
    if (!e) return;
    colorInput = e as BUI.ColorInput;
  };

  const onApplyColor = async ({ target: button }: { target: BUI.Button }) => {
    if (!colorInput) return;
    await colorizeSelection(colorInput.color, button)
  };

  const colorizeSelection = async (color: string, button?: BUI.Button) => {
    const highlighter = components.get(OBF.Highlighter)
    const selection = highlighter.selection.select; // this is a ModelIdMap, the engine data type to represent item selections
    if (OBC.ModelIdMapUtils.isEmpty(selection)) return;
    if (button) button.loading = true
    if (!highlighter.styles.has(color)) {
      highlighter.styles.set(color, {
        color: new THREE.Color(color),
        renderedFaces: 1,
        opacity: 1,
        transparent: false,
      });
    }

    await Promise.all([highlighter.highlightByID(
      color,
      selection,
      false, // indicates that previous items colorized with the same style will keep the color
      false // indicates the camera to not zoom on the colorized items
    ),
      highlighter.clear("select")])
    
    if (button) button.loading = false
    BUI.ContextMenu.removeMenus()
  };

  const onReset = async ({ target }: { target: BUI.Button }) => {
    target.loading = true;
    const highlighter = components.get(OBF.Highlighter)
    await highlighter.clear()
    BUI.ContextMenu.removeMenus()
    target.loading = false;
  };
  
  const onHide = async ({ target }: { target: BUI.Button }) => {
    const highlighter = components.get(OBF.Highlighter);
    const selection = highlighter.selection.select;
    if (OBC.ModelIdMapUtils.isEmpty(selection)) return;
    target.loading = true;
    const hider = components.get(OBC.Hider);
    const promises = [hider.set(false, selection), highlighter.clear("select")];
    await Promise.all(promises);
    target.loading = false;
  }

  const onIsolate = async ({ target }: { target: BUI.Button }) => {
    const highlighter = components.get(OBF.Highlighter);
    const selection = highlighter.selection.select;
    if (OBC.ModelIdMapUtils.isEmpty(selection)) return;
    target.loading = true;
    const hider = components.get(OBC.Hider);
    await hider.isolate(selection);
    target.loading = false;
  };

  const onShowAll = async ({ target }: { target: BUI.Button }) => {
    target.loading = true;
    const hider = components.get(OBC.Hider);
    await hider.set(true);
    target.loading = false;
  };

  const setModelTransparency = (opacity: number) => {
    const fragments = components.get(OBC.FragmentsManager);
    const materials = [...fragments.core.models.materials.list.values()];

    for (const material of materials) {
      if (material.userData.customId) continue;
      let color: number | undefined;
      let lodOpacity: number | undefined
      if ("color" in material) {
        color = material.color.getHex();
      } else {
        color = material.lodColor.getHex();
        lodOpacity = material.uniforms.lodOpacity.value
      }

      originalMaterialsData.set(material, {
        color,
        transparent: material.transparent,
        opacity: material.opacity,
        lodOpacity
      });

      material.transparent = true;
      if ("color" in material) {
        material.opacity = opacity;
        material.color.setColorName("white");
      } else {
        material.uniforms.lodColor.value.setColorName("white")
        material.uniforms.lodOpacity.value = opacity
      }
      material.needsUpdate = true;
    }
  }

  const restoreTransparency = () => {
    for (const [material, data] of originalMaterialsData) {
      const { color, transparent, opacity, lodOpacity } = data;

      material.transparent = transparent;
      if ("color" in material) {
        material.opacity = opacity;
        material.color.setHex(color);
      } else {
        material.uniforms.lodColor.value.setHex(color)
        material.uniforms.lodOpacity.value = lodOpacity
      }
      material.needsUpdate = true;
    }

    originalMaterialsData.clear();
  }

  const onToggleGhost = async ({ target: button }: { target: BUI.Button }) => {
    if (originalMaterialsData.size > 0) {
      restoreTransparency();
      await setGhostEdges(components, false);
    }  else {
      setModelTransparency(0.05);
      button.loading = true;
      await setGhostEdges(components, true); // thin lines so the building can still be read
      button.loading = false;
    }
  }

  // Selects every item (in all models) with the same IFC category as the selected ones, e.g. all windows
  const onSelectSameType = async ({ target: button }: { target: BUI.Button }) => {
    const highlighter = components.get(OBF.Highlighter);
    const selection = highlighter.selection.select;
    if (OBC.ModelIdMapUtils.isEmpty(selection)) return;
    button.loading = true;
    const fragments = components.get(OBC.FragmentsManager);
    const categories = new Set<string>();
    for (const [modelId, ids] of Object.entries(selection)) {
      const model = fragments.list.get(modelId);
      if (!model) continue;
      for (const data of await model.getItemsData([...ids])) {
        const category = data._category;
        if (category && "value" in category) categories.add(String(category.value));
      }
    }
    const regexes = [...categories].map((category) => new RegExp(`^${category}$`));
    const items: OBC.ModelIdMap = {};
    if (regexes.length > 0) {
      for (const [modelId, model] of fragments.list) {
        const byCategory = await model.getItemsOfCategories(regexes);
        const ids = Object.values(byCategory).flat();
        if (ids.length > 0) items[modelId] = new Set(ids);
      }
    }
    await highlighter.highlightByID("select", items, true, false);
    button.loading = false;
  };

  const onFocus = async ({ target }: { target: BUI.Button }) => {
    if (!(world.camera instanceof OBC.SimpleCamera)) return;
    const highlighter = components.get(OBF.Highlighter)
    const selection = highlighter.selection.select;
    target.loading = true;
    await world.camera.fitToItems(
      OBC.ModelIdMapUtils.isEmpty(selection) ? undefined : selection,
    );
    target.loading = false;
  };

  return BUI.html`
    <bim-toolbar class="tool-bar">
      <bim-toolbar-section>
        <bim-button class="tool-button" icon=${appIcons.SHOW} tooltip-title=${tip("Show All")} @click=${onShowAll}></bim-button> 
        <bim-button class="tool-button" icon=${appIcons.TRANSPARENT} tooltip-title=${tip("Toggle Ghost")} @click=${onToggleGhost}></bim-button>
      </bim-toolbar-section>
      <bim-toolbar-section>
        <bim-button class="tool-button" icon=${appIcons.SELECT_SAME} tooltip-title=${tip("Select all of the same type")} @click=${onSelectSameType}></bim-button>
        <bim-button class="tool-button" icon=${appIcons.FOCUS} tooltip-title=${tip("Focus")} @click=${onFocus}></bim-button>
        <bim-button class="tool-button" icon=${appIcons.HIDE} tooltip-title=${tip("Hide")} @click=${onHide}></bim-button> 
        <bim-button class="tool-button" icon=${appIcons.ISOLATE} tooltip-title=${tip("Isolate")} @click=${onIsolate}></bim-button>
        <bim-button class="tool-button" icon=${appIcons.COLORIZE} tooltip-title=${tip("Colorize")}>
          <bim-context-menu>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <div class="color-palette">
                ${colorPalette.map(({ name, color }) => BUI.html`
                  <button class="color-swatch" title=${name} aria-label=${name} style="background-color: ${color}"
                    @click=${() => colorizeSelection(color)}></button>
                `)}
              </div>
              <bim-color-input ${BUI.ref(onInputCreated)}></bim-color-input> <!-- custom color input from That Open Engine -->
              <div style="display: flex; gap: 0.5rem">
                <bim-button @click=${onApplyColor} icon=${appIcons.APPLY} label="Apply"></bim-button>
                <bim-button icon=${appIcons.CLEAR} label="Reset" @click=${onReset}></bim-buttom>
              </div>
            </div>
          </bim-context-menu>
        </bim-button>
      </bim-toolbar-section>
    </bim-toolbar>
  `;
};