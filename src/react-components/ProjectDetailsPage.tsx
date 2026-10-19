import * as React from "react";
import * as Router from "react-router-dom";
import { createPortal } from "react-dom";
import { ProjectsManager } from "../classes/ProjectsManager";
import * as Firestore from "firebase/firestore";
import { deleteProjectData, deleteToDo, firestoreDB, fromFirestore, getToDos, replaceToDos, saveProject, saveToDo } from "../firebase";
import { IProject, IToDo, Project } from "../classes/Project";
import { ProjectForm } from "./ProjectForm";
import { ProjectTasksList } from "./ProjectTasksList";
import { Sidebar } from "./Sidebar";
import { StatusBadge } from "./ProjectCard";
import { IfcStructure } from "./IfcStructure";
import { BimPanels, PanelsView } from "./BimPanels";
import * as BUI from "@thatopen/ui"
import * as TEMPLATES from "../ui-templates"
import { setupComponents, SmartViews } from "../bim-components";
import { EXAMPLE_MODEL_CREDIT, EXAMPLE_MODEL_SOURCE, EXAMPLE_MODEL_URL, exportCustomQueries, importCustomQueries, loadModelFromUrl } from "../bim-components/setup/src";
import * as OBC from "@thatopen/components"
import * as OBF from "@thatopen/components-front"
import { ComponentsGrid } from "../ui-templates/grids/components/src";

interface Props {
  projectsManager: ProjectsManager
}

