# MERN Project

## Structure

```text
mern-project/
  client/              React + Vite frontend
    src/
      api/             API client helpers
      auth/            Session helpers
      components/      Reusable UI/features
      pages/           Route-level screens
      styles/          App stylesheets
  server/              Express + MongoDB backend
  .gitignore           Ignored local/build files
  package.json         Project-level helper scripts
```

## Scripts

```bash
npm run client
npm run server
npm run build
npm run seed
```

## Notes

- Frontend source lives in `client/src` and shared CSS lives in `client/assets/css`.
- Backend routes, models, middleware, Swagger, and seed data live in `server`.
- `client/dist`, `node_modules`, and `.env` are ignored.
