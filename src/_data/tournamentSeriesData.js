const fs = require("fs");
const { ordinalize } = require("../../utils/sharedHelpers");

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
  const full = city
    ? `${school} (${city}, ${state})`
    : `${school} (${state})`;
  return full.replace(/ /g, "_");
}

async function buildSeriesData(slug, displayName, subtitle, files, sciolyff) {
  const tournaments = [];

  for (const filename of files) {
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

    const allTeams = interpreter.teams
      .filter((tm) => !tm.exhibition && tm.rank != null)
      .sort((a, b) => a.rank - b.rank);

    // Compute per-team event medal counts (places 1–6)
    const teamMedals = {};
    for (const tm of allTeams) {
      const counts = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, total: 0 };
      for (const ev of interpreter.events) {
        if (ev.trial) continue;
        const pl = ev.placingFor(tm);
        if (pl && pl.participated && !pl.disqualified && pl.place != null && pl.place <= 6) {
          counts[`p${pl.place}`]++;
          counts.total++;
        }
      }
      teamMedals[tm.rank] = counts;
    }

    const teams = allTeams.map((tm) => ({
      rank: tm.rank,
      rankOrdinal: ordinalize(tm.rank),
      school: tm.school,
      city: tm.city || "",
      state: tm.state || "",
      suffix: tm.suffix || "",
      points: tm.points,
      teamName: tm.suffix ? `${tm.school} ${tm.suffix}` : tm.school,
      schoolSlug: toSchoolSlug(tm.school, tm.city, tm.state),
      eventMedals: teamMedals[tm.rank] || { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, total: 0 },
    }));

    tournaments.push({
      filename: fn,
      year: t.year,
      season,
      division: t.division,
      location: t.location || "",
      locationState: t.state || "",
      date: t.startDate.toISOString().split("T")[0],
      dateFmt: fmtDateShort(t.startDate),
      trophies: t.trophies || 3,
      medals: t.medals || 6,
      totalTeams: allTeams.length,
      champion: teams[0] || null,
      topResults: teams.slice(0, 6),
      teams,
      resultsUrl: `/results/${fn}/`,
    });
  }

  if (tournaments.length === 0) return null;

  tournaments.sort((a, b) => b.date.localeCompare(a.date) || b.division.localeCompare(a.division));

  const seasonsSet = new Set(tournaments.map((t) => t.season));
  const seasons = Array.from(seasonsSet).sort((a, b) => b - a);

  const divisionsSet = new Set(tournaments.map((t) => t.division));
  const divisions = Array.from(divisionsSet).sort();

  // Per-season map: { season: { B: t, C: t } }
  const seasonMap = {};
  for (const t of tournaments) {
    if (!seasonMap[t.season]) seasonMap[t.season] = { season: t.season };
    if (!seasonMap[t.season][t.division]) {
      seasonMap[t.season][t.division] = t;
    }
  }
  const champsList = seasons.map((s) => seasonMap[s]).filter(Boolean);

  // Latest tournament per division (for infobox at the top)
  const latestByDiv = {};
  for (const t of tournaments) {
    if (!latestByDiv[t.division]) {
      latestByDiv[t.division] = t;
    }
  }
  const latestTournaments = divisions.map((div) => latestByDiv[div]).filter(Boolean);

  // Per-division results
  const divisionResults = {};
  for (const div of divisions) {
    divisionResults[div] = tournaments.filter((t) => t.division === div);
  }

  // All-time top winners per division
  const winsMap = {};
  for (const t of tournaments) {
    if (!t.champion) continue;
    const c = t.champion;
    const key = toSchoolSlug(c.school, c.city, c.state);
    if (!winsMap[key]) {
      winsMap[key] = {
        name: c.school,
        city: c.city,
        state: c.state,
        slug: key,
        total: 0,
      };
      for (const div of divisions) winsMap[key][div] = 0;
    }
    winsMap[key].total++;
    if (winsMap[key][t.division] !== undefined) {
      winsMap[key][t.division]++;
    }
  }
  const topWinnersByDivision = {};
  for (const div of divisions) {
    topWinnersByDivision[div] = Object.values(winsMap)
      .filter((w) => w[div] > 0)
      .sort((a, b) => b[div] - a[div] || b.total - a.total || a.name.localeCompare(b.name))
      .slice(0, 20);
  }

  const seasonRange =
    seasons.length > 1
      ? `${seasons[seasons.length - 1]}–${seasons[0]}`
      : `${seasons[0]}`;

  // Build a dense OG description from the most recent tournament(s)
  let pageDescription;
  if (latestTournaments.length === 0) {
    pageDescription = `All-time results for the ${displayName}.`;
  } else {
    const divParts = latestTournaments.map((lt) => {
      const podium = lt.topResults
        .slice(0, 3)
        .map((t, i) => `${i + 1}. ${t.school} (${t.points})`)
        .join(", ");
      const prefix = latestTournaments.length > 1 ? `Div ${lt.division}: ` : "";
      return `${prefix}${podium}`;
    });
    const season = latestTournaments[0].season;
    const teams = latestTournaments[0].totalTeams;
    pageDescription = `${season} · ${divParts.join(" · ")} · ${teams} teams`;
  }

  return {
    slug,
    pageTitle: `${displayName} | Duosmium Results`,
    pageDescription,
    title: displayName,
    subtitle,
    seasonRange,
    totalTournaments: tournaments.length,
    divisions,
    latestTournaments,
    divisionResults,
    topWinnersByDivision,
    champsList,
    tournaments,
    seasons,
    oldestSeason: seasons[seasons.length - 1] || null,
    newestSeason: seasons[0] || null,
  };
}

module.exports = async () => {
  const sciolyff = (await import("sciolyff")).default;

  // Read state-tournaments.csv (Name,abbreviation — no header row)
  const csvPath = "./data/state-tournaments.csv - Sheet1.csv";
  const csvContent = fs.readFileSync(csvPath, "utf8");
  const states = csvContent
    .trim()
    .split("\n")
    .map((line) => {
      const commaIdx = line.indexOf(",");
      return {
        name: line.slice(0, commaIdx).trim(),
        abbrev: line.slice(commaIdx + 1).trim(),
      };
    });

  const allFiles = fs
    .readdirSync("./data/results")
    .filter((f) => f.endsWith(".yaml"))
    .sort();

  const seriesList = [];

  // Nationals series
  const natFiles = allFiles.filter((f) =>
    /^\d{4}-\d{2}-\d{2}_nationals_[bBcC]\.yaml$/.test(f)
  );
  const natSeries = await buildSeriesData(
    "nationals",
    "Science Olympiad Nationals",
    "National Championship Tournament",
    natFiles,
    sciolyff
  );
  if (natSeries) seriesList.push(natSeries);

  // State series — one per state abbreviation in the CSV
  for (const state of states) {
    const abbrev = state.abbrev;
    // Escape any regex special chars in abbreviation (handles nCA, sCA, etc.)
    const escaped = abbrev.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `^\\d{4}-\\d{2}-\\d{2}_${escaped}_states_[bBcC]\\.yaml$`
    );
    const stateFiles = allFiles.filter((f) => regex.test(f));
    if (stateFiles.length === 0) continue;

    const stateSeries = await buildSeriesData(
      abbrev,
      `${state.name} Science Olympiad State Tournament`,
      `${state.name} State Tournament`,
      stateFiles,
      sciolyff
    );
    if (stateSeries) seriesList.push(stateSeries);
  }

  return { seriesList };
};
