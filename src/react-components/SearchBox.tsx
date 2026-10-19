import * as React from "react";

interface Props {
  onChange: (value: string) => void
  placeholder?: string
  width?: string
}

export function SearchBox(props: Props) {
  return (
    <div className="search-box" style={{ display: "flex", alignItems: "center", columnGap: 10, width: props.width }}>
      <bim-text-input
        debounce="200"
        oninput={(e) => {props.onChange(e.target.value)}}
        placeholder={props.placeholder ?? "Search projects by name..."}
      ></bim-text-input>
    </div>
  )
}