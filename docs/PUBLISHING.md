# Publishing ClawMorph

## 1. Create GitHub repository
Recommended repository:
- `clawmorph`

Recommended description:
- Transform OpenClaw agents into specialized professional roles with preview, apply, and rollback.

Recommended topics:
- openclaw
- agent
- cli
- typescript
- ai
- persona
- workflow
- developer-tools

## 2. Push the current repo
```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

## 3. Add repository metadata on GitHub
- Description
- Topics
- Social preview image (optional)
- README screenshots / GIF

## 4. Optional npm publishing prep
Before publishing to npm, set these fields in `package.json`:
- repository
- homepage
- bugs
- author

Then publish:
```bash
npm login
npm publish
```

## 5. Minimum release assets
- README first screen
- one terminal screenshot
- one short GIF or asciinema-style recording
- a short launch post

## 6. Suggested launch angle
ClawMorph is a lightweight CLI for OpenClaw that works at the workspace level, not just the prompt level. It previews changes, applies role packs safely, snapshots before mutation, and rolls back cleanly.

## 7. Suggested launch blurb
Short version:

> Built **ClawMorph** — a CLI that turns one OpenClaw agent into many roles.
> 
> Not just prompt switching: it previews workspace changes, snapshots before apply, and rolls back cleanly.
> 
> Roles included today: researcher, designer, lawyer, product manager, and founder.

Longer version:

> Built **ClawMorph**, a lightweight CLI for transforming OpenClaw agents into role-specific workspaces.
> 
> Instead of manually editing prompt files, you can preview changes, apply a role pack safely, snapshot the previous state, and roll back when needed.
> 
> Current built-in packs include researcher, designer, lawyer, product manager, and founder.
> 
> The interesting part is that it works at the **workspace layer**, not just as a prompt template switcher.
