import Project from "@lerna/project";
import builtins from "builtin-modules";
import path from "path";
import babelPlugin from "rollup-plugin-babel";
import nodeResolve from "rollup-plugin-node-resolve";

const isExternal = pkg => {
  const deps = Object.keys(
    // eslint-disable-next-line prefer-object-spread
    Object.assign(
      {},
      pkg.optionalDependencies || {},
      pkg.peerDependencies || {},
      pkg.dependencies || {}
    )
  );

  return id => {
    if (id.startsWith(".")) {
      return { result: false, reason: "starts-with-dot" };
    }

    if (builtins.includes(id)) {
      return { result: true, reason: "builtin" };
    }

    if (deps.some(dep => dep === id || id.startsWith(`${dep}/`))) {
      return { result: true, reason: "configured-dep" };
    }

    return { result: false, reason: "fallthrough" };
  };
};

const binSafeName = ({ name, scope }) =>
  scope ? name.substring(scope.length + 1) : name;

const perPkg = (_, pkg) => {
  const safeName = binSafeName(pkg.resolved);
  const isPkgExternal = isExternal(pkg);
  const external = id => {
    const { result } = isPkgExternal(id);
    return result;
  };

  return {
    input: path.resolve(pkg.location, "./src/index.ts"),
    output: [
      {
        format: "cjs",
        file: path.resolve(pkg.location, `./lib/${safeName}.cjs.js`),
        exports: "named",
        sourcemap: true
      },
      {
        format: "es",
        file: path.resolve(pkg.location, `./lib/${safeName}.esm.js`),
        sourcemap: true
      }
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: true,
        extensions: ["js", "jsx", "ts", "tsx"]
      }),
      babelPlugin({
        extensions: ["js", "jsx", "ts", "tsx"]
      })
    ],
    external
  };
};

const config = async () => {
  const result = [];
  const project = new Project(__dirname);
  // eslint-disable-next-line no-restricted-syntax
  for (const pkg of await project.getPackages()) {
    const { scripts } = pkg;
    // eslint-disable-next-line no-prototype-builtins
    if (scripts.hasOwnProperty("build")) {
      const pkgConf = perPkg(project, pkg);
      if (Array.isArray(pkgConf)) {
        result.push(...pkgConf);
      } else {
        result.push(pkgConf);
      }
    }
  }
  return result;
};

export default config();
