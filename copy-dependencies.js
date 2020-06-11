const fs = require("fs");
const path = require("path");

/**
 * Given a script-relative path, returns an absolute path
 * @param {string} p 
 */
function rel(p) {
    return path.resolve(__dirname, p);
}

/**
 * Recursively creates the directories in the path.
 * @param {string} dir The directory path to create
 */
function mkdirRecursiveSync(dir) {
    if (!path.isAbsolute(dir)) {
        throw new Error("dir must be absolute path");
    }
    const mkdir = (parent, child) => {
        if (!parent) {
            return child;
        }
        const dir = path.join(parent, child);
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            fs.mkdirSync(dir);
        }
        return dir;
    };
    return dir.split(path.sep).reduce(mkdir, null);
}

function copyDependency(sourceFile, targetFile) {
    console.log(`Copying ${sourceFile} -> ${targetFile}`);
    var targetDir = path.dirname(targetFile);
    mkdirRecursiveSync(rel(targetDir));
    fs.copyFileSync(rel(sourceFile), rel(targetFile));
}

const { config } = require("./wwwroot/dependencies");
const sourcePath = "./node_modules";
const targetPath = "./wwwroot/lib";

copyDependency(
    path.join(sourcePath, "requirejs/require.js"),
    path.join(targetPath, "requirejs/require.js")
);

for (var key of Object.keys(config.paths)) {
    copyDependency(
        path.join(sourcePath, config.paths[key] + ".js"),
        path.join(targetPath, config.paths[key] + ".js")
    );
}