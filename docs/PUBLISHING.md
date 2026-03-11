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
