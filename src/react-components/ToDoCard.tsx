import * as React from "react";
import { IToDo, ToDoPriority, ToDoStatus } from "../classes/Project";

export const todoStatuses: Record<ToDoStatus, { label: string, color: string, icon: string }> = {
  "pending": { label: "Pending", color: "#686868", icon: "schedule" },
  "in-progress": { label: "In progress", color: "#b5841f", icon: "construction" },
  "done": { label: "Done", color: "#1f8a70", icon: "check_circle" },
}

export const todoPriorities: Record<ToDoPriority, { label: string, color: string }> = {
  "low": { label: "Low", color: "#2a7fd4" },
  "medium": { label: "Medium", color: "#7b4fd6" },
  "high": { label: "High", color: "#d64f6b" },
}

interface ToDoCardProps {
  todo: IToDo
  onClick: () => void
}

export function ToDoCard({ todo, onClick }: ToDoCardProps) {
  const status = todoStatuses[todo.status] ?? todoStatuses.pending
  const priority = todoPriorities[todo.priority ?? "medium"] ?? todoPriorities.medium
  return (
    <div className="todo-item" style={{ backgroundColor: status.color, borderLeft: `8px solid ${priority.color}` }} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", columnGap: 15, alignItems: "center" }}>
          <span className="material-icons-round todo-icon">{status.icon}</span>
          <div>
            <p>{todo.description}</p>
            <p className="todo-status">
              {status.label}
              <span className="todo-priority" style={{ color: priority.color }}>{priority.label}</span>
            </p>
          </div>
        </div>
        <p style={{ marginLeft: 10, whiteSpace: "nowrap" }}>
          {todo.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
        </p>
      </div>
    </div>
  )
}
