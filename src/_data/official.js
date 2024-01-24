const yaml = require("js-yaml");
const fs = require("fs/promises");
const { escapeCsv } = require("../../utils/helpers");

const getActiveTournaments = async () => {
  const sciolyff = (await import("sciolyff")).default;
  try {
    const files = (await fs.readdir("./data/active")).filter((filename) =>
      /^[0-9].*/.test(filename),
    );
    const tournaments = await Promise.all(
      files.map(async (filename) => {
        const file = await fs.readFile(`./data/active/${filename}`, "utf8");
        return [filename.split(".")[0], new sciolyff.Interpreter(file)];
      }),
    );
    return [tournaments.map((t) => t[0]), tournaments];
  } catch (e) {
    // likely a no such directory error if data/active is empty
    return [[], []];
  }
};

const teamsCsv = (interpreter) =>
  interpreter.teams
    .map((team) => [team.number, team.school, team.suffix].map(escapeCsv))
    .sort((a, b) => a[0] - b[0])
    .map((team) => team.join(","))
    .join("\n");

module.exports = async () => {
  // don't run on serverless requests
  // if (process.env.ELEVENTY_SERVERLESS) return;

  try {
    const fileContents = await fs.readFile("./data/official.yaml", "utf8");
    const doc = yaml.load(fileContents);

    if (!(doc instanceof Array)) return { all: [], placeholder: [] };

    const hasResults = (await fs.readdir("./data/results")).flatMap(
      (filename) => (/^[0-9].*/.test(filename) ? [filename.split(".")[0]] : []),
    );

    const [activeNames, activeTournaments] = await getActiveTournaments();

    const placeholder = activeNames
      .filter((tournament) => !hasResults.includes(tournament))
      .concat(
        doc.filter(
          (tournament) =>
            !hasResults.includes(tournament) &&
            !activeNames.includes(tournament),
        ),
      );

    return {
      all: doc,
      placeholder: placeholder,
      active: activeTournaments,
      teamsCsv,
    };
  } catch (e) {
    console.error(e);
  }
};
