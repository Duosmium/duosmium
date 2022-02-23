const yaml = require("js-yaml");
const fs = require("fs/promises");

module.exports = async () => {
  // don't run on serverless requests
  if (process.env.ELEVENTY_SERVERLESS) return;

  try {
    const fileContents = await fs.readFile("./data/upcoming.yaml", "utf8");
    const doc = yaml.load(fileContents);
    return doc
      .filter(({ date }) => new Date() < date)
      .sort((a, b) => a.date - b.date)
      .reduce((acc, curr) => {
        const date = curr.date.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        });
        if (acc?.[date]) {
          acc[date].push(curr);
        } else {
          acc[date] = [curr];
        }
        return acc;
      }, {});
  } catch (e) {
    console.error(e);
  }
};
