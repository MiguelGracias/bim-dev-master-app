import { v4 as uuidv4 } from 'uuid'
import type { SerializedSmartView } from '../bim-components/SmartViews'

// Phases of an architecture project (Portaria 701-H/2008), plus construction and closing
export type ProjectStatus = "brief" | "preliminary-study" | "licensing" | "detailed-design"
  | "tendering" | "construction" | "completed" | "on-hold"

export const projectStatuses: Record<ProjectStatus, { label: string, color: string }> = {
  "brief": { label: "Brief", color: "#8a8a8a" },
  "preliminary-study": { label: "Preliminary Study", color: "#6f8fb8" },
  "licensing": { label: "Licensing", color: "#4f7fc4" },
  "detailed-design": { label: "Detailed Design", color: "#2a6fd4" },
  "tendering": { label: "Tendering", color: "#6a5fd0" },
  "construction": { label: "Construction", color: "#ca8134" },
  "completed": { label: "Completed", color: "#1f8a70" },
  "on-hold": { label: "On Hold", color: "#d64f6b" },
}

// Projects saved with the old statuses get the matching new one
const legacyStatuses: Record<string, ProjectStatus> = { pending: "brief", active: "construction", finished: "completed" }

export function normalizeStatus(value?: string): ProjectStatus {
  const status = (value ?? "").toLowerCase()
  if (status in projectStatuses) return status as ProjectStatus
  return legacyStatuses[status] ?? "brief"
}
export type UserRole = "architect" | "engineer" | "developer"
export type ToDoStatus = "pending" | "in-progress" | "done"
export type ToDoPriority = "low" | "medium" | "high"

export interface IToDo {
  id: string
  description: string
  status: ToDoStatus
  // Older ToDos have no priority: they count as "medium"
  priority?: ToDoPriority
  date: Date
}

export interface IProject {
  name: string
	description: string
	status: ProjectStatus
	userRole: UserRole
	finishDate: Date
  color?: string
  todos?: IToDo[]
  smartViews?: SerializedSmartView[]
  // URLs of the models that open with the project
  models?: string[]
  // Items Finder queries made in the app (serialized)
  queries?: Record<string, any>[]
}

export const iconColors = ["#ca8134", "#1f8a70", "#7b4fd6", "#d64f6b", "#2a7fd4", "#b5a114"]

export class Project implements IProject {
	//To satisfy IProject
  name: string
	description: string
	status: ProjectStatus
	userRole: "architect" | "engineer" | "developer"
  finishDate: Date
  color: string = iconColors[Math.floor(Math.random() * iconColors.length)]
  todos: IToDo[] = []
  smartViews: SerializedSmartView[] = []
  models: string[] = []
  queries: Record<string, any>[] = []

  //Class internals
  cost: number = 0
  progress: number = 0
  id: string

  constructor(data: IProject, id = uuidv4()) {
    for (const key in data) {
      if (data[key] === undefined) continue
      this[key] = data[key]
    }
    this.id = id
  }

  get initials() {
    return this.name.slice(0, 2)
  }

  // Plain data to store in Firestore or in a JSON file
  toData(): IProject {
    return {
      name: this.name,
      description: this.description,
      status: this.status,
      userRole: this.userRole,
      finishDate: this.finishDate,
      color: this.color,
      todos: this.todos,
      smartViews: this.smartViews,
      models: this.models,
      queries: this.queries
    }
  }
}
