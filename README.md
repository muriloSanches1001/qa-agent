# QA Agent

An AI-driven QA agent that tests web applications through the browser or the API, builds reusable test cases and
delivers **PASS / FAIL** reports with evidence. It works on Windows, macOS and Linux, runs on top of the AI coding
CLI of your choice, and is not tied to any project: name, environments, user profiles and business context are
defined during setup.

## Requirements

- [Node.js](https://nodejs.org) 18 or newer (LTS recommended), with `npx`
- At least one supported AI CLI, installed and signed in (the menu only lists the ones it finds):

  | AI | Command | Models offered | Reasoning |
  |---|---|---|---|
  | [Antigravity CLI](https://antigravity.google) | `agy` | Gemini Flash and Gemini Pro (latest of each, read from `agy models`) | max |
  | [Codex](https://github.com/openai/codex) | `codex` | GPT-6 Luna, GPT-6 Sol, GPT-5.6 Terra (only those available to your account) | medium |
  | [Claude Code](https://claude.com/claude-code) | `claude` | Opus 5.5, Sonnet 5.5 | medium |
- Google Chrome **or** room to download Playwright's Chromium

No `npm install` needed: the scripts use only Node's built-in modules.

## Installation

```bash
git clone https://github.com/muriloSanches1001/qa-agent.git
cd qa-agent
```

| OS | Setup | Run tests |
|---|---|---|
| Windows | `setup.bat` (double-click) | `qa.bat` |
| macOS / Linux | `./setup.sh` | `./qa.sh` |
| Any | `npm run setup` | `npm run qa` |

> macOS/Linux: if you get "permission denied", run `chmod +x setup.sh qa.sh` once.

### What the setup does

1. Detects the operating system and checks Node, `npx` and which AI CLIs are installed.
2. Asks for the **project** (name and description) and creates `context/PROJECT.md` for you to fill in with the
   business context (profiles, modules, rules, how to authenticate against the API).
3. Asks for the **user profiles**: what the admin and the standard user are called in this project
   (e.g. "Franchisor" and "Franchisee") and what changes between them.
4. Asks for the **environments** (as many as you need): name, front-end URL, API URL, notes, and the username and
   password for each profile, with the option to reuse the previous environment's credentials.
5. Sets up the agent's browser (Playwright MCP, see below) and optionally downloads Chromium.
6. Generates one folder per environment under `workspaces/`.

Running the setup again lets you reconfigure (current answers become the defaults), add an environment, or redo
only the machine setup.

## Usage

Run `qa.bat` / `./qa.sh`. The menu (arrow keys + Enter) asks for:

1. **AI** and **model** (your last choice comes preselected)
2. **Environment**
3. **Mode**: browser (`/qa-browser`), API (`/qa-api`) or re-run existing cases (`/qa-run`)
4. **Input**: a file from the `files/` folder or context typed on the spot (for `/qa-run`, the list of cases)

It then launches the chosen AI inside the environment folder with the command already filled in. If the input was
a file, it is deleted from `files/` once the agent exits without errors.

### Browser

The agent drives the browser through the [Playwright MCP](https://github.com/microsoft/playwright-mcp) server,
named `qa-playwright`. How it is wired depends on the AI:

| AI | How the browser is provided |
|---|---|
| Antigravity | Registered once by the setup (`agy mcp add`) |
| Codex | Injected on every run (`-c mcp_servers...`) |
| Claude Code | Injected on every run (`--mcp-config`) |

Codex and Claude Code therefore need no setup step, and their global configuration is left untouched.

### Permissions

> The agent runs with **all permissions bypassed** (`--dangerously-skip-permissions` for Antigravity and Claude Code,
> `--dangerously-bypass-approvals-and-sandbox` for Codex), so it never asks for confirmation. The rules in `QA.md`
> tell it to write only inside the environment folder and not to install anything, but those are instructions, not
> enforcement. Use it on test machines and test environments.

## Project layout

```
qa-agent/
├── setup.bat / setup.sh   → setup (runs scripts/setup.mjs)
├── qa.bat / qa.sh         → test menu (runs scripts/run.mjs)
├── scripts/               → Node logic
├── templates/             → templates for QA.md, the skills and the project context
├── files/                 → drop the specs you want tested here              (git-ignored)
├── context/PROJECT.md     → project context, created by the setup            (git-ignored)
├── qa.config.json         → project, environments and credentials            (git-ignored)
└── workspaces/<env>/      → generated: QA.md, CONTEXT.md, skills, cases, reports (git-ignored)
```

**Everything you generate stays on your machine**: config, credentials, context, cases and reports are all
git-ignored. The repository only ships the scripts and templates, so updating is just a `git pull`, with no risk
of conflicts with your own files.

Each environment's `QA.md`, `CONTEXT.md` and skills are **regenerated on every run** from `templates/`,
`qa.config.json` and `context/PROJECT.md`. To change how the agent behaves, edit the templates (applies to every
environment). `cases/` and `reports/` are never overwritten.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Agent reports "MCP qa-playwright não configurado" | Run the setup → "Só configurar a máquina". On Antigravity, check with `agy mcp list` |
| Browser does not open / asks for installation | Run the setup and choose "Chromium do Playwright" |
| An AI is missing from the menu | Install its CLI, make sure the command (`agy`, `codex` or `claude`) is on your PATH, and reopen the terminal |

## License

[MIT](LICENSE) © Murilo Oliveira Sanches
