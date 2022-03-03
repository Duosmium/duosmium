const fs = require("fs/promises");

const generateInterpreters = async () => {
  const sciolyff = (await import("sciolyff")).default;

  const files = (await fs.readdir("./data")).filter((filename) =>
    /^[0-9].*/.test(filename)
  );
  const interpreters = (
    await Promise.all(
      files.map(async (filename) => {
        const file = await fs.readFile(`./data/${filename}`, "utf8");
        return [filename.split(".")[0], new sciolyff.Interpreter(file)];
      })
    )
  ).sort(
    (a, b) =>
      b[1].tournament.startDate - a[1].tournament.startDate ||
      a[1].tournament.state?.localeCompare(b[1].tournament.state) ||
      a[1].tournament.location?.localeCompare(b[1].tournament.location) ||
      a[1].tournament.division?.localeCompare(b[1].tournament.division)
  );
  return {
    interpreters,
    indices: interpreters.reduce((acc, [f, _], i) => {
      acc[f] = i;
      return acc;
    }, {}),
  };
};

const fullSchoolName = (t) =>
  [t.school, t.city ? `(${t.city}, ${t.state})` : `(${t.state})`].join(" ");

// from https://stackoverflow.com/questions/13627308/
const ordinalize = (i) => {
  var j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
};

const schoolsByLetter = (interpreters) => {
  const ranks = new Map();
  interpreters.forEach(([tournament, interpreter]) => {
    interpreter.teams.forEach((t) => {
      const school = fullSchoolName(t);
      const rank = t.rank;
      if (!ranks.has(school)) {
        ranks.set(school, {});
      }
      if (!ranks.get(school)[tournament]) {
        ranks.get(school)[tournament] = [];
      }
      ranks.get(school)[tournament].push(rank);
    });
  });
  const schools = Array.from(ranks.keys()).sort((a, b) =>
    a
      .replaceAll(/[^A-Za-z0-9]/g, "")
      .localeCompare(b.replaceAll(/[^A-Za-z0-9]/g, ""))
  );

  return (
    schools
      // convert to letter: school: tournament: rank[]
      .reduce((acc, school) => {
        const cleaned = school.replaceAll(/[^A-Za-z0-9]/g, "");
        if (!acc?.[cleaned[0].toLowerCase()]) {
          acc[cleaned[0].toLowerCase()] = {};
        }
        const ordinalized = {};
        Object.entries(ranks.get(school)).forEach(
          ([tournament, schoolRanks]) => {
            ordinalized[tournament] = schoolRanks
              .sort((a, b) => a - b)
              .map(ordinalize);
          }
        );
        acc[cleaned[0].toLowerCase()][school] = ordinalized;

        return acc;
      }, {})
  );
};

const csvEvents = (interpreters) =>
  [
    ...interpreters.reduce((acc, [_, i]) => {
      i.events.forEach((e) => {
        acc.add(e.name);
      });
      return acc;
    }, new Set()),
  ]
    .sort((a, b) => a.localeCompare(b))
    .join("\n");

const csvSchools = (interpreters) =>
  [
    ...interpreters.reduce((acc, [_, i]) => {
      i.events.forEach((t) => {
        acc.add(`"${t.school}","${t.city}","${t.state}"`);
      });
      return acc;
    }, new Set()),
  ]
    .sort((a, b) => a.localeCompare(b))
    .join("\n");

module.exports = async () => {
  // don't run on serverless requests
  if (process.env.ELEVENTY_SERVERLESS) return;

  const { interpreters, indices } = await generateInterpreters();
  const schools = schoolsByLetter(interpreters);

  const counts = interpreters.reduce(
    (acc, [_, interpreter]) => {
      acc.total++;
      switch (interpreter.tournament.level) {
        case "Nationals":
          acc.nationals++;
          break;
        case "States":
          acc.states++;
          break;
        case "Regionals":
          acc.regionals++;
          break;
        case "Invitational":
          acc.invitational++;
          break;
      }
      return acc;
    },
    { nationals: 0, states: 0, regionals: 0, invitational: 0, total: 0 }
  );

  return {
    interpreters,
    indices,
    schools,
    csvEvents: csvEvents(interpreters),
    csvSchools: csvSchools(interpreters),
    counts,
  };
};
