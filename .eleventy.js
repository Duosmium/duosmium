module.exports = function (eleventyConfig) {
  // copy files
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/results/manifest.json");
  eleventyConfig.addPassthroughCopy("src/results/pwabuilder-sw.js");
  eleventyConfig.addPassthroughCopy("_redirects");
  if (process.env.ELEVENTY_PRODUCTION) {
    eleventyConfig.addPassthroughCopy("data");
  }

  // workaround for async functions
  const helpers = require("./utils/helpers");
  eleventyConfig.addNunjucksAsyncShortcode("findBgColor", helpers.findBgColor);

  // add serverless plugin
  const { EleventyServerlessBundlerPlugin } = require("@11ty/eleventy");
  const redirectHandler = require("./utils/redirectHandlers.js");
  // on demand builders for tournament results/superscore pages
  eleventyConfig.addPlugin(EleventyServerlessBundlerPlugin, {
    name: "odb",
    functionsDir: "./serverless/",
    redirects: redirectHandler({ odb: true, force: false }),
    copy: ["./utils/", "./cache/", "./data/"],
    excludeDependencies: [
      "color-contrast-calc",
      "extract-colors",
      "chroma-js",
      "simple-git",
    ],
  });
  // dynamic handler for POST requests for sciolyff previewer
  eleventyConfig.addPlugin(EleventyServerlessBundlerPlugin, {
    name: "dynamicpost",
    functionsDir: "./serverless/",
    redirects: redirectHandler({ odb: false, force: true }),
    copy: ["./utils/", "./cache/", "./data/"],
    excludeDependencies: [
      "color-contrast-calc",
      "extract-colors",
      "chroma-js",
      "simple-git",
    ],
  });

  // minify html
  const htmlmin = require("html-minifier-terser");
  eleventyConfig.addTransform("htmlmin", function (content) {
    if (this.outputPath && this.outputPath.endsWith(".html")) {
      const minified = htmlmin.minify(content, {
        // collapseBooleanAttributes: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        // removeComments: true,
        // sortAttributes: true,
        // sortClassName: true,
        // useShortDoctype: true,
        // minifyCSS: true,
        // minifyJS: true,
      });
      return minified;
    } else if (
      this.inputPath.endsWith("template.njk") ||
      this.inputPath.endsWith("superscore.njk") ||
      this.inputPath.endsWith("render.njk")
    ) {
      return content.replace(/\s+/g, " ");
    }

    return content;
  });

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input: "src",
    },
  };
};
