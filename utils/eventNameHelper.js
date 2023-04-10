const slugify = require("@sindresorhus/slugify");

function cleanEventName(event) {
  return slugify(event, { customReplacements: [["'", ""]] }).replace(
    /[^a-z0-9-]+/g,
    ""
  );
}

module.exports = {
  cleanEventName,
};
