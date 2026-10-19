import * as OBC from "@thatopen/components"
import * as FRAGS from "@thatopen/fragments"
import { DataEnhancerSource } from "./src";

export class DataEnhancer extends OBC.Component {
  static uuid = "d9d41a68-2606-4c61-9e86-af6b675758ef" as const
  enabled = true;

  private _sourcesDataCache: Record<string, any[]> = {}

  readonly sources = new FRAGS.DataMap<string, DataEnhancerSource>()

  async getSourceData(source: string) {
    const sourceConfig = this.sources.get(source)
    if (!sourceConfig) {
      throw new Error(`DataEnhancer: Source "${source}" not found`)
    }

    let data = this._sourcesDataCache[source]
    if (!data) {
      data = await sourceConfig.data()
      this._sourcesDataCache[source] = data
    }

    return data
  }

  async getData(items: OBC.ModelIdMap) {
    const fragments = this.components.get(OBC.FragmentsManager)
    const result: OBC.ModelIdDataMap<Record<string, any[]>> = new FRAGS.DataMap()
    for (const [modelId, _localIds] of Object.entries(items)) {
      const model = fragments.list.get(modelId)
      if (!model) continue
      const localIds = [..._localIds]
      const itemsData = await model.getItemsData(localIds)
      for (const [source, config] of this.sources.entries()) {
        const sourceData = await this.getSourceData(source)
        for (const [index, attributes] of itemsData.entries()) {
          const itemExternalData = config.matcher(attributes, sourceData)
          if (!itemExternalData) continue

          let modelResult = result.get(modelId)
          if (!modelResult) {
            modelResult = new FRAGS.DataMap()
            result.set(modelId, modelResult)
          }

          const localId = localIds[index]
          let itemSources = modelResult.get(localId)
          if (!itemSources) {
            itemSources = {}
            modelResult.set(localId, itemSources)
          }

          itemSources[source] = itemExternalData
        }
      }
    }

    return result
  }

  /**
   * Finds all items, in every loaded model, that share the given source information.
   * For example, all items with the same technical documentation entry.
   * @param source - The name of the source (e.g. "Technical Documentation").
   * @param entry - One entry of that source's data.
   */
  async getItemsWithData(source: string, entry: Record<string, any>) {
    const sourceConfig = this.sources.get(source)
    if (!sourceConfig) {
      throw new Error(`DataEnhancer: Source "${source}" not found`)
    }
    const sourceData = await this.getSourceData(source)
    // Same information = every field of the entry has the same value
    const fields = Object.entries(entry).map(([key, value]) => [key, JSON.stringify(value)])
    const isSame = (data: Record<string, any>) => fields.every(([key, value]) => JSON.stringify(data[key]) === value)
    const fragments = this.components.get(OBC.FragmentsManager)
    const result: OBC.ModelIdMap = {}
    for (const [modelId, model] of fragments.list) {
      const localIds = await model.getItemsIdsWithGeometry()
      const itemsData = await model.getItemsData(localIds)
      for (const [index, attributes] of itemsData.entries()) {
        const itemData = sourceConfig.matcher(attributes, sourceData)
        if (!itemData?.some(isSame)) continue
        if (!result[modelId]) result[modelId] = new Set()
        result[modelId].add(localIds[index])
      }
    }
    return result
  }

  /**
   * Finds all items that share any of the source information of the given items.
   * For example, select one wall and get every item with the same documentation.
   */
  async getItemsSharingData(source: string, items: OBC.ModelIdMap) {
    const data = await this.getData(items)
    const result: OBC.ModelIdMap = {}
    const entries = new Map<string, Record<string, any>>()
    for (const [, modelData] of data) {
      for (const [, itemSources] of modelData) {
        for (const entry of itemSources[source] ?? []) entries.set(JSON.stringify(entry), entry)
      }
    }
    for (const entry of entries.values()) {
      OBC.ModelIdMapUtils.add(result, await this.getItemsWithData(source, entry))
    }
    return result
  }
}