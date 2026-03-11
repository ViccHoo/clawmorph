# ClawMorph

> **Turn one agent into many roles — with preview, snapshot, and rollback.**

Transform any OpenClaw agent into a role-specific workspace in one command.

ClawMorph lets you turn the same agent into a **researcher, designer, lawyer, product manager, or founder** without hand-editing prompt files.

Unlike simple prompt switchers, ClawMorph works at the **workspace layer**:

- preview changes before writing anything
- apply a role pack safely
- snapshot the previous state automatically
- roll back cleanly when you want to undo

That makes it useful for real agent iteration, not just prompt swapping.

---

## Why people star it

- **Role switching without manual file surgery**
- **Safer than ad-hoc prompt edits** because every apply is previewable and reversible
- **Works on real OpenClaw workspaces** instead of isolated prompt snippets
- **Easy to demo**: list, preview, apply, rollback

---

## Quick demo

```bash
npm install
npm run build
npm run list
npm run preview -- --path ./test-fixtures/demo-agent --role researcher
npm run demo:apply
npm run demo
```

`npm run demo:apply` uses a temporary copy of the demo fixture so you can test apply + rollback safely without mutating the checked-in files.

---

## Why it is different

| Capability | Prompt template | ClawMorph |
|---|---:|---:|
| Switch role instructions | ✅ | ✅ |
| Preview changes before write | ❌ | ✅ |
| Update workspace files | ❌ | ✅ |
| Snapshot before mutation | ❌ | ✅ |
| Roll back to previous state | ❌ | ✅ |

---

## Before vs after

### Before
A generic OpenClaw agent workspace might only contain a light identity file and a few loose notes.

### After
ClawMorph can apply a role pack that:
- updates `IDENTITY.md`
- creates or updates `SOUL.md`
- creates or updates `TOOLS.md`
- appends role-specific entries to `MEMORY.md`
- stores a snapshot in `.clawmorph/snapshots/...`

---

## Built-in role packs

- `researcher` — evidence gathering, source comparison, synthesis
- `designer` — UX reasoning, flows, visual direction
- `lawyer` — careful wording, constraints, risk analysis
- `product-manager` — scope, priorities, outcomes, trade-offs
- `founder` — strategy, momentum, business judgment

---

## Commands

### List available role packs

```bash
npm run list
```

### Preview changes for a role pack

```bash
npm run preview -- --path ./test-fixtures/demo-agent --role researcher
```

Or resolve a named agent conservatively:

```bash
npm run preview -- --agent leo --role researcher
```

### Apply + rollback safely on a temporary copy

```bash
npm run demo:apply
```

This runs `apply` and `rollback` against a temporary copy of `test-fixtures/demo-agent`.

### Apply a role pack directly to a workspace copy

```bash
npm run apply -- --path /tmp/leo-demo --role researcher
```

### Roll back the latest apply

```bash
npm run rollback -- --path /tmp/leo-demo
npm run demo
```

---

## How it works

ClawMorph follows a simple flow:

1. **Resolve target workspace**
   - explicit `--path`
   - or a best-effort `--agent` lookup
2. **Load a role pack** from `role-packs/*.yaml`
3. **Scan the workspace** for key OpenClaw files
4. **Preview planned changes**
5. **Create a snapshot** before writing files
6. **Apply file updates**
7. **Rollback** if needed

Current MVP focuses on these files:
- `IDENTITY.md`
- `SOUL.md`
- `TOOLS.md`
- `MEMORY.md`

ClawMorph intentionally does **not** mutate `USER.md` in this version.

---

## Safe real-agent demo

If you want to test against a real OpenClaw agent without mutating the original workspace, copy that agent directory first and run ClawMorph against the copy.

Example:

```bash
cp -R ~/.openclaw/workspace/agents/leo /tmp/leo-demo
npm run preview -- --path /tmp/leo-demo --role researcher
npm run apply -- --path /tmp/leo-demo --role researcher
npm run rollback -- --path /tmp/leo-demo
```

This keeps your real agent untouched while still demonstrating the workflow.

## Cross-platform note

ClawMorph's core CLI is Node.js-based and is intended to work across macOS, Ubuntu/Linux, and Windows.

- Core commands (`list`, `preview`, `apply`, `rollback`) are implemented in TypeScript/Node and are platform-friendly.
- Demo entrypoints now use Node-based scripts instead of Unix-only shell helpers.
- For the smoothest first run on Windows, prefer the explicit `--path` mode before testing `--agent`.

---

## Current scope

### Included in this MVP
- role-pack listing
- workspace scanning
- preview planning
- apply with snapshots
- rollback of latest snapshot

### Not included yet
- web UI
- plugin packaging
- OpenClaw skill wrapper
- role marketplace / registry
- team features
- cloud sync

---

## Roadmap

### Next likely improvements
- better README visuals / GIF demo
- improved real-agent path resolution
- cleaner generated sections and formatting
- import/export role packs
- publishable npm package workflow
- optional OpenClaw skill wrapper around the CLI

---

## Development

```bash
npm install
npm run build
npm run list
npm run preview -- --path ./test-fixtures/demo-agent --role researcher
```

---

## License

MIT
