import * as React from "react";
import { IProject, Project, projectStatuses, ProjectStatus, UserRole } from "../classes/Project";
import { MIN_NAME_LENGTH, ProjectsManager } from "../classes/ProjectsManager";
import { saveProject } from "../firebase";

interface Props {
  id: string
  projectsManager: ProjectsManager
  // Without a project the form creates one; with a project it edits it
  project?: Project
}

const toInputDate = (date?: Date) => date ? date.toISOString().slice(0, 10) : ""

// Dialog with the project form: it creates or updates the project in the app and in Firestore
export function ProjectForm(props: Props) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [error, setError] = React.useState("")
  const { project } = props

  const close = () => {
    setError("")
    formRef.current?.reset()
    const modal = document.getElementById(props.id)
    if (modal instanceof HTMLDialogElement) modal.close()
  }

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = formRef.current
    if (!form) return
    const formData = new FormData(form)
    const finishDate = formData.get("finishDate") as string
    const data: IProject = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      status: formData.get("status") as ProjectStatus,
      userRole: formData.get("userRole") as UserRole,
      // Empty date: the projects manager gives a default one
      finishDate: finishDate ? new Date(finishDate) : (undefined as unknown as Date)
    }
    try {
      const saved = project
        ? props.projectsManager.updateProject(project.id, data)
        : props.projectsManager.newProject(data)
      // The Firestore document uses the same id as the project in the app
      await saveProject(saved)
      close()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <dialog id={props.id}>
      {/* key: the default values are refreshed when the project changes */}
      <form ref={formRef} key={project ? `${project.id}-${project.name}` : "new"} onSubmit={onFormSubmit}>
        <h2>{project ? "Edit Project" : "New Project"}</h2>
        <div className="input-list">
          <div className="form-field-container">
            <label>
              <span className="material-icons-round">apartment</span>Name
            </label>
            <input
              name="name"
              type="text"
              defaultValue={project?.name}
              placeholder="What's the name of your project?"
            />
            <p className="form-tip">TIP: Give it a short name (at least {MIN_NAME_LENGTH} characters)</p>
          </div>
          <div className="form-field-container">
            <label>
              <span className="material-icons-round">subject</span>Description
            </label>
            <textarea
              name="description"
              cols={30}
              rows={5}
              placeholder="Give your project a nice description! So people is jealous about it."
              defaultValue={project?.description ?? ""}
            />
          </div>
          <div className="form-field-container">
            <label>
              <span className="material-icons-round">person</span>Role
            </label>
            <select name="userRole" defaultValue={project?.userRole?.toLowerCase()}>
              <option value="architect">Architect</option>
              <option value="engineer">Engineer</option>
              <option value="developer">Developer</option>
            </select>
          </div>
          <div className="form-field-container">
            <label>
              <span className="material-icons-round">not_listed_location</span>
              Status
            </label>
            <select name="status" defaultValue={project?.status ?? "brief"}>
              {Object.entries(projectStatuses).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-field-container">
            <label htmlFor="finishDate">
              <span className="material-icons-round">calendar_month</span>
              Finish Date
            </label>
            <input name="finishDate" type="date" defaultValue={toInputDate(project?.finishDate)} />
            <p className="form-tip">Leave it empty to use today's date</p>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="form-buttons">
            <button type="button" onClick={close} style={{ backgroundColor: "transparent" }}>
              Cancel
            </button>
            <button type="submit" style={{ backgroundColor: "rgb(18, 145, 18)" }}>
              Accept
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
