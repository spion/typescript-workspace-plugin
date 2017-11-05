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
              if (newCompilerOptions.paths[key].indexOf(srcPath) < 0) {
                newCompilerOptions.paths[key].unshift(srcPath)
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

    // Set up decorator
    const proxy = Object.create(null) as ts.LanguageService;
    const oldLS = info.languageService;
    for (const k in oldLS) {
      (proxy as any)[k] = function() {
        return (oldLS as any)[k].apply(oldLS, arguments);
      };
    }

    proxy.getDefinitionAtPosition = (file: string, position: number) => {
      let defs = oldLS.getDefinitionAtPosition(file, position);

      for (let def of defs) {
        for (let pkName of [] as string[])
          if (def.fileName.indexOf(pkName) === 0) {
            try {
              let options = info.project.getCompilerOptions();
              if (options.paths == null) {
                options.paths = {};
              }
              options.baseUrl = './';
              options.paths[pkName.split('/').slice(-1)[0]] = [pkName + '/src'];
              info.project.setCompilerOptions(options);
              return oldLS.getDefinitionAtPosition(file, position);
            } catch (e) {
              log(pkName + ' Found error: ' + e.message);
              log(pkName + ' ' + e.stack.split('\n').join(';;;'));
            }
          }
      }

      return defs;
    };

    return proxy;
  }

  return { create };
}

export = init;
