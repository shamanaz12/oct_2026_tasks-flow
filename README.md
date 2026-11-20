# TaskFlow – Collaborative Project Management (Trello / Asana style)

**Stack** – Client: React + Vite + Tailwind CSS + React Router + Axios + Socket.io-client + @hello-pangea/dnd.
Server: Node.js + Express + MongoDB (Mongoose) + Socket.io + JWT + bcryptjs.

```
/client   React app (http://localhost:5173)
/server   REST API + Socket.io (http://localhost:5000)
```

## Quick start

```bash
# 1. install
npm install                # root (only installs `concurrently`)
cd client && npm install && cd ..
cd server && npm install && cd ..
#   (or: npm run install:all)

# 2. environment
cp server/.env.example server/.env     # edit JWT_SECRET / MONGO_URI
cp client/.env.example client/.env

# 3. (optional) seed demo data into MongoDB
npm run seed        # users: ali@ / sara@ / omar@ / ayesha@demo.com, password: password123

# 4. run both apps
npm run dev
```
Or run separately: `cd server && npm run dev` and `cd client && npm run dev`.

Open http://localhost:5173 – you land on the **login page**, then the dashboard.

### Demo mode (no backend / no MongoDB)
Click **“Try demo”** on the login page. If the API is unreachable, logging in also falls back to demo mode automatically.
Demo mode runs a fake API in the browser (localStorage) with 4 users, 2 projects and 8 tasks. Real-time sockets are only active with the real backend.

## Features
Auth (JWT, protected routes, profile/avatar) · Dashboard (search, progress, members, due date, create project with members by email) ·
Kanban board (4 default lists, drag & drop, add/rename/delete lists, add tasks) · Task modal (rich-text description, assignee, priority, due date, labels, checklist, link attachments, threaded comments, activity log) ·
Real-time via Socket.io (create/move/comment sync, notifications bell, online green dots) · Responsive teal + gold (“Lagoon”) UI with sidebar.

## API
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET/PUT /api/auth/me` |
| Projects | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`, `POST /:id/members`, `DELETE /:id/members/:userId`, `POST /:id/lists`, `PUT/DELETE /:id/lists/:listId` |
| Tasks | `POST /api/tasks`, `GET /api/tasks/mine`, `GET/PUT/DELETE /api/tasks/:id`, `PUT /:id/assign`, `PUT /:id/move`, `POST /:id/comments`, `DELETE /:id/comments/:cid`, `POST /:id/checklist`, `PUT/DELETE /:id/checklist/:itemId` |
| Notifications | `GET /api/notifications`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all` |

**Socket events** (server → client): `taskCreated`, `taskMoved`, `taskUpdated`, `taskDeleted`, `newComment`, `projectUpdated`, `notification`, `presence`.
Client → server: `joinProject`, `leaveProject`.
