module.exports = async () => {
  // don't run on serverless requests
  if (process.env.ELEVENTY_SERVERLESS) return;

  // const fs = require("fs/promises");
  // const yaml = require("js-yaml");

  const fetch = require("node-fetch");

  try {
    const fetchCsv = await fetch(
      "https://docs.google.com/spreadsheets/d/18aCLoPsaj7srxZs3GiHSW99ErBHVaoX32u3EouhfNNw/export?format=csv&gid=0",
    );
    const doc = (await fetchCsv.text())
      .split("\n")
      .map((row) => row.split(","))
      .flatMap((row, i, arr) => {
        if (i === 0) return [];
        return row.reduce((acc, curr, i) => {
          let key = arr[0][i].toLowerCase();
          let value = curr;
          if (key === "date") value = new Date(curr);
          if (key === "official") value = curr === "TRUE";
          if (key === "website") key = "link";
          acc[key] = value;
          return acc;
        }, {});
      })
      .map((t) => ({
        ...t,
        name: `${t.competition} (Div. ${t.division}, ${t.state})`,
      }));

    // const fileContents = await fs.readFile("./data/upcoming.yaml", "utf8");
    // const doc = yaml.load(fileContents);

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
