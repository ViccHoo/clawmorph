# ClawMorph Demo Transcript

## Create a new agent workspace

```bash
npm run new -- demo-founder --role founder --root /tmp/clawmorph-agents
```

## List role packs

```bash
npm run list
```

## Preview a role pack on a fixture

```bash
npm run preview -- --path ./test-fixtures/demo-agent --role researcher
```

## Apply a role pack on a fixture copy

```bash
npm run apply -- --path /tmp/demo-agent-copy --role researcher
```

## Roll back the latest apply

```bash
npm run rollback -- --path /tmp/demo-agent-copy
```

## Agent-name based demo

```bash
npm run preview -- --agent leo-demo --role researcher
npm run apply -- --agent leo-demo --role researcher
npm run rollback -- --agent leo-demo
```

This transcript is useful for terminal screenshots, GIF recording, and GitHub documentation.

## List snapshots

```bash
npm run snapshots -- --path /tmp/demo-agent-copy
```

## JSON output for automation

```bash
npm run preview -- --path ./test-fixtures/demo-agent --role researcher --json
```
