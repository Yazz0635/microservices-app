# Microservices App (GitOps & DevSecOps Project)

Two Node.js microservices:

- `api/` - Items API with `/health`, `/ready`, `/api/items`, `/api/load` (CPU burner for autoscaling demo) and `/metrics` (Prometheus).
- `frontend/` - serves the UI and proxies `/api/*` to the API.

Run locally: `docker compose up --build` then open http://localhost:8080
Run tests: `cd api && npm test` and `cd frontend && npm test`
