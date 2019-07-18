// eslint-disable-next-line
import { rollup } from "@vericus/rollup-config";
import path from "path";

const rollupBaseConfig = rollup({
  workspaceRoot: path.resolve(__dirname, "../.."),
  globals: {}
});

export default rollupBaseConfig({});
