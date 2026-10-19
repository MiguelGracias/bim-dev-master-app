import * as OBC from "@thatopen/components";

export interface ViewColors {
  queries?: Record<string, Set<string>>;
  items?: Record<string, OBC.ModelIdMap>;
}

export interface ViewExceptions {
  queries?: Set<string>;
  items?: OBC.ModelIdMap;
}

// Plain JSON version of a smart view (Sets and ModelIdMaps become lists),
// to download it as a file or to store it in Firestore with the project
export interface SerializedItems {
  modelId: string;
  localIds: number[];
}

export interface SerializedSmartView {
  id: string;
  name: string;
  defaultVisibility: boolean;
  visibilityExceptions: {
    queries?: string[];
    items?: SerializedItems[];
  };
  colors: {
    queries?: { color: string; queries: string[] }[];
    items?: { color: string; items: SerializedItems[] }[];
  };
}

export interface SmartView {
  name: string;
  colors: ViewColors;
  // Default item visibility behavior
  // If not set, everything will be visibile (see exceptions)
  defaultVisibility: boolean;
  // Items except from the visibility rule
  // If visibility is false, all items will be hidden unless those in exceptions
  // If visibility is true, all items will be visible unless those in exceptions
  visibilityExceptions: ViewExceptions;
}