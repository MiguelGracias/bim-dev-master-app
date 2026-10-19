export const appIcons = {
  STATUS: "fluent:status-12-filled",
  USER: "solar:user-bold",
  MONEY: "solar:tag-price-bold",
  PROGRESS: "ri:progress-3-fill",
  ADD: "material-symbols:add-rounded",
  DOWNLOAD: "material-symbols:download",
  UPLOAD: "material-symbols:upload",
  PROJECT: "material-symbols:house-rounded",
  SELECT: "solar:cursor-bold",
  COLORIZE: "famicons:color-fill",
  APPLY: "ri:magic-fill",
  CLEAR: "mingcute:broom-fill",
  SHOW: "mdi:eye",
  HIDE: "mdi:eye-off",
  ISOLATE: "mdi:selection-ellipse",
  TRANSPARENT: "mdi:ghost",
  REFRESH: "radix-icons:update",
  FOCUS: "ri:focus-mode",
  CONTEXT: "ix:context-menu",
  SAVE: "material-symbols:save",
  SELECT_SAME: "mdi:select-group",
  STOREY: "mdi:layers-outline",
  DELETE: "mdi:trash-can-outline",
}

// Button names shown on hover. On touch screens (iPhone) a tooltip turns the first tap into a
// "hover" that only shows the name, so there they are left out
export const hasHover = window.matchMedia("(hover: hover)").matches
export const tip = (text: string) => hasHover ? text : ""
