module.exports = function (eleventyConfig) {
  // copy files
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/results/manifest.json");
  eleventyConfig.addPassthroughCopy("src/results/pwabuilder-sw.js");
  eleventyConfig.addPassthroughCopy("_redirects");
  eleventyConfig.addPassthroughCopy({ "data/": "results/data/" });

  // workaround for async functions
  const helpers = require("./utils/helpers");
  eleventyConfig.addNunjucksAsyncShortcode("findBgColor", helpers.findBgColor);

  // add serverless plugin for on demand builders
  const { EleventyServerlessBundlerPlugin } = require("@11ty/eleventy");
  const redirectHandler = require("./utils/redirectHandlers.js");
  eleventyConfig.addPlugin(EleventyServerlessBundlerPlugin, {
    name: "odb",
    functionsDir: "./serverless/",
    redirects: redirectHandler,
    copy: ["./utils/", "./cache/", "./data/"],
    excludeDependencies: ["color-contrast-calc", "extract-colors", "chroma-js"],
  });

  // minify html during build
  const htmlmin = require("html-minifier-terser");
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (
      process.env.ELEVENTY_PRODUCTION &&
      outputPath &&
      outputPath.endsWith(".html") // don't minify xml
    ) {
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
