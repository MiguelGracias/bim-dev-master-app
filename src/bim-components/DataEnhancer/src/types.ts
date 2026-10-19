import * as FRAGS from "@thatopen/fragments"

export interface DataEnhancerSource {
  data: () => Promise<any[]>;
  matcher: (attrs: FRAGS.ItemData, data: any[]) => any[] | null
}