# Schedule Tracker SaaS

This project now has a split frontend and backend structure:

- `client/` contains the HTML, CSS, and browser JavaScript app
- `server/` contains the Express API, auth flow, MongoDB models, and middleware

## Local setup

1. Install backend dependencies:
   - `cd server`
   - `npm install`
2. Create a `.env` file inside `server/` using `server/.env.example`
3. Add your MongoDB Atlas connection string and JWT secret
4. Start the API:
   - `npm run dev`
5. Serve the frontend from `client/`
   - Example with VS Code Live Server: open `client/index.html`
   - Or any static server that serves `client/`
6. If your frontend runs on a different origin, update `CLIENT_ORIGIN` in `server/.env`
7. If your API runs somewhere other than `http://localhost:5000/api`, update `client/config.js`

## Auth and persistence

- Signup: `POST /api/auth/signup`
- Login: `POST /api/auth/login`
- Current user: `GET /api/auth/me`
- Events: authenticated routes under `GET/POST/PATCH/DELETE /api/events`
- Month import sync: `PUT /api/events/month/:month`

The frontend currently stores the JWT in `localStorage` for simplicity. In production, you can swap this to secure HTTP-only cookies if desired.
