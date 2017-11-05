# typescript-workspaces-plugin

Simple plugin that adds support for yarn-like workspaces to typescript

### configuring

In the same `package.json` that specifies the yarn workspaces, add a new key
that specifies the paths of the workspace sources

Example:

```json
{
  "workspaces": ["packages/*"],
  "workspace-sources": {
    "*": ["packages/*/src"]
  }
}
```

