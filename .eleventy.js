module.exports = function (eleventyConfig) {
  // copy files
  eleventyConfig.addPassthroughCopy({ "src/images": "/images" });
  eleventyConfig.addPassthroughCopy({
    "src/results/manifest.json": "/results/manifest.json",
  });
  eleventyConfig.addPassthroughCopy({
    "src/results/pwabuilder-sw.js": "/results/pwabuilder-sw.js",
  });

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
