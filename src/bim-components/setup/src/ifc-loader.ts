import * as OBC from "@thatopen/components"

export const setupIfcLoader = (components: OBC.Components) => {
  const ifcLoader = components.get(OBC.IfcLoader);
  ifcLoader.settings.autoSetWasm = false // it tells the component we are going to manually configure it
  ifcLoader.settings.wasm = { absolute: true, path: "https://unpkg.com/web-ifc@0.0.71/" } // it sets the path from which the base web-ifc code is going to be taken
}

// Example model served by the app: Duplex Apartment, BSI (2020) "Duplex Apartment Test Files,"
// buildingSMART International, CC BY 4.0 (see public/models/README.md)
export const EXAMPLE_MODEL_URL = "/models/Duplex_A_20110907.ifc"
export const EXAMPLE_MODEL_CREDIT = "Example model: Duplex Apartment, BSI (2020), buildingSMART International, CC BY 4.0"
export const EXAMPLE_MODEL_SOURCE = "https://github.com/buildingsmart-community/Community-Sample-Test-Files"

// Loads a model (.ifc or .frag) from a URL, e.g. the models stored with a project
export const loadModelFromUrl = async (components: OBC.Components, url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`The model ${url} could not be downloaded`)
  const buffer = await response.arrayBuffer()
  const name = url.split("/").pop()!.replace(/\.(ifc|frag)$/i, "")
  if (/\.frag$/i.test(url)) {
    await components.get(OBC.FragmentsManager).core.load(buffer, { modelId: name })
  } else {
    await components.get(OBC.IfcLoader).load(new Uint8Array(buffer), true, name)
  }
}
