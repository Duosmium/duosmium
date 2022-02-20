const fs = require("fs/promises");

const generateInterpreters = async () => {
  const sciolyff = (await import("sciolyff")).default;

  const files = (await fs.readdir("./data")).filter((filename) =>
    /^[0-9].*/.test(filename)
  );
  const data = await Promise.all(
    files.map(async (filename) => {
      const file = await fs.readFile(`./data/${filename}`, "utf8");
      return {
        filename: filename.split(".")[0],
        file,
      };
    })
  );
  return data.reduce((acc, { filename, file }) => {
    acc[filename] = new sciolyff.Interpreter(file);
    return acc;
  }, {});
};

const csvEvents = (interpreters) =>
  Object.values(interpreters)
    .flatMap((i) => i.events.map((e) => e.name))
    .filter((e, i, s) => s.indexOf(e) === i)
    .sort()
    .join("\n");

const csvSchools = (interpreters) =>
  Object.values(interpreters)
    .flatMap((i) => i.teams.map((t) => [t.school, t.city ?? "", t.state]))
    .filter(
      (t, i, s) =>
        s.findIndex((e) => e[0] === t[0] && e[1] === t[1] && e[2] === t[2]) ===
        i
    )
    .sort(
      (a, b) =>
        a[0].localeCompare(b[0]) ||
        a[1].localeCompare(b[1]) ||
        a[2].localeCompare(b[2])
    )
    .map(([school, city, state]) => `${school},${city},${state}`)
    .join("\n");

module.exports = async () => {
  const interpreters = await generateInterpreters();

  return {
    interpreters,
    csvEvents: csvEvents(interpreters),
    csvSchools: csvSchools(interpreters),
  };
};
