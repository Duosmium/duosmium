const fs = require("fs");

function getSeason(date) {
  const seasonStart = new Date(date.getFullYear(), 6, 15);
  return date >= seasonStart ? date.getFullYear() + 1 : date.getFullYear();
}

function fmtDateShort(date) {
  return date.toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toSchoolSlug(school, city, state) {
  const full = city ? `${school} (${city}, ${state})` : `${school} (${state})`;
  return full.replace(/ /g, "_");
}

module.exports = async () => {
  const sciolyff = (await import("sciolyff")).default;

  const csvContent = fs.readFileSync(
    "./data/state-tournaments.csv - Sheet1.csv",
    "utf8"
  );
  const states = csvContent
    .trim()
    .split("\n")
    .map((line) => {
      const i = line.indexOf(",");
      return { name: line.slice(0, i).trim(), abbrev: line.slice(i + 1).trim() };
    });

  const now = new Date();
  const cutoff = new Date(now.getFullYear(), 6, 15);
  const currentSeason = now >= cutoff ? now.getFullYear() + 1 : now.getFullYear();

  const allFiles = fs
    .readdirSync("./data/results")
    .filter((f) => f.endsWith(".yaml"))
    .sort();

  // byState[abbrev][season][div] = tournamentData
  const byState = {};
  const seasonDivSet = new Set();

  for (const state of states) {
    const abbrev = state.abbrev;
    const escaped = abbrev.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `^\\d{4}-\\d{2}-\\d{2}_${escaped}_states_[bBcC]\\.yaml$`
    );
    const stateFiles = allFiles.filter((f) => regex.test(f));
    if (stateFiles.length === 0) continue;

    byState[abbrev] = {};

    for (const filename of stateFiles) {
      let file;
      try {
        file = fs.readFileSync(`./data/results/${filename}`, "utf8");
      } catch {
        continue;
      }
      let interpreter;
      try {
        interpreter = new sciolyff.Interpreter(file);
      } catch {
        continue;
      }

      const t = interpreter.tournament;
      const season = getSeason(t.startDate);
      const fn = filename.replace(/\.yaml$/, "");
      const div = t.division;

      const allTeams = interpreter.teams
        .filter((tm) => !tm.exhibition && tm.rank != null)
        .sort((a, b) => a.rank - b.rank);

      const topResults = allTeams.slice(0, 3).map((tm) => ({
        school: tm.school,
        city: tm.city || "",
        state: tm.state || "",
        points: tm.points,
        teamName: tm.suffix ? `${tm.school} ${tm.suffix}` : tm.school,
        schoolSlug: toSchoolSlug(tm.school, tm.city, tm.state),
      }));

      if (!byState[abbrev][season]) byState[abbrev][season] = {};
      byState[abbrev][season][div] = {
        filename: fn,
        season,
        division: div,
        date: t.startDate.toISOString().split("T")[0],
        dateFmt: fmtDateShort(t.startDate),
        location: t.location || "",
        totalTeams: allTeams.length,
        topResults,
        champion: topResults[0] || null,
      };
      seasonDivSet.add(`${season}-${div}`);
    }
  }

  // Season+division list: most recent first, C before B within same year
  const seasonDivisions = Array.from(seasonDivSet)
    .sort((a, b) => {
      const ai = a.lastIndexOf("-");
      const bi = b.lastIndexOf("-");
      const ay = parseInt(a.slice(0, ai));
      const ad = a.slice(ai + 1);
      const by2 = parseInt(b.slice(0, bi));
      const bd = b.slice(bi + 1);
      return (by2 - ay) || bd.localeCompare(ad);
    })
    .map((key) => {
      const di = key.lastIndexOf("-");
      return { season: parseInt(key.slice(0, di)), division: key.slice(di + 1), key };
    });

  // statePages: top table showing current-season champions
  const statePages = states.map((state) => {
    const abbrev = state.abbrev;
    const seasonData = byState[abbrev]?.[currentSeason];
    return {
      name: state.name,
      abbrev,
      hasData: !!byState[abbrev],
      currentB: seasonData?.B || null,
      currentC: seasonData?.C || null,
    };
  });

  // historyBySeasonDiv: condensed table rows keyed by "YYYY-D"
  const historyBySeasonDiv = {};
  for (const { key, season, division } of seasonDivisions) {
    const rows = [];
    for (const state of states) {
      const td = byState[state.abbrev]?.[season]?.[division];
      if (!td) continue;
      rows.push({ stateAbbrev: state.abbrev, stateName: state.name, ...td });
    }
    historyBySeasonDiv[key] = rows.sort((a, b) =>
      a.stateName.localeCompare(b.stateName)
    );
  }

  // Wide table: all seasons descending as columns
  const seasonInts = new Set();
  for (const abbrev of Object.keys(byState)) {
    for (const s of Object.keys(byState[abbrev])) {
      seasonInts.add(parseInt(s));
    }
  }
  const seasonsList = Array.from(seasonInts).sort((a, b) => b - a);

  const wideTableData = states.map((state) => {
    const abbrev = state.abbrev;
    const seasonMap = {};
    for (const season of seasonsList) {
      const data = byState[abbrev]?.[season];
      if (data) {
        seasonMap[season] = {
          B: data.B?.filename || null,
          C: data.C?.filename || null,
        };
      }
    }
    return { name: state.name, abbrev, hasData: !!byState[abbrev], seasons: seasonMap };
  });

  return {
    states,
    currentSeason,
    statePages,
    seasonDivisions,
    historyBySeasonDiv,
    seasonsList,
    wideTableData,
  };
};
