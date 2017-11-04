import * as ts_module from "../node_modules/typescript/lib/tsserverlibrary";

// Settings for the plugin section in tsconfig.json

/*
interface Settings {

}
*/

function init(_modules: { typescript: typeof ts_module }) {
    // const ts = _modules.typescript;

    function create(info: ts.server.PluginCreateInfo) {

        info.project.projectService.logger.info("tslint-language-service loaded");
        //let config: Settings = info.config;

        // Set up decorator
        const proxy = Object.create(null) as ts.LanguageService;
        const oldLS = info.languageService;
        for (const k in oldLS) {
            (<any>proxy)[k] = function () {
                return (<any>oldLS)[k].apply(oldLS, arguments);
            }
        }

        // proxy.getProgram().
        // proxy.getTypeDefinitionAtPosition('a',1)[0]
        // proxy.getDefinitionAtPosition('a',1) - should be easy enough
        // proxy.findReferences - hard
        return proxy;
    }

    return { create };
}

export = init;
