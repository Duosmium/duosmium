const { sassPlugin } = require("esbuild-sass-plugin");
const copyStaticFiles = require("esbuild-copy-static-files");
const { PurgeCSS } = require("purgecss");
const fs = require("fs");

// adapted from https://github.com/GitHubJiKe/esbuild-plugin-purgecss
const purgeCSSPlugin = {
  name: "purgecss",
  setup(build) {
    if (!build.initialOptions.metafile) {
      throw new Error("You should set metafile true to use this plugin.");
    }

    build.onEnd(async (args) => {
      const outputKeys = Object.keys(args.metafile.outputs);
      const genFilter = (postfix) => (k) => k.endsWith(postfix);

      const css = outputKeys.filter(genFilter(".css"));
      const opts = {
        content: ["./src/**/*.njk", "./assets/**/*.js"],
        safelist: {
          greedy: [/^ct-/, /modal/, /^division-/, /collapsing/, /is-focused/],
        },
      };

      const res = await new PurgeCSS().purge({ ...opts, css });

      for (let index = 0; index < res.length; index++) {
        const { file, css } = res[index];
        console.log(`Purged size (${file}): ${css.length}`);
        await fs.promises.writeFile(file, css);
      }
    });
  },
};

require("esbuild")
  .build({
    entryPoints: {
      main: "./assets/index.js",
    },
    bundle: true,
    minify: true,
    outdir: "_site",
    metafile: true,
    legalComments: "linked",
    logLevel: "info",
    watch: process.env.NODE_ENV === "development",
    plugins: [
      sassPlugin(),
      purgeCSSPlugin,
      copyStaticFiles({
        src: "./data",
        dest: "./_site/data",
      }),
      copyStaticFiles({
        src: "./src/images",
        dest: "./_site/images",
      }),
    ],
  })
  .catch(() => process.exit(1));
