const yaml = require("js-yaml");
const fs = require("fs/promises");

module.exports = async () => {
  // don't run on serverless requests
  if (process.env.ELEVENTY_SERVERLESS) return;

  try {
    const fileContents = await fs.readFile("./data/recents.yaml", "utf8");
    const doc = yaml.load(fileContents);
    return doc;
  } catch (e) {
    console.error(e);
  }
};
