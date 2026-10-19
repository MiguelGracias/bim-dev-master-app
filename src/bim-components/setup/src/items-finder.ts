import * as OBC from "@thatopen/components"
import * as FRAGS from "@thatopen/fragments"

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const exactly = (text: string) => new RegExp(`^${escapeRegExp(text.trim())}$`, "i")

// IFC values can be text, numbers or booleans: the query value must have the same type
const toQueryValue = (value: string): RegExp | number | boolean => {
  const text = value.trim()
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === "true"
  if (text !== "" && !isNaN(Number(text))) return Number(text)
  return exactly(text)
}

// Items that have, in the property set `pset`, a property `property` with the value `value`
// (item -> IsDefinedBy -> IfcPropertySet with that name -> HasProperties -> property with that name and value)
export const propertyQuery = (pset: string, property: string, value: string): FRAGS.ItemsQueryParams[] => [
  {
    relation: {
      name: "IsDefinedBy",
      query: {
        attributes: { queries: [{ name: /^Name$/, value: exactly(pset) }] },
        relation: {
          name: "HasProperties",
          query: {
            attributes: {
              queries: [
                { name: /^Name$/, value: exactly(property) },
                { name: /^NominalValue$/, value: toQueryValue(value) },
              ]
            }
          }
        }
      }
    }
  }
]

// Items placed in the IFC building storey with this name (item -> ContainedInStructure -> IfcBuildingStorey)
export const storeyQuery = (storey: string): FRAGS.ItemsQueryParams[] => [
  {
    relation: {
      name: "ContainedInStructure",
      query: {
        categories: [/^IFCBUILDINGSTOREY$/],
        attributes: { queries: [{ name: /^Name$/, value: exactly(storey) }] },
      }
    }
  }
]

// Names of the building storeys of every loaded model
export const getStoreyNames = async (components: OBC.Components) => {
  const names = new Set<string>()
  for (const [, model] of components.get(OBC.FragmentsManager).list) {
    const ids = Object.values(await model.getItemsOfCategories([/^IFCBUILDINGSTOREY$/])).flat()
    for (const data of await model.getItemsData(ids)) {
      const name = data.Name
      if (name && "value" in name && name.value) names.add(String(name.value))
    }
  }
  return [...names]
}

// Queries defined here are fixed (they can't be deleted or replaced); the ones made in the app are
// stored with the project and can be deleted
export const predefinedQueries = new Set<string>()

// Queries made in the app, as plain JSON (to store them with the project)
// (the JSON round trip drops undefined values, which Firestore rejects)
export const exportCustomQueries = (components: OBC.Components): Record<string, any>[] =>
  JSON.parse(JSON.stringify(components.get(OBC.ItemsFinder).export().data.filter((query) => !predefinedQueries.has(query.name))))

// Adds queries from JSON, skipping any with the name of a predefined one
export const importCustomQueries = (components: OBC.Components, queries: Record<string, any>[]) =>
  components.get(OBC.ItemsFinder).import({ data: queries.filter((query) => query?.name && !predefinedQueries.has(query.name)) as any })

export const setupItemsFinder = (components: OBC.Components) => {
  const finder = components.get(OBC.ItemsFinder);
  finder.create("Walls", [{ categories: [/WALL/] }])
  finder.create("Doors & Windows", [{ categories: [/DOOR/, /WINDOW/] }])
  // Used by the example smart views
  finder.create("Slabs", [{ categories: [/^IFCSLAB$/] }])
  finder.create("Beams & Members", [{ categories: [/^IFCBEAM$/, /^IFCMEMBER$/] }])
  finder.create("Spaces", [{ categories: [/^IFCSPACE$/] }])
  finder.create("Doors", [{ categories: [/^IFCDOOR$/] }])
  finder.create("Windows", [{ categories: [/^IFCWINDOW$/] }])
  // Duplex example model (IFC2x3 from Revit)
  finder.create("Internal Walls", [{ categories: [/WALL/], ...propertyQuery("Pset_WallCommon", "IsExternal", "false")[0] }])
  finder.create("Roof", [{ categories: [/^IFCSLAB$/], relation: { name: "Decomposes", query: { categories: [/^IFCROOF$/] } } }])
  // Skylights: the IFC relation window -> opening -> roof is not kept in the fragments, so they are
  // found by name (Revit, Archicad and other tools in several languages) or by the IFC4 type
  const skylightNames = /skylight|roof ?window|clarab[oó]ia|janela de telhado|dachfenster|dachfl[aä]chenfenster|velux|lucernario|lucarne/i
  finder.create("Skylights", [{ categories: [/^IFCWINDOW$/], attributes: { queries: [{ name: /^Name$/, value: skylightNames }] } }])
  finder.create("Skylights (IFC4 type)", [{ categories: [/^IFCWINDOW$/], attributes: { queries: [{ name: /^PredefinedType$/, value: /^SKYLIGHT$/i }] } }])
  finder.create("Drywall T7", [
    {
      attributes: {
        queries: [
          { name: /Name/, value: /Muro liviano T7/ }
        ]
      }
    }
  ])

  finder.create("External Walls", [
    {
      categories: [/WALL/],
      relation: {
        name: "IsDefinedBy",
        query: {
          relation: {
            name: "HasProperties",
            query: {
              attributes: {
                queries: [
                  { name: /Name/, value: /IsExternal/ },
                  { name: /NominalValue/, value: true },
                ]
              }
            }
          }
        }
      }
    }
  ])

  for (const name of finder.list.keys()) predefinedQueries.add(name)
}
