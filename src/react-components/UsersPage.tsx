import * as React from "react";
import * as Firestore from "firebase/firestore";
import { deleteDocument, getCollection, setDocument } from "../firebase";
import { appIcons } from "../globals";
import { iconColors } from "../classes/Project";
import { SearchBox } from "./SearchBox";
import { Sidebar } from "./Sidebar";

export type UserRole = "architect" | "engineer" | "developer" | "manager" | "other"
export type UserStatus = "active" | "inactive"

export interface IUser {
  name: string
  email: string
  company: string
  role: UserRole
  // Older users have no status or color: they count as active and get a color from their name
  status?: UserStatus
  color?: string
}

const roleColors: Record<UserRole, string> = {
  architect: "#ca8134",
  engineer: "#2a7fd4",
  developer: "#7b4fd6",
  manager: "#1f8a70",
  other: "#686868",
}

const statusColors: Record<UserStatus, string> = {
  active: "#1f8a70",
  inactive: "#969696",
}

// "Miguel Gracias" -> "MG", "Ana" -> "AN"
function initials(name: string) {
  const words = name.trim().split(/\s+/)
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.trim().slice(0, 2)).toUpperCase()
}

function userColor(user: IUser) {
  if (user.color) return user.color
  const hash = [...user.name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return iconColors[hash % iconColors.length]
}

const usersCollection = getCollection<IUser>("users")

// People page: a table of users (different from the project cards) and a form to add new ones
export function UsersPage() {
  const [users, setUsers] = React.useState<(IUser & { id: string })[]>([])
  const [search, setSearch] = React.useState("")
  // On phones a tap opens the compact line as a card (CSS shows the rest only there)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const toggle = (id: string) => setOpenId(openId === id ? null : id)
  const visibleUsers = users.filter((user) => user.name.toLowerCase().includes(search.trim().toLowerCase()))
  const formRef = React.useRef<HTMLFormElement>(null)

  React.useEffect(() => {
    Firestore.getDocs(usersCollection).then((snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })))
    })
  }, [])

  // The same form creates a user (editing = null) or edits one
  const [editing, setEditing] = React.useState<(IUser & { id: string }) | null>(null)

  const modal = () => document.getElementById("new-user-modal") as HTMLDialogElement | null

  const openForm = (user: (IUser & { id: string }) | null) => {
    setEditing(user)
    // Wait for the form to render with the right user
    requestAnimationFrame(() => modal()?.showModal())
  }

  const closeForm = () => {
    formRef.current?.reset()
    modal()?.close()
  }

  const onDelete = async () => {
    if (!editing || !confirm(`Delete the user "${editing.name}"? This can't be undone.`)) return
    await deleteDocument("/users", editing.id)
    setUsers(users.filter((user) => user.id !== editing.id))
    closeForm()
  }

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    const user: IUser = {
      name: (formData.get("name") as string).trim(),
      email: (formData.get("email") as string).trim(),
      company: (formData.get("company") as string).trim(),
      role: formData.get("role") as UserRole,
      status: formData.get("status") as UserStatus,
      color: editing?.color ?? iconColors[Math.floor(Math.random() * iconColors.length)],
    }
    if (editing) {
      await setDocument("/users", editing.id, user)
      setUsers(users.map((item) => item.id === editing.id ? { ...user, id: editing.id } : item))
    } else {
      const doc = await Firestore.addDoc(usersCollection, user)
      setUsers([...users, { ...user, id: doc.id }])
    }
    closeForm()
  }

  return (
    <div className="page" id="users-page">
      <dialog id="new-user-modal">
        <form ref={formRef} key={editing?.id ?? "new"} onSubmit={onFormSubmit}>
          <h2>{editing ? "Edit User" : "New User"}</h2>
          <div className="input-list">
            <div className="form-field-container">
              <label><span className="material-icons-round">person</span>Name</label>
              <input name="name" type="text" required pattern=".*\S.*" placeholder="Full name" defaultValue={editing?.name} />
            </div>
            <div className="form-field-container">
              <label><span className="material-icons-round">mail</span>Email</label>
              <input name="email" type="email" required placeholder="name@company.com" defaultValue={editing?.email} />
            </div>
            <div className="form-field-container">
              <label><span className="material-icons-round">business</span>Company</label>
              <input name="company" type="text" placeholder="Company" defaultValue={editing?.company} />
            </div>
            <div className="form-field-container">
              <label><span className="material-icons-round">badge</span>Role</label>
              <select name="role" defaultValue={editing?.role ?? "architect"}>
                <option value="architect">Architect</option>
                <option value="engineer">Engineer</option>
                <option value="developer">Developer</option>
                <option value="manager">Manager</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-field-container">
              <label><span className="material-icons-round">toggle_on</span>Status</label>
              <select name="status" defaultValue={editing?.status ?? "active"}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-buttons">
              {editing && <button type="button" className="btn-danger" onClick={onDelete}>Delete</button>}
              <button type="button" onClick={closeForm} style={{ backgroundColor: "transparent" }}>Cancel</button>
              <button type="submit" style={{ backgroundColor: "rgb(18, 145, 18)" }}>Accept</button>
            </div>
          </div>
        </form>
      </dialog>
      <header>
        <Sidebar />
        <bim-label style={{ fontSize: "1.3rem", color: "var(--text)" }}>Users</bim-label>
        <SearchBox onChange={setSearch} placeholder="Search users by name..." />
        <bim-button className="desktop-only" onclick={() => openForm(null)} icon={appIcons.ADD} label="New User"></bim-button>
      </header>
      <button className="fab phone-only" aria-label="New User" onClick={() => openForm(null)}>
        <span className="material-icons-round">add</span>
      </button>
      <div className="users-table">
        <div className="users-row users-row-head">
          <p>Name</p><p>Role</p><p>Company</p><p>Status</p><p></p>
        </div>
        {users.length === 0 && <p style={{ padding: 20, color: "var(--text-muted)" }}>There are no users yet!</p>}
        {users.length > 0 && visibleUsers.length === 0 && <p style={{ padding: 20, color: "var(--text-muted)" }}>No users match the search.</p>}
        {visibleUsers.map((user) => {
          const status = user.status ?? "active"
          const roleColor = roleColors[user.role] ?? "#969696"
          return (
            <div className={`users-row${openId === user.id ? " open" : ""}`} key={user.id}
              role="button" tabIndex={0} aria-expanded={openId === user.id}
              onClick={() => toggle(user.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(user.id) } }}>
              <div className="user-name">
                <span className="user-avatar" style={{ backgroundColor: userColor(user) }}>{initials(user.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <p>{user.name}</p>
                  <p className="user-email">{user.email ? <a href={`mailto:${user.email}`} onClick={(e) => e.stopPropagation()}>{user.email}</a> : "—"}</p>
                </div>
              </div>
              <p><span className="role-badge" style={{ borderColor: roleColor, color: roleColor }}>{user.role || "—"}</span></p>
              <p className="user-company" data-label="Company">{user.company || "—"}</p>
              <p className="user-status" data-label="Status"><span className="role-badge" style={{ borderColor: statusColors[status], color: statusColors[status] }}>{status}</span></p>
              <button className="user-edit" title="Edit" aria-label={`Edit ${user.name}`}
                onClick={(e) => { e.stopPropagation(); openForm(user) }}
                onKeyDown={(e) => e.stopPropagation()}>
                <span className="material-icons-round">edit</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
