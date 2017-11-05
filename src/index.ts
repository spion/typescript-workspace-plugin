import * as ts_module from '../node_modules/typescript/lib/tsserverlibrary';
import * as fs from 'fs';
import * as path from 'path';

// Settings for the plugin section in tsconfig.json

/*
interface Settings {

}
*/

function init(_modules: { typescript: typeof ts_module }) {
  //const _ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    let log = (content: any) => {
      info.project.projectService.logger.info('typescript-workspace-plugin ' + content);
    };

    log('loaded for ' + info.project.getProjectRootPath());

    let rootPath = info.project.getProjectRootPath();

    let rootPkgJson = null;
    do {
      let jsonFile = path.join(rootPath, 'package.json');
      log('Trying ' + jsonFile);
      if (fs.existsSync(jsonFile)) {
        rootPkgJson = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        let sources = rootPkgJson['workspace-sources'];
        if (sources) {
          log('Found workspace: ' + JSON.stringify(sources));
          let newCompilerOptions = info.project.getCompilerOptions()

          let optionsDirty = false;
          if (newCompilerOptions.baseUrl == null) {
            newCompilerOptions.baseUrl = '.'
            optionsDirty = true;
          }
          if (newCompilerOptions.paths == null) {
            newCompilerOptions.paths = {}
          }
          for (let key of Object.keys(sources)) {
            if (!newCompilerOptions.paths[key]) newCompilerOptions.paths[key] = []
            for (let srcPath of sources[key]) {
              let resolvedPath = path.resolve(rootPath, srcPath)
              if (newCompilerOptions.paths[key].indexOf(resolvedPath) < 0) {
                newCompilerOptions.paths[key].unshift(resolvedPath)
                optionsDirty = true;
              }
            }
          }
          if (optionsDirty) {
            log("New options: " + JSON.stringify(newCompilerOptions.paths))
            info.project.setCompilerOptions(newCompilerOptions)
          }
          break;
        }
        rootPkgJson = null;
      }

      let newRoot = path.resolve(rootPath, '..');
      if (newRoot == rootPath) break;
      rootPath = newRoot;
    } while (true);

    return info.languageService;
  }

  return { create };
}

export = init;
