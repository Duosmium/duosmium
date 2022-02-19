const yaml = require("js-yaml");
const fs = require("fs/promises");

module.exports = async () => {
  try {
    const fileContents = await fs.readFile("./data/official.yaml", "utf8");
    const doc = yaml.load(fileContents);

    const hasResults = (await fs.readdir("./data")).flatMap((filename) =>
      /^[0-9].*/.test(filename) ? [filename.split(".")[0]] : []
    );
    return {
      all: doc,
      placeholder: doc.filter((tournament) => !hasResults.includes(tournament)),
    };
  } catch (e) {
    console.error(e);
  }
};
