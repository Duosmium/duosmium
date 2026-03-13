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

module.exports = async () => {
  const sciolyff = (await import("sciolyff")).default;

  const natFiles = fs
    .readdirSync("./data/results")
    .filter((f) => /^\d{4}-\d{2}-\d{2}_nationals_[bBcC]\.yaml$/.test(f))
    .sort();

  const tournaments = [];

  for (const filename of natFiles) {
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
    });
  }

  tournaments.sort((a, b) => b.date.localeCompare(a.date) || b.division.localeCompare(a.division));

  const seasonsSet = new Set(tournaments.map((t) => t.season));
  const seasons = Array.from(seasonsSet).sort((a, b) => b - a);

  // Per-season map: { season: { B: tournamentObj, C: tournamentObj } }
  const seasonMap = {};
  for (const t of tournaments) {
    if (!seasonMap[t.season]) seasonMap[t.season] = { season: t.season };
    if (!seasonMap[t.season][t.division]) {
      seasonMap[t.season][t.division] = t;
    }
  }
  const champsList = seasons.map((s) => seasonMap[s]).filter(Boolean);
  const divisionResults = {
    B: tournaments.filter((t) => t.division === "B"),
    C: tournaments.filter((t) => t.division === "C"),
  };

  // All-time top winners by number of 1st-place nationals finishes
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
        B: 0,
        C: 0,
      };
    }
    winsMap[key].total++;
    winsMap[key][t.division]++;
  }
  const topWinners = Object.values(winsMap)
    .sort((a, b) => b.total - a.total || b.C - a.C || b.B - a.B)
    .slice(0, 20);
  const topWinnersB = Object.values(winsMap)
    .filter((w) => w.B > 0)
    .sort((a, b) => b.B - a.B || b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 20);
  const topWinnersC = Object.values(winsMap)
    .filter((w) => w.C > 0)
    .sort((a, b) => b.C - a.C || b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 20);

  return {
    tournaments,
    seasons,
    champsList,
    divisionResults,
    topWinners,
    topWinnersB,
    topWinnersC,
    totalTournaments: tournaments.length,
    oldestSeason: seasons[seasons.length - 1] || null,
    newestSeason: seasons[0] || null,
  };
};
