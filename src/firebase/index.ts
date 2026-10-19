import * as Firestore from "firebase/firestore";
import { initializeApp } from "firebase/app"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const firestoreDB = Firestore.getFirestore(app);

export function getCollection<T>(path: string) {
  return Firestore.collection(firestoreDB, path) as Firestore.CollectionReference<T>
}

export async function deleteDocument(path: string, id: string) {
  const doc = Firestore.doc(firestoreDB, `${path}/${id}`)
  await Firestore.deleteDoc(doc)
}

export async function updateDocument<T extends Record<string, any>>(path: string, id: string, data: T) {
  const doc = Firestore.doc(firestoreDB, `${path}/${id}`)
  await Firestore.updateDoc(doc, data)
}

// Creates the document with the given id or updates the fields given in data.
// merge: fields this version of the app doesn't know (saved by a newer version) are kept
export async function setDocument<T extends Record<string, any>>(path: string, id: string, data: T) {
  const doc = Firestore.doc(firestoreDB, `${path}/${id}`)
  await Firestore.setDoc(doc, data, { merge: true })
}

// Firestore gives back Timestamps where the app saved Dates
export function fromFirestore<T>(data: T): T {
  if (data instanceof Firestore.Timestamp) return data.toDate() as T
  if (Array.isArray(data)) return data.map(fromFirestore) as T
  if (data && typeof data === "object") {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, fromFirestore(value)])) as T
  }
  return data
}

// ToDos live in their own collection inside each project: projects/{projectId}/todos/{todoId}
const todosCollection = (projectId: string) => Firestore.collection(firestoreDB, "projects", projectId, "todos")

// Firestore doesn't accept undefined values (e.g. old ToDos without priority)
const withoutUndefined = <T extends Record<string, any>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))

export async function getToDos<T>(projectId: string): Promise<T[]> {
  const snapshot = await Firestore.getDocs(todosCollection(projectId))
  return snapshot.docs.map((doc) => fromFirestore({ ...doc.data(), id: doc.id }) as T)
}

export async function saveToDo(projectId: string, todo: { id: string } & Record<string, any>) {
  const { id, ...data } = todo
  await Firestore.setDoc(Firestore.doc(todosCollection(projectId), id), withoutUndefined(data))
}

export async function deleteToDo(projectId: string, id: string) {
  await Firestore.deleteDoc(Firestore.doc(todosCollection(projectId), id))
}

// The ToDos of the project become exactly this list (used when importing and migrating)
export async function replaceToDos(projectId: string, todos: ({ id: string } & Record<string, any>)[]) {
  const batch = Firestore.writeBatch(firestoreDB)
  const keep = new Set(todos.map((todo) => todo.id))
  for (const doc of (await Firestore.getDocs(todosCollection(projectId))).docs) {
    if (!keep.has(doc.id)) batch.delete(doc.ref)
  }
  for (const { id, ...data } of todos) batch.set(Firestore.doc(todosCollection(projectId), id), withoutUndefined(data))
  await batch.commit()
}

// The project document without its ToDos (the old "todos" field, from before the collection, is removed)
export async function saveProject(project: { id: string, toData: () => Record<string, any> }) {
  const { todos, ...data } = project.toData()
  await setDocument("/projects", project.id, { ...data, todos: Firestore.deleteField() })
}

// Firestore doesn't delete the ToDos with the project: they are deleted first
export async function deleteProjectData(projectId: string) {
  const batch = Firestore.writeBatch(firestoreDB)
  for (const doc of (await Firestore.getDocs(todosCollection(projectId))).docs) batch.delete(doc.ref)
  batch.delete(Firestore.doc(firestoreDB, "projects", projectId))
  await batch.commit()
}
