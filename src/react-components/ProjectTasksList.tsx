import * as React from "react";
import { IToDo, Project } from "../classes/Project";
import { SearchBox } from "./SearchBox";
import { ToDoCard } from "./ToDoCard";
import { ToDoForm } from "./ToDoForm";

interface Props {
  project: Project
  onChange: (todos: IToDo[]) => void
}

export function ProjectTasksList({ project, onChange }: Props) {
  const [editing, setEditing] = React.useState<IToDo | undefined>()
  const [search, setSearch] = React.useState("")
  const visibleToDos = project.todos.filter((todo) => todo.description.toLowerCase().includes(search.trim().toLowerCase()))
  const formId = "todo-modal"

  const openForm = (todo?: IToDo) => {
    setEditing(todo)
    // Wait for the form to render with the right ToDo
    requestAnimationFrame(() => {
      const modal = document.getElementById(formId)
      if (modal instanceof HTMLDialogElement) modal.showModal()
    })
  }

  const onSubmit = (todo: IToDo) => {
    const exists = project.todos.some((item) => item.id === todo.id)
    onChange(exists ? project.todos.map((item) => item.id === todo.id ? todo : item) : [...project.todos, todo])
  }

  const onDelete = (todo: IToDo) => {
    onChange(project.todos.filter((item) => item.id !== todo.id))
  }

  return (
    <div className="dashboard-card" style={{ flexGrow: 1, minHeight: 0 }}>
      <ToDoForm id={formId} todo={editing} onSubmit={onSubmit} onDelete={onDelete} />
      <div className="dashboard-card-header">
        <h4>To-Do</h4>
        <span className="material-icons-round action-icon" title="New To-Do" onClick={() => openForm()}>add</span>
      </div>
      <div style={{ padding: "0 20px 15px" }}>
        <SearchBox onChange={setSearch} placeholder="Search To-Dos..." width="100%" />
      </div>
      <div className="todo-list">
        {project.todos.length === 0 && <p style={{ color: "var(--text-muted)" }}>No To-Dos yet.</p>}
        {project.todos.length > 0 && visibleToDos.length === 0 && <p style={{ color: "var(--text-muted)" }}>No To-Dos match the search.</p>}
        {visibleToDos.map((todo) => (
          <ToDoCard key={todo.id} todo={todo} onClick={() => openForm(todo)} />
        ))}
      </div>
    </div>
  )
}
