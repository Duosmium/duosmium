module.exports = function (eleventyConfig) {
  // copy files
  eleventyConfig.addPassthroughCopy({ "src/images": "/images" });
  eleventyConfig.addPassthroughCopy({
    "src/results/manifest.json": "/results/manifest.json",
  });
  eleventyConfig.addPassthroughCopy({
    "src/results/pwabuilder-sw.js": "/results/pwabuilder-sw.js",
  });

  // workaround for async functions
  const helpers = require("./utils/helpers");
  eleventyConfig.addNunjucksAsyncShortcode("findBgColor", helpers.findBgColor);

  // add serverless plugin for on demand builders
  const { EleventyServerlessBundlerPlugin } = require("@11ty/eleventy");
  eleventyConfig.addPlugin(EleventyServerlessBundlerPlugin, {
    name: "odb",
    functionsDir: "./serverless/",
    redirects: "netlify-toml",
    copy: ["./utils/"],
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