// Opening /project/:id directly (or reloading it) finds no projects in memory yet:
// the project is then read from Firestore before the workspace is drawn
export function ProjectDetailsPage(props: Props) {
  const { id } = Router.useParams<{id: string}>()
  const [project, setProject] = React.useState<Project | null | undefined>(() => id ? props.projectsManager.getProject(id) : null)

  React.useEffect(() => {
    if (!id || project) return
    Firestore.getDoc(Firestore.doc(firestoreDB, "projects", id)).then((doc) => {
      if (!doc.exists()) return setProject(null)
      setProject(props.projectsManager.getProject(id) ?? props.projectsManager.newProject(fromFirestore(doc.data() as IProject), id))
    }).catch(() => setProject(null))
  }, [id])

  if (project === undefined) return (<p style={{ padding: 40 }}>Loading project...</p>)
  if (!project) return (<p style={{ padding: 40 }}>The project with ID {id} wasn't found.</p>)
  return <ProjectWorkspace key={project.id} project={project} projectsManager={props.projectsManager} />
}

function ProjectWorkspace(props: Props & { project: Project }) {
  const { project } = props
  const navigateTo = Router.useNavigate()
  props.projectsManager.OnProjectDeleted = async (id) => {
    await deleteProjectData(id)
    navigateTo("/")
  }

  // The page is drawn again when the project changes (the form and the To-Dos save it in Firestore)
  const [, setVersion] = React.useState(0)
  props.projectsManager.OnProjectUpdated = () => setVersion((v) => v + 1)

  // The elements are declared so updateComponent knows the state of each one
  const viewerGrid = React.useRef<BUI.Grid<["Main"], [
    { name: "sidebar"; state: TEMPLATES.GridSidebarState },
    { name: "componentsGrid"; state: TEMPLATES.ComponentsGridState },
  ]>>(null)
  let engineManager: OBC.Components | null = null
  const componentsRef = React.useRef<OBC.Components | null>(null)
  const [components, setComponents] = React.useState<OBC.Components | null>(null)
  // Layout of the viewer (Models, SmartViews, Viewer), chosen in the Project panel of the side menu
  const componentsGridRef = React.useRef<ComponentsGrid | null>(null)
  // Panels shown in the side menu (Models, SmartViews) or none (Viewer); the 3D always keeps the whole screen
  const [layout, setLayout] = React.useState<PanelsView>("Viewer")
  const closeDrawerRef = React.useRef<() => void>(() => {})
  // IFC classes of the selected elements, shown at the top right of the viewer (e.g. "IFCWINDOW")
  const [selectedClasses, setSelectedClasses] = React.useState<[string, number][]>([])
  const [viewportContainer, setViewportContainer] = React.useState<HTMLElement | null>(null)
  const changeLayout = (name: PanelsView) => {
    setLayout(name)
    if (name === "Viewer") closeDrawerRef.current()
  }
  const [modelMessage, setModelMessage] = React.useState("")

  const setupGrid = async () => {
    const { current: grid } = viewerGrid
    if (!grid) return

    const { components, viewport } = await setupComponents(project.smartViews)
    engineManager = components
    componentsRef.current = components
    setComponents(components)

    const highlighter = components.get(OBF.Highlighter)
    highlighter.events.select.onHighlight.add(async (selection) => {
      const fragments = components.get(OBC.FragmentsManager)
      const counts = new Map<string, number>()
      for (const [modelId, ids] of Object.entries(selection)) {
        const model = fragments.list.get(modelId)
        if (!model) continue
        for (const data of await model.getItemsData([...ids])) {
          const category = data._category && "value" in data._category ? String(data._category.value) : "Unknown"
          counts.set(category, (counts.get(category) ?? 0) + 1)
        }
      }
      setSelectedClasses([...counts.entries()].sort((a, b) => b[1] - a[1]))
    })
    highlighter.events.select.onClear.add(() => setSelectedClasses([]))

    // Smart views are part of the project data: every change is stored in Firestore
    const smartViews = components.get(SmartViews)
    const saveSmartViews = async () => {
      project.smartViews = smartViews.export()
      await saveProject(project)
    }
    smartViews.list.onItemSet.add(saveSmartViews)
    smartViews.list.onItemUpdated.add(saveSmartViews)
    smartViews.list.onItemDeleted.add(saveSmartViews)

    // The queries made in the app are stored with the project too (the predefined ones stay in the code)
    importCustomQueries(components, project.queries)
    const finder = components.get(OBC.ItemsFinder)
    const saveQueries = async () => {
      project.queries = exportCustomQueries(components)
      await saveProject(project)
    }
    finder.list.onItemSet.add(saveQueries)
    finder.list.onItemDeleted.add(saveQueries)

    grid.elements = {
      sidebar: {
        template: TEMPLATES.gridSidebarTemplate,
        initialState: {}
      },
      componentsGrid: {
        template: TEMPLATES.componentsGridTemplate,
        initialState: { components, viewport }
      }
    };

    grid.layouts = {
      Main: {
        template: `
          "sidebar" auto
          "componentsGrid" 1fr
          /1fr
        `,
      },
    }

    grid.addEventListener("elementcreated", (e: CustomEvent<BUI.ElementCreatedEventDetail<ComponentsGrid>>) => {
      const { name, element: componentsGrid } = e.detail
      if (name !== "componentsGrid") return
      grid.updateComponent.sidebar({ grid: componentsGrid, components })
      componentsGridRef.current = componentsGrid
      // The 3D container is created by the grid a moment later
      const findContainer = () => {
        const container = componentsGrid.querySelector(".viewport-container") as HTMLElement | null
        if (container) setViewportContainer(container)
        else requestAnimationFrame(findContainer)
      }
      findContainer()
      // After applying a smart view the panels hide and the 3D takes the screen
      // (the SmartViews button of the Project panel shows them again)
      // After applying a smart view the side menu closes so the result is seen
      smartViews.onApplied.add(() => closeDrawerRef.current())
    })

    grid.layout = "Main";
  }

  React.useEffect(() => {
    setupGrid()
    return () => {
      // React runs this before the cleanups of the side menu panels, which still use the engine:
      // dispose it after them, or their errors leave the next page blank
      const components = engineManager
      engineManager = null
      componentsRef.current = null
      setTimeout(() => {
        try {
          components?.dispose()
        } catch (error) {
          console.warn("Disposing the viewer", error)
        }
      })
    }
  }, [])

  // The models stored with the project open with it
  React.useEffect(() => {
    const loadStoredModels = async () => {
      while (!componentsRef.current) await new Promise((resolve) => setTimeout(resolve, 100))
      for (const url of project.models) {
        try {
          await loadModelFromUrl(componentsRef.current, url)
        } catch (error) {
          setModelMessage((error as Error).message)
        }
      }
    }
    if (project.models.length > 0) loadStoredModels()
  }, [])

  const onAddExampleModel = async () => {
    const components = componentsRef.current
    if (!components || project.models.includes(EXAMPLE_MODEL_URL)) return
    setModelMessage("Loading the example model...")
    try {
      await loadModelFromUrl(components, EXAMPLE_MODEL_URL)
      project.models = [...project.models, EXAMPLE_MODEL_URL]
      await saveProject(project)
      setModelMessage("")
      setVersion((v) => v + 1)
    } catch (error) {
      setModelMessage((error as Error).message)
    }
  }

  // Deletes the project (app and Firestore) and goes back to the list; it asks first
  const onDeleteClick = () => {
    if (!confirm(`Delete the project "${project.name}" with its To-Dos and smart views? This can't be undone.`)) return
    props.projectsManager.deleteProject(project.id)
  }

  const onEditClick = () => {
    const modal = document.getElementById("edit-project-modal")
    if (modal instanceof HTMLDialogElement) modal.showModal()
  }

  // The ToDos are read from their collection when the project opens. Projects saved before the
  // collection existed have them inside the project document: they are moved to the collection once.
  React.useEffect(() => {
    const loadToDos = async () => {
      const stored = await getToDos<IToDo>(project.id)
      if (stored.length === 0 && project.todos.length > 0) {
        await replaceToDos(project.id, project.todos)
        await saveProject(project) // removes the old field
        return
      }
      project.todos = stored.sort((a, b) => a.date.getTime() - b.date.getTime())
      setVersion((v) => v + 1)
    }
    loadToDos()
  }, [])

  // Only the ToDos that changed are written (new or edited objects; removed ones are deleted)
  const onToDosChange = async (todos: IToDo[]) => {
    const before = project.todos
    props.projectsManager.setToDos(project.id, todos)
    const ids = new Set(todos.map((todo) => todo.id))
    await Promise.all([
      ...todos.filter((todo) => !before.includes(todo)).map((todo) => saveToDo(project.id, todo)),
      ...before.filter((todo) => !ids.has(todo.id)).map((todo) => deleteToDo(project.id, todo.id)),
    ])
  }

  return (
    <div className="page" id="project-details">
      <ProjectForm id="edit-project-modal" project={project} projectsManager={props.projectsManager} />
      {/* The viewer takes the whole screen; the menu button opens the project sidebar */}
      <bim-grid ref={viewerGrid} className="viewer-grid"></bim-grid>
      {/* Inside the 3D container, so it stays at the top right of the 3D in every layout */}
      {selectedClasses.length > 0 && viewportContainer && createPortal(
        <div className="selected-classes" aria-live="polite">
          {selectedClasses.slice(0, 4).map(([category, count]) => (
            <span key={category}>{category}{count > 1 ? ` × ${count}` : ""}</span>
          ))}
          {selectedClasses.length > 4 && <span>+{selectedClasses.length - 4} more</span>}
        </div>,
        viewportContainer
      )}
      <Sidebar structure={(close) => {
        closeDrawerRef.current = close
        return <>
          <div className="layout-buttons">
            {(["Models", "SmartViews", "Viewer"] as PanelsView[]).map((name) => (
              <button key={name} className={`drawer-nav-button${layout === name ? " active" : ""}`}
                aria-pressed={layout === name}
                onClick={() => changeLayout(name)}>{name}</button>
            ))}
          </div>
          <BimPanels components={components} view={layout} />
          <IfcStructure components={components} />
        </>
      }}>
        <div className="project-dashboard">
          <div className="dashboard-card" style={{ padding: "20px 0" }}>
            <div className="dashboard-card-header" style={{ padding: "0 20px", marginBottom: 20 }}>
              <p className="project-icon" style={{ backgroundColor: project.color, fontSize: 20, borderRadius: "100%", padding: 12 }}>
                {project.initials}
              </p>
              <div style={{ display: "flex", columnGap: 10 }}>
                <button className="btn-secondary btn-danger-outline" onClick={onDeleteClick}>
                  <p style={{ width: "100%" }}>Delete</p>
                </button>
                <button className="btn-secondary" onClick={onEditClick}>
                  <p style={{ width: "100%" }}>Edit</p>
                </button>
              </div>
            </div>
            <div style={{ padding: "0 20px" }}>
              <h5>{project.name}</h5>
              <p style={{ color: "var(--text-muted)" }}>{project.description}</p>
              <div className="project-properties">
                <div><p className="property-label">Status</p><p><StatusBadge project={project} /></p></div>
                <div><p className="property-label">Cost</p><p>$ {project.cost}</p></div>
                <div><p className="property-label">Role</p><p>{project.userRole}</p></div>
                <div><p className="property-label">Finish Date</p><p>{project.finishDate.toDateString()}</p></div>
              </div>
              <div className="project-models">
                <p className="property-label">Models</p>
                {project.models.length === 0 && <p style={{ color: "var(--text-muted)" }}>No models stored with this project.</p>}
                {project.models.map((url) => <p key={url}>{url.split("/").pop()}</p>)}
                {!project.models.includes(EXAMPLE_MODEL_URL) && (
                  <button className="btn-secondary" style={{ width: "auto", padding: "0 12px" }} onClick={onAddExampleModel}>
                    <p>Load example model</p>
                  </button>
                )}
                {modelMessage && <p style={{ color: "var(--text-muted)" }}>{modelMessage}</p>}
                <a className="model-credit" href={EXAMPLE_MODEL_SOURCE} target="_blank" rel="noreferrer">{EXAMPLE_MODEL_CREDIT}</a>
              </div>
              <div style={{ backgroundColor: "var(--background-200)", borderRadius: 9999, overflow: "auto" }}>
                <div style={{ width: `${project.progress * 100}%`, backgroundColor: "green", padding: "4px 0", textAlign: "center" }}>
                  {project.progress * 100}%
                </div>
              </div>
            </div>
          </div>
          <ProjectTasksList project={project} onChange={onToDosChange} />
        </div>
      </Sidebar>
    </div>
  );
}
