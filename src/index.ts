import * as ts_module from 'typescript/lib/tsserverlibrary';
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
    let patchedOptions = false;
    let log = (content: any) => {
      info.project.projectService.logger.info('typescript-workspace-plugin-log ' + content);
    };

    log('---- WORKING ----');

    log('loaded for ' + info.project.getProjectName());

    let rootPath = path.dirname(info.project.getProjectName());
    let initialRootPath = rootPath;

    let rootPkgJson = null;
    do {
      let jsonFile = path.join(rootPath, 'package.json');
      log('Trying ' + jsonFile);
      if (fs.existsSync(jsonFile)) {
        rootPkgJson = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        let sources = rootPkgJson['workspace-sources'];
        if (sources) {
          log('Found workspace: ' + JSON.stringify(sources));
          let pathOptions = ({
            baseUrl: rootPath,
            paths: {},
            rootDir: undefined
          } as any) as ts_module.CompilerOptions;

          for (let key of Object.keys(sources)) {
            if (!pathOptions.paths[key]) pathOptions.paths[key] = [];
            for (let srcPath of sources[key]) {
              let resolvedPath = path.resolve(rootPath, srcPath);
              if (pathOptions.paths[key].indexOf(resolvedPath) < 0) {
                pathOptions.paths[key].unshift(resolvedPath);
              }
            }
          }

          let oldCOptions = info.project.getCompilerOptions;

          info.project.getCompilerOptions = function() {
            let oldOptions = oldCOptions.call(this);
            if (!patchedOptions) {
              let oldPaths: ts_module.MapLike<string[]> =
              Object.keys(oldOptions.paths || {}).reduce((prev, curr) => {
                let keys = oldOptions.paths[curr].map((p: string) =>
                  path.resolve(initialRootPath, oldOptions.baseUrl, p)
                );
                return Object.assign({}, prev, { [curr]: keys });
              }, {}) || {};
              let newPaths = pathOptions.paths;
              log('Got old options:' + JSON.stringify(oldOptions));
              oldOptions = Object.assign(oldOptions, pathOptions, {
                paths: Object.assign({}, oldPaths, newPaths)
              });
              info.project.setCompilerOptions(oldOptions);
              log('Got new options:' + JSON.stringify(oldOptions));
              patchedOptions = true;
            }
            return oldOptions;
          };

          let replacer = (s: string) => s;
          let remainingGood = (_s: string) => true;
          Object.keys(sources).forEach(p => {
            let pathVal = sources[p];
            let replacement = '"' + p.replace('*', '$1') + '"';
            let searchment = new RegExp('[\'"]' + pathVal[0].replace('*', '(.+)') + '[\'"]');
            let modulePattern = new RegExp(pathVal[0].replace('*', '(.+)') + '/');
            let oldReplacer = replacer;
            let oldTester = remainingGood;
            replacer = (fileImport) => {
              let res = oldReplacer(fileImport);
              let next = res.replace(searchment, replacement);
              //log(`${res} -> ${next} ;; via ${searchment} -> ${replacement}`);
              return next;
            };
            remainingGood = s => {
              let old = oldTester(s) && !modulePattern.test(s);
              return old;
            };
          });

          let cfap = info.languageService.getCodeFixesAtPosition;

          info.languageService.getCodeFixesAtPosition = function(
            _fileName: string
          ): ReadonlyArray<ts.CodeFixAction> {
            let results = cfap.apply(this, arguments) as ReadonlyArray<ts.CodeFixAction>;
            results.forEach(res => {
              if (!res.description.match(/import.+from module/i)) return res;
              res.description = replacer(res.description);
              res.changes.forEach(c => {
                c.textChanges.forEach(t => {
                  t.newText = replacer(t.newText);
                });
              });
            });
            return results.filter(res => remainingGood(res.description));
          };

          break;
        }
        rootPkgJson = null;
      } else {
        log('File does not exist: ' + jsonFile);
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
