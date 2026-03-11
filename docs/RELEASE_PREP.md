# ClawMorph Release Prep

## GitHub repository
- `clawmorph`

## Suggested GitHub description
- Transform OpenClaw agents into specialized professional roles with preview, apply, and rollback.

## Suggested GitHub topics
- openclaw
- agent
- cli
- typescript
- ai
- persona
- prompt-engineering
- workflow
- developer-tools

## Suggested first public release checklist
- [x] Core MVP works: list / preview / apply / rollback
- [x] Snapshot and rollback are verified
- [x] README rewritten for GitHub readers
- [x] MIT license added
- [x] npm-friendly package metadata improved
- [x] Safe real-agent demo validated on copied workspace
- [ ] Add one terminal screenshot or GIF to README
- [ ] Create clean initial public commit history (or squash)
- [x] Push to GitHub repository
- [x] Add repository description and topics
- [ ] Optionally publish to npm

## Suggested first commit message
- `feat: release ClawMorph MVP for OpenClaw role packs`

## Suggested demo commands for GitHub
```bash
npm install
npm run build
npm run list
npm run preview -- --path ./test-fixtures/demo-agent --role researcher
npm run apply -- --path ./test-fixtures/demo-agent --role researcher
npm run rollback -- --path ./test-fixtures/demo-agent
```

## Suggested launch post angle
ClawMorph is a lightweight CLI that transforms OpenClaw agents into role-specific workspaces with preview, apply, snapshots, and rollback. It is designed for practical agent iteration, not just prompt swapping.
