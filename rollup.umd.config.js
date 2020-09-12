import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "umd/OsmdAudioPlayer.min.js",
      format: "umd",
      name: "OsmdAudioPlayer",
    },
  ],
  plugins: [
    typescript({ declaration: false }),
    nodeResolve(),
    commonjs({
      include: "node_modules/**",
    }),
    terser(),
  ],
};
