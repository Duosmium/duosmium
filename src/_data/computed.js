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

const getParticipatedTournaments = (school, interpreters) => {
  return Object.entries(interpreters)
    .map(([tournament, interpreter]) => {
      const teams = interpreter.teams.filter(
        (t) => fullSchoolName(t) === school
      );
      if (teams.length === 0) return [];

      return [
        tournament,
        teams
          .map((t) => t.rank)
          .sort()
          .map(ordinalize),
      ];
    })
    .reduce((acc, [tournament, ranks]) => {
      if (!tournament || !ranks) return acc;
      acc[tournament] = ranks;
      return acc;
    }, {});
};

const schoolsByLetter = (interpreters) =>
  Object.values(interpreters)
    // get all schools and stringify them
    .flatMap((i) => i.teams.map(fullSchoolName))
    // deduplicate
    .filter((e, i, s) => s.indexOf(e) === i)
    // sort alphabetically
    .sort((a, b) =>
      a
        .replaceAll(/[^A-Za-z0-9]/g, "")
        .localeCompare(b.replaceAll(/[^A-Za-z0-9]/g, ""))
    )
    // convert to letter: school: tournament: rank[]
    .reduce((acc, school) => {
      if (!acc?.[school[0].toLowerCase()]) {
        acc[school[0].toLowerCase()] = {};
      }
      acc[school[0].toLowerCase()][school] = getParticipatedTournaments(
        school,
        interpreters
      );

      return acc;
    }, {});

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
  const schools = schoolsByLetter(interpreters);

  return {
    interpreters,
    schools,
    csvEvents: csvEvents(interpreters),
    csvSchools: csvSchools(interpreters),
  };
};
