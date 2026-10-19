import * as OBC from "@thatopen/components"
import * as BUI from "@thatopen/ui"
import * as TEMPLATES from "../../../ui-templates"

export const createWorld = (components: OBC.Components) => {
  const worlds = components.get(OBC.Worlds);
  const world = worlds.create<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBC.SimpleRenderer
  >()

  world.scene = new OBC.SimpleScene(components);
  world.scene.setup();
  world.scene.three.background = null; // just to have transparent background

  const viewport = BUI.Component.create<BUI.Viewport>(
    () => {
      const [viewportGrid] = BUI.Component.create(TEMPLATES.viewportGridTemplate, {
        components,
        world
      });
      return BUI.html`<bim-viewport>${viewportGrid}</bim-viewport>`
    },
  );
  world.renderer = new OBC.SimpleRenderer(components, viewport);

  world.camera = new OBC.OrthoPerspectiveCamera(components);

  const resizeWorld = () => {
    try {
      world.renderer?.resize();
      world.camera.updateAspect();
    } catch (error) {
      console.warn("Resizing the world was not possible")
    }
  };
  
  viewport.addEventListener("resize", resizeWorld);

  components.get(OBC.Raycasters).get(world);

  components.get(OBC.Grids).create(world);

  return { world, viewport }
}