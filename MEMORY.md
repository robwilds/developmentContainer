# Session Memory

## Project
Development container (Ubuntu 26.04) with Node 24, Java 17, Python 3.14, Angular CLI, Maven, Nginx, Yeoman.

## Dashboard (`dashboard/`)

### Files
| File | Purpose |
|------|---------|
| `server.js` | Express + Socket.IO backend on port 3000. Proxies Docker commands, streams shell output, manages compose YAML. |
| `public/index.html` | Dark-themed dashboard UI with status, controls, quick actions, terminal, and volume manager. |
| `public/style.css` | Terminal theme, GitHub-dark color scheme. |
| `public/app.js` | Client logic: terminal with command history, auto-scroll, volume management, directory browser. |

### Features
- **Container control**: Start/Stop/Restart via `docker compose` commands
- **Terminal**: Executes commands inside container via `docker exec` with nvm sourced. Arrow-up history, auto-scroll with ↓ button when scrolled up.
- **Quick Actions**: One-click buttons for `nvm`, `node`, `npm`, `java`, `python3`, `mvn`, `ng`, `yo`
- **Volume Manager**: Add/remove bind mounts by editing `docker-compose.yml` via text manipulation (preserves comments), restarts services on change with rollback on failure.
- **Directory Browser**: Live filesystem browser for selecting host paths to mount.

### Session 2 Changes
- **`app.js` buf scoping bug fix**: `buf` moved from local scope in `executeCommand()` to module level so socket event handlers share the same buffer. Added container-status check before executing commands.
- **Volume Manager**: Added volume CRUD (add/remove bind mounts), directory browser via `GET /api/browse`, YAML text manipulation preserves comments, rollback on restart failure.
- **Terminal auto-scroll**: `max-height` changed from `500px` to `60vh`. Smart auto-scroll tracks whether user has scrolled up; shows a ↓ button to jump back to latest output. Scrollbar 10px, hover-visible.
- **`start.sh`**: Root-level script that runs `docker compose up -d` then `node server.js`.
- **`server.js` auto-install**: `ensureDeps()` checks for `node_modules` on startup and runs `npm install --cache /tmp/npm-cache` if missing.
- **`.gitignore`**: Added `dashboard/node_modules/`.
- **`MEMORY.md`**: Created for session context.

### Known Issues / Notes
- `npm cache` had root-owned files — workaround: `--cache /tmp/npm-cache`
- Container named `dev` (from docker-compose.yml `container_name: dev`)
- nvm sourced via `source /usr/local/nvm/nvm.sh 2>/dev/null` before each command
- Volume entries in docker-compose.yml are modified via line-based text manipulation (line number tracking), not YAML parser, to preserve comments
- Backup of docker-compose.yml is restored if container restart fails after volume change
