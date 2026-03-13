# ClawMorph v0.2.0

First feature expansion release after the initial public MVP.

## Added
- `new <name> --role <role>` to create a fresh OpenClaw-compatible workspace and immediately apply a role pack
- `snapshots` command to inspect saved snapshots
- `rollback --snapshot <id>` to roll back to a specific snapshot
- `--json` output for `list`, `preview`, `apply`, `rollback`, and `snapshots`
- GitHub Actions CI for build + test on Node 20 and 22
- broader E2E verification coverage for idempotency, managed markers, multi-role rollback, snapshot pruning, JSON output, and new-workspace creation

## Improved
- safer demo and release docs
- CLI version now reads from `package.json` instead of a hardcoded string
- release-readiness and automation posture for future UI / wrapper integrations

## Built-in role packs
- researcher
- designer
- lawyer
- product-manager
- founder

## Notes
This release strengthens ClawMorph as a practical CLI for creating and transforming OpenClaw agent workspaces. It is still CLI-first and does not yet include an interactive TUI, web UI, or direct OpenClaw registration flow.
