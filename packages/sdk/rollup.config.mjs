import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";

const input = "src/index.ts";

/** @type {import("rollup").RollupOptions[]} */
export default [
  // UMD build (dist/janus.js)
  {
    input,
    output: {
      file: "dist/janus.js",
      format: "umd",
      name: "Janus",
      sourcemap: true,
      exports: "named",
    },
    plugins: [
      typescript({ tsconfig: "./tsconfig.json" }),
      terser({
        format: { comments: false },
      }),
    ],
  },
  // ESM build (dist/janus.esm.js)
  {
    input,
    output: {
      file: "dist/janus.esm.js",
      format: "es",
      sourcemap: true,
    },
    plugins: [
      typescript({ tsconfig: "./tsconfig.json" }),
      terser({
        format: { comments: false },
      }),
    ],
  },
  // Type declarations (dist/index.d.ts)
  {
    input,
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
];
