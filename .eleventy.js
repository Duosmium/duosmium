module.exports = function (eleventyConfig) {
  // copy files
  eleventyConfig.addPassthroughCopy({ "src/images": "/images" });

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
