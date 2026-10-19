import * as THREE from "three"
import * as OBC from "@thatopen/components"

// Thin lines on the edges of every element, shown with the ghost mode so the
// (almost invisible) building can still be read. Computed once per model.
// Keyed by the model object: a model loaded again (or in another project) gets its own lines
const edgesByModel = new WeakMap<THREE.Object3D, THREE.Group>()
const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x404040, transparent: true, opacity: 0.6 })
// Edges between faces that meet at less than this angle (in degrees) are not drawn
const EDGE_ANGLE = 20

const createModelEdges = async (model: { object: THREE.Object3D, getItemsIdsWithGeometry: () => Promise<number[]>, getItemsGeometry: (ids: number[]) => Promise<any[][]> }) => {
  const group = new THREE.Group()
  const ids = await model.getItemsIdsWithGeometry()
  const items = await model.getItemsGeometry(ids)
  for (const meshes of items) {
    for (const { positions, indices, transform } of meshes) {
      if (!positions) continue
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3))
      if (indices) geometry.setIndex(new THREE.BufferAttribute(indices, 1))
      const edges = new THREE.EdgesGeometry(geometry, EDGE_ANGLE)
      geometry.dispose()
      const lines = new THREE.LineSegments(edges, edgesMaterial)
      lines.applyMatrix4(transform)
      lines.raycast = () => {} // the lines must not be picked when selecting
      group.add(lines)
    }
  }
  return group
}

export const setGhostEdges = async (components: OBC.Components, visible: boolean) => {
  const fragments = components.get(OBC.FragmentsManager)
  for (const [, model] of fragments.list) {
    let group = edgesByModel.get(model.object)
    if (!group && visible) {
      group = await createModelEdges(model as any)
      edgesByModel.set(model.object, group)
      // Child of the model: it follows the model's position
      model.object.add(group)
    }
    if (group) group.visible = visible
  }
}
