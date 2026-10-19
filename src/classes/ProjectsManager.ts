import { IProject, IToDo, normalizeStatus, Project } from "./Project"

export const MIN_NAME_LENGTH = 5

export class ProjectsManager {
  list: Project[] = []
  OnProjectCreated = (project: Project) => {}
  OnProjectDeleted = (id: string) => {}
  OnProjectUpdated = (project: Project) => {}
  // isNew: true when the imported project didn't exist yet
  OnProjectImported = (project: Project, isNew: boolean) => {}

  filterProjects(value: string) {
    const filteredProjects = this.list.filter((project) => {
      return project.name.toLowerCase().includes(value.trim().toLowerCase())
    })
    return filteredProjects
  }

  // Validates and completes the data coming from a form or a JSON file
  static prepareData(data: IProject): IProject {
    const name = (data.name ?? "").trim()
    if (name.length < MIN_NAME_LENGTH) {
      throw new Error(`The project name must have at least ${MIN_NAME_LENGTH} characters`)
    }
    const date = data.finishDate ? new Date(data.finishDate) : null
    const finishDate = date && !isNaN(date.getTime()) ? date : new Date()
    const todos = (data.todos ?? []).map((todo) => ({ ...todo, date: new Date(todo.date) }))
    return { ...data, name, finishDate, todos, status: normalizeStatus(data.status) }
  }

  newProject(data: IProject, id?: string) {
    const projectData = ProjectsManager.prepareData(data)
    const projectNames = this.list.map((project) => {
      return project.name
    })
    const nameInUse = projectNames.includes(projectData.name)
    if (nameInUse) {
      throw new Error(`A project with the name "${projectData.name}" already exists`)
    }
    const project = new Project(projectData, id)
    this.list.push(project)
    this.OnProjectCreated(project)
    return project
  }

  updateProject(id: string, data: IProject) {
    const project = this.getProject(id)
    if (!project) { throw new Error(`The project with ID ${id} wasn't found`) }
    const projectData = ProjectsManager.prepareData({ ...project.toData(), ...data })
    const nameInUse = this.list.some((other) => other.id !== id && other.name === projectData.name)
    if (nameInUse) {
      throw new Error(`A project with the name "${projectData.name}" already exists`)
    }
    Object.assign(project, projectData)
    this.OnProjectUpdated(project)
    return project
  }

  setToDos(id: string, todos: IToDo[]) {
    const project = this.getProject(id)
    if (!project) { return }
    project.todos = todos
    this.OnProjectUpdated(project)
  }

  getProject(id: string) {
    const project = this.list.find((project) => {
      return project.id === id
    })
    return project
  }

  deleteProject(id: string) {
    const project = this.getProject(id)
    if (!project) { return }
    const remaining = this.list.filter((project) => {
      return project.id !== id
    })
    this.list = remaining
    this.OnProjectDeleted(id)
  }

  exportToJSON(fileName: string = "projects", projects: Project[] = this.list) {
    // The ToDos go inside each project
    const data = projects.map((project) => ({ id: project.id, ...project.toData() }))
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  // Projects that already exist (same id, or same name) are updated instead of skipped
  importProjects(projects: (IProject & { id?: string })[]) {
    const errors: string[] = []
    for (const { id, ...data } of projects) {
      const existing = (id && this.getProject(id)) || this.list.find((project) => project.name === data.name?.trim())
      try {
        if (existing) {
          this.OnProjectImported(this.updateProject(existing.id, data), false)
        } else {
          this.OnProjectImported(this.newProject(data, id), true)
        }
      } catch (error) {
        errors.push(`${data.name}: ${(error as Error).message}`)
      }
    }
    return errors
  }

  importFromJSON() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      const json = reader.result
      if (!json) { return }
      let data: (IProject & { id?: string }) | (IProject & { id?: string })[]
      try {
        data = JSON.parse(json as string)
      } catch {
        alert("The file is not a valid JSON file")
        return
      }
      // A file with a single project (not a list) is accepted too
      const errors = this.importProjects(Array.isArray(data) ? data : [data])
      if (errors.length) { alert(`Some projects were not imported:\n${errors.join("\n")}`) }
    })
    input.addEventListener('change', () => {
      const filesList = input.files
      if (!filesList) { return }
      reader.readAsText(filesList[0])
    })
    input.click()
  }
}
