# typescript-workspace-plugin

Simple plugin that adds support for yarn-like workspaces to typescript

### configuring

Add the plugin to all your `tsconfig.json` files of the individual packages:

```json
{
  "plugins": [{"name": "typescript-workspace-plugin"}]
}
```

Then at the toplevel package.json alongside yarn's "workspaces" entry, add a "workspace-sources"
entry:

```json
{
  "workspaces": ["packages/*"],
  "workspace-sources": {
    "*": ["packages/*/src"]
  }
}
```

The field works exatly like the "paths" field in tsconfig.json but it only affects the language
service of the individual projects, pointing them to the package sources. Restores proper
"go to definition / type" functionality and similar.

#### Workspace TypeScript must be used.

Once you install and configure the plugin, make sure to switch to the **workspace** version of typescript installed with your project! Otherwise, the plugin will not be loaded.

From cmd+shift+p (ctrl+shift+p), type in:

* typescript version
* use workspace

If it still doesn't work after that, a cmd+shift+p -> Reload afterwards might help.


#### Benefits

The packages still have their individual tsconfig.json

They can have separate repos and be cloned and developed completely independent of the master
workspace like e.g. prosemirror: https://github.com/ProseMirror/prosemirror

When cloned independently, "go to definition" and "find references" functionality will 
behave as if the dependencies are standard node modules (definition files available only)
