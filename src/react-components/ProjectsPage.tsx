import * as React from "react";
import * as Router from "react-router-dom";
import * as Firestore from "firebase/firestore";
import { IProject, IToDo, Project } from "../classes/Project";
import { ProjectCard } from "./ProjectCard";
import { SearchBox } from "./SearchBox";
import { ProjectsManager } from "../classes/ProjectsManager";
import { fromFirestore, getCollection, getToDos, replaceToDos, saveProject } from "../firebase";
import { ProjectForm } from "./ProjectForm";
import { appIcons } from "../globals";
import { Sidebar } from "./Sidebar";

interface Props {
  projectsManager: ProjectsManager
}

const projectsCollection = getCollection<IProject>("projects")

export function ProjectsPage(props: Props) {

  const [projects, setProjects] = React.useState<Project[]>(props.projectsManager.list)
  props.projectsManager.OnProjectCreated = () => {setProjects([...props.projectsManager.list])}

  const getFirestoreProjects = async () => {
    const firebaseProjects = await Firestore.getDocs(projectsCollection)
    for (const doc of firebaseProjects.docs) {
      try {
        props.projectsManager.newProject(fromFirestore(doc.data()), doc.id)
      } catch (error) {
        
      }
    }
  }

  // Imported projects are saved in Firestore too (new or updated)
  props.projectsManager.OnProjectImported = async (project) => {
    setProjects([...props.projectsManager.list])
    await saveProject(project)
    await replaceToDos(project.id, project.todos)
  }

  // The download includes the ToDos, read from their collection (old projects still have them inside)
  const onDownload = async (project: Project) => {
    const stored = await getToDos<IToDo>(project.id)
    if (stored.length > 0) project.todos = stored
    props.projectsManager.exportToJSON(`${project.name}.json`, [project])
  }

  React.useEffect(() => {
    getFirestoreProjects()
  }, [])

  const projectCards = projects.map((project) => {
    return (
      <Router.Link to={`/project/${project.id}`} key={project.id} >
        <ProjectCard project={project} onDownload={() => onDownload(project)} />
      </Router.Link>
    )
  })

  React.useEffect(() => {
    console.log("Projects state updated", projects)
  }, [projects])

  const onNewProjectClick = () => {
    const modal = document.getElementById("new-project-modal")
    if (!(modal && modal instanceof HTMLDialogElement)) {return}
    modal.showModal()
  }

  const onImportProject = () => {
    props.projectsManager.importFromJSON()
  }

  const onProjectSearch = (value: string) => {
    setProjects(props.projectsManager.filterProjects(value))
  }

  return (
    <div className="page" id="projects-page" style={{ display: "flex" }}>
      <ProjectForm id="new-project-modal" projectsManager={props.projectsManager} />
      <header>
        <Sidebar />
        <bim-label className="title-long" style={{fontSize: "1.3rem", color: "var(--text)"}}>Projects List</bim-label>
        <bim-label className="title-short" style={{fontSize: "1.3rem", color: "var(--text)"}}>Projects</bim-label>
        <SearchBox onChange={(value) => onProjectSearch(value)}/>
        {/* Phones: Upload as a small icon and New Project as the floating "+" button */}
        <bim-button className="phone-only" onclick={onImportProject} icon={appIcons.UPLOAD} title="Upload"></bim-button>
        <div className="desktop-only" style={{ display: "flex", alignItems: "center", columnGap: 15 }}>
          <bim-button onclick={onImportProject} icon={appIcons.UPLOAD} label="Upload"></bim-button>
          <bim-button onclick={onNewProjectClick} icon={appIcons.ADD} label="New Project"></bim-button>
        </div>
      </header>
      <button className="fab phone-only" aria-label="New Project" onClick={onNewProjectClick}>
        <span className="material-icons-round">add</span>
      </button>
      {
        projects.length > 0 ? <div id="projects-list">{ projectCards }</div> : <p>There is no projects to display!</p>
      }
    </div>
  )
}