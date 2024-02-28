const { sassPlugin } = require("esbuild-sass-plugin");
const { PurgeCSS } = require("purgecss");
const fs = require("fs/promises");
const esbuild = require("esbuild");

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
        await fs.writeFile(file, css);
      }
    });
  },
};

const copyAssets = {
  name: "copy-assets",
  setup(build) {
    build.onStart(async () => {
      await fs.cp("./data/results/", "./_site/data/", {
        recursive: true,
      });
      await fs.cp("./src/images/", "./_site/images/", {
        recursive: true,
      });
      await fs.cp("./src/preview/assets/", "./_site/preview/assets/", {
        recursive: true,
        force: false,
      });
      await fs.cp("./src/slides/assets/", "./_site/slides/assets/", {
        recursive: true,
        force: false,
      });
    });
  },
};

const config = {
  entryPoints: {
    main: "./assets/index.js",
    "preview/assets/convert": "./src/preview/assets/convert.js",
    "slides/assets/gen": "./src/slides/assets/gen.ts",
    "slides/assets/printable": "./src/slides/assets/printable.ts",
    "results/eventHisto": "./src/results/tournament/eventHisto.js",
  },
  external: ["canvg", "html2canvas", "dompurify"],
  bundle: true,
  minify: true,
  outdir: "_site",
  metafile: true,
  legalComments: "linked",
  logLevel: "info",
  plugins: [sassPlugin(), purgeCSSPlugin, copyAssets],
};

if (process.env.NODE_ENV === "development") {
  esbuild
    .context(config)
    .then((ctx) => ctx.watch().catch(() => process.exit(1)));
} else {
  esbuild.build(config).catch(() => process.exit(1));
}
