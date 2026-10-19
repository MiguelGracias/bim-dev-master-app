import * as React from "react";
import * as Router from "react-router-dom";

// Menu button that opens a sliding sidebar from the left. The list pages put it at the start of their
// header; the project page puts it over the viewer, with the project card inside (children) and the
// IFC structure of the models (structure), shown with the "Project" button.
export function Sidebar(props: { children?: React.ReactNode, structure?: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [showStructure, setShowStructure] = React.useState(false)
  const location = Router.useLocation()
  React.useEffect(() => setOpen(false), [location.pathname])
  return (
    <>
      <button className="drawer-toggle" title={open ? "Close" : "Menu"} onClick={() => setOpen(!open)}>
        <span className="material-icons-round">{open ? "close" : "menu"}</span>
      </button>
      <aside className={`project-drawer${open ? " open" : ""}`}>
        <nav className="drawer-nav">
          <Router.Link to="/"><span className="material-icons-round">home</span>Projects</Router.Link>
          <Router.Link to="/users"><span className="material-icons-round">group</span>Users</Router.Link>
          {props.structure && (
            <button className={`drawer-nav-button${showStructure ? " active" : ""}`} aria-pressed={showStructure}
              onClick={() => setShowStructure(!showStructure)}>
              <span className="material-icons-round">account_tree</span>Project
            </button>
          )}
        </nav>
        {/* Both stay mounted (the tree keeps its state); only one is shown */}
        <div style={{ display: showStructure ? "none" : "contents" }}>{props.children}</div>
        {props.structure && <div style={{ display: showStructure ? "contents" : "none" }}>{props.structure(() => setOpen(false))}</div>}
        <p className="drawer-credits">BIM Dev Master · by Miguel Gracias</p>
      </aside>
    </>
  )
}
