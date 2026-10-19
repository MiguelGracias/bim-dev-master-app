import * as OBC from "@thatopen/components"
// Vite copies the worker into the build and gives its URL (node_modules isn't published)
import workerUrl from "@thatopen/fragments/dist/Worker/worker.mjs?url"

export const setupFragmentsManager = (components: OBC.Components, world: OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer>) => {
  const fragments = components.get(OBC.FragmentsManager);
  fragments.init(workerUrl);

  fragments.list.onItemSet.add(async ({ value: model }) => {
    // Clears the ItemsFinder cache, so the next time a query
    // is run, it does the search again to include the results from the 
    // new model
    const finder = components.get(OBC.ItemsFinder)
    for (const [, query] of finder.list) {
      query.clearCache()
    }
    
    // useCamera is used to tell the model loaded the camera it must use in order to 
    // update its culling and LOD state.
    // Culling is the process of not rendering what the camera doesn't see.
    // LOD stands from Level of Detail in 3D graphics (not BIM) and is used
    // to decrease the geometry detail as the camera goes further from the element.
    model.useCamera(world.camera.three);

    // The model is added to the world scene.
    world.scene.three.add(model.object);

    // This is extremely important, as it instructs the Fragments Manager
    // the model must be updated because the configuration changed.
    await fragments.core.update(true);
  })

  world.camera.controls.addEventListener("rest", async () => {
    await fragments.core.update(true);
  });
}