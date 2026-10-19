# BIM Dev Master — challenges

App built by **Miguel Gracias** during the **Master BIM Software Developer** (That Open University),
starting from the course code (lessons up to module 4) and completing the challenges of modules 1 to 4.

**Live app:** https://bim-dev-master-challenges.web.app

Try it: open the project **"Duplex Apartment"**. It opens with an example model
(Duplex Apartment) and some smart views. Go to **SmartViews** and tap a view.

Stack: React 19, React Router, That Open Engine 3.1 (`@thatopen/components`, `components-front`,
`fragments`, `ui`), Three.js, Firebase (Firestore + Hosting), Vite.

## Challenges

### M1 · Creating Static Websites

- **Users page** (`/users`) with a list of people and a form to add them, with a design different
  from the project cards: a table on desktop, compact rows on phones that open as a card.
  Avatar with initials and color, role, company, status and search by name. Stored in Firestore.
  — `src/react-components/UsersPage.tsx`

### M2 · Creating Interactive Websites

1. Project icon = first two letters of the name, uppercased with CSS (`.project-icon`).
2. Random icon color from a list of 6 (`iconColors` in `src/classes/Project.ts`).
3. A project is not created if the name has less than 5 characters (`ProjectsManager.prepareData`).
4. Default finish date (today) when the form leaves it empty.
5. Edit the project from its page (menu ☰ → Edit).
6. Create ToDos with the button; they are stored inside the project data.
7. Export includes the ToDos (download icon on each project card).
8. Importing a JSON updates a project that already exists (same id or name) instead of skipping it.
9. Status for each ToDo, when created and when edited; the card color follows the status.

### M3 · Creating Reactive Apps

- **`ProjectForm`** component that creates and updates projects, locally and in Firestore,
  used in the projects list (New Project) and in the project page (Edit).
- **ToDo components:** `ProjectTasksList` (list in the project page), `ToDoCard` (status and
  priority, each with its own colors), the course `SearchBox` filtering the ToDos and `ToDoForm`
  (creates and edits; it can also delete).
- **ToDos in Firestore**, in their own collection `projects/{projectId}/todos`, read when a project
  is opened (also with a direct link or a reload). Only the ToDo that changes is written; deleting a
  project deletes its ToDos too. Projects saved before had the ToDos inside the project document:
  they are moved to the collection the first time the project opens.

### M4 · Creating BIM Apps

1. **Items Finder UI** (Queries panel, `+`): find all the items with a property value in a property
   set (e.g. `Pset_WallCommon` / `IsExternal` / `true`). Text, numbers and booleans are supported.
   Buttons to **download / upload** the queries, using `ItemsFinder.export()` / `import()`.
   The queries made in the app (or uploaded) are stored with the project in Firestore and can be
   deleted; the predefined ones (in the code) are fixed and an upload can't replace them.
   — `src/ui-templates/sections/queries.ts`, `propertyQuery` in `src/bim-components/setup/src/items-finder.ts`
2. **Colors palette** in the Colorize button: 8 predefined colors, one click colors the selection.
   — `src/ui-templates/containers/viewport-toolbar.ts`
3. **Data Enhancer:** `getItemsWithData(source, entry)` returns all the items sharing the same source
   information, and `getItemsSharingData(source, items)` starts from a selection. In the Sources
   panel, clicking an entry selects those items (e.g. all the windows of the IFCWINDOW documentation),
   and the button "Select items with the same information" does it from the items selected in the 3D.
   — `src/bim-components/DataEnhancer/index.ts`
4. **Smart Views:** `export()` / `import()` serialize the view definition (no images) so it is
   recreated as if made in the same session; the views are stored in Firestore with the project
   and shown when it opens; each view has an **Update** button that saves the current state.
   — `src/bim-components/SmartViews/index.ts`

### Extras

- Models stored with a project open with it; an example model can be added from the project menu.
- Storey views: a smart view with only the elements of a chosen storey.
- Ghost mode with thin edge lines, "select all of the same type", Reset button in the top bar.
- Full screen viewer, icon toolbar, light theme, layouts adapted to phones.
- Fixes to the course code: the fragments worker is bundled (it was loaded from `node_modules`,
  which doesn't exist once deployed) and applying a smart view no longer races with its reset.

## Run locally

```bash
npm install
cp .env.example .env   # fill in the web app config of your Firebase project
npm run dev
```

Deploy: `npm run build` and `firebase deploy` (hosting and Firestore rules, see `firebase.json`
and `firestore.rules`).

## Credits

- Author: Miguel Gracias — https://github.com/MiguelGracias
- Course code: That Open Company, Master BIM Software Developer.
- Example model: BSI (2020) "Duplex Apartment Test Files," buildingSMART International,
  CC BY 4.0 — https://github.com/buildingsmart-community/Community-Sample-Test-Files
  (see `public/models/README.md`).
