import * as React from "react"
import * as ReactDOM from "react-dom/client"
import * as Router from "react-router-dom"
import { ProjectsPage } from "./react-components/ProjectsPage"
import { ProjectDetailsPage } from "./react-components/ProjectDetailsPage"
import { UsersPage } from "./react-components/UsersPage"
import { ProjectsManager } from "./classes/ProjectsManager"
import * as BUI from "@thatopen/ui"

BUI.Manager.init()

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "bim-label": any;
      "bim-button": any;
      "bim-text-input": any;
      "bim-grid": any;
    }
  }
}

const projectsManager = new ProjectsManager()

const rootElement = document.getElementById("app") as HTMLDivElement
const appRoot = ReactDOM.createRoot(rootElement)
appRoot.render(
  <>
    <Router.BrowserRouter>
      <Router.Routes>
        <Router.Route path="/" element={<ProjectsPage projectsManager={projectsManager} />}></Router.Route>
        <Router.Route path="/users" element={<UsersPage />}></Router.Route>
        <Router.Route path="/project/:id" element={<ProjectDetailsPage projectsManager={projectsManager} />}></Router.Route>
      </Router.Routes>
    </Router.BrowserRouter>
  </>
)
