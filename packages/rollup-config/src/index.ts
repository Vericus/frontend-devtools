import fs from "fs";
import path from "path";
import findAndReadPackageJSON from "find-and-read-package-json";
import Package from "@lerna/package";
import camelCase from "camelcase";
import { transformSync, loadOptions } from "@babel/core";
import * as cjsModulesTransform from "@babel/plugin-transform-modules-commonjs";
import * as umdModulesTransform from "@babel/plugin-transform-modules-umd";
import nodeResolve from "rollup-plugin-node-resolve";
import babelPlugin from "rollup-plugin-babel";
import { terser as minify } from "rollup-plugin-terser";
import { eslint } from "rollup-plugin-eslint";
// eslint-disable-next-line
import { RollupOptions, ModuleFormat } from "rollup";

export interface GlobalOption {
  workspaceRoot: string;
  globals: object;
}

export interface RollupExtraOptions {
  extraGlobals: object;
  input: string;
  // eslint-disable-next-line
  extraPlugins: any[];
}

function rollup({
  globals = {},
  workspaceRoot
}: GlobalOption): (option: RollupExtraOptions) => Promise<RollupOptions[]> {
  return async ({
    extraGlobals = {},
    input = "./src/index.ts",
    extraPlugins = []
  }): Promise<RollupOptions[]> => {
    const { json, file } = await findAndReadPackageJSON(".");
    const pkg: Package = new Package(json, path.dirname(file), workspaceRoot);
    const watch = process.env.ROLLUP_WATCH
      ? {
          chokidar: true,
          include: ["./src/**", "./lib/**"],
          exclude: ["./node_modules/**"]
        }
      : undefined;
    const extensions = [".js", ".jsx", ".ts", ".tsx"];
    const deps = Object.keys({
      ...pkg.dependencies,
      ...pkg.peerDependencies
    }).reduce((acc, k): object => ({ ...acc, [k]: camelCase(k) }), {});

    globals = {
      fs: "fs",
      path: "path",
      ...globals,
      ...extraGlobals,
      ...deps
    };

    function external(id: string): boolean {
      return Object.prototype.hasOwnProperty.call(globals, id);
    }

    function outputFile(format: string): string {
      switch (format) {
        case "esm":
          return json.module;
        case "umd":
          return json.umd;
        case "umdMin":
          return json.umdMin;
        case "cjs":
        default:
          return json.main;
      }
    }

    function fromSource(format: ModuleFormat): RollupOptions {
      return {
        input,
        watch,
        external,
        output: {
          file: outputFile(format),
          format,
          sourcemap: true
        },
        plugins: [
          eslint({ throwOnError: true }),
          nodeResolve({
            preferBuiltins: true,
            extensions
          }),
          babelPlugin({
            extensions,
            runtimeHelpers: true,
            rootMode: "upward",
            include: ["src/**/*"],
            exclude: ["node_modules/**", "lib/**"] // only transpile our source code
          }),
          ...extraPlugins
        ]
      };
    }

    function fromESM(toFormat: string): RollupOptions {
      return {
        input: outputFile("esm"),
        watch,
        output: {
          file: outputFile(toFormat),
          format: "esm",
          sourcemap: false
        },
        // The UMD bundle expects `this` to refer to the global object. By default
        // Rollup replaces `this` with `undefined`, but this default behavior can
        // be overridden with the `context` option.
        context: "this",
        plugins: [
          nodeResolve({
            preferBuiltins: true,
            extensions
          }),
          {
            // eslint-disable-next-line
            transform(source: string, id: string) {
              loadOptions();
              const output = transformSync(source, {
                inputSourceMap: JSON.parse(
                  fs.readFileSync(id + ".map").toString()
                ),
                sourceMaps: true,
                plugins: [
                  [
                    toFormat === "umd"
                      ? umdModulesTransform
                      : cjsModulesTransform,
                    {
                      loose: true,
                      allowTopLevelThis: true
                    }
                  ]
                ]
              });
              if (output) {
                // There doesn't seem to be any way to get Rollup to emit a source map
                // that goes all the way back to the source file (rather than just to
                // the bundle.esm.js intermediate file), so we pass sourcemap:false in
                // the output options above, and manually write the CJS and UMD source
                // maps here.
                fs.writeFileSync(
                  outputFile(toFormat) + ".map",
                  JSON.stringify(output.map)
                );

                return {
                  code: output.code
                };
              }
            }
          },
          ...extraPlugins
        ]
      };
    }

    return [
      fromSource("esm"),
      fromESM("cjs"),
      fromESM("umd"),
      {
        input: outputFile("umd"),
        watch,
        output: {
          file: outputFile("umdMin"),
          format: "esm"
        },
        context: "this",
        plugins: [
          nodeResolve({
            preferBuiltins: true,
            extensions
          }),
          minify({
            mangle: {
              toplevel: true
            },
            compress: {
              // eslint-disable-next-line
              global_defs: {
                "@process.env.NODE_ENV": JSON.stringify("production")
              }
            }
          }),
          ...extraPlugins
        ]
      }
    ];
  };
}

export { rollup };
