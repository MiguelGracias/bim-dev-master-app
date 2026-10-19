import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { IToDo, ToDoPriority, ToDoStatus } from "../classes/Project";
import { todoPriorities, todoStatuses } from "./ToDoCard";

interface ToDoFormProps {
  id: string
  // Without a ToDo the form creates one; with a ToDo it edits it
  todo?: IToDo
  onSubmit: (todo: IToDo) => void
  // Shown only when editing an existing ToDo
  onDelete?: (todo: IToDo) => void
}

export function ToDoForm(props: ToDoFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const { todo } = props

  const close = () => {
    formRef.current?.reset()
    const modal = document.getElementById(props.id)
    if (modal instanceof HTMLDialogElement) modal.close()
  }

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    const date = formData.get("date") as string
    props.onSubmit({
      id: todo?.id ?? uuidv4(),
      description: (formData.get("description") as string).trim(),
      status: formData.get("status") as ToDoStatus,
      priority: formData.get("priority") as ToDoPriority,
      date: date ? new Date(date) : new Date(),
    })
    close()
  }

  return (
    <dialog id={props.id}>
      <form ref={formRef} key={todo?.id ?? "new"} onSubmit={onFormSubmit}>
        <h2>{todo ? "Edit To-Do" : "New To-Do"}</h2>
        <div className="input-list">
          <div className="form-field-container">
            <label><span className="material-icons-round">subject</span>Description</label>
            <textarea name="description" rows={3} required defaultValue={todo?.description} placeholder="What needs to be done?" />
          </div>
          <div className="form-field-container">
            <label><span className="material-icons-round">not_listed_location</span>Status</label>
            <select name="status" defaultValue={todo?.status ?? "pending"}>
              {Object.entries(todoStatuses).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-field-container">
            <label><span className="material-icons-round">flag</span>Priority</label>
            <select name="priority" defaultValue={todo?.priority ?? "medium"}>
              {Object.entries(todoPriorities).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-field-container">
            <label><span className="material-icons-round">calendar_month</span>Date</label>
            <input name="date" type="date" defaultValue={todo ? todo.date.toISOString().slice(0, 10) : ""} />
            <p className="form-tip">Leave it empty to use today's date</p>
          </div>
          <div className="form-buttons">
            {todo && props.onDelete && (
              <button type="button" className="btn-danger" onClick={() => {
                if (!confirm(`Delete the To-Do "${todo.description}"?`)) return
                props.onDelete!(todo)
                close()
              }}>Delete</button>
            )}
            <button type="button" onClick={close} style={{ backgroundColor: "transparent" }}>Cancel</button>
            <button type="submit" style={{ backgroundColor: "rgb(18, 145, 18)" }}>Accept</button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
