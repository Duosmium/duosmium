const schoolDataFactory = require("./schoolData");

function toSchoolName(slug) {
  return (slug || "").replace(/_/g, " ");
}

function toSchoolSlug(name) {
  return (name || "").replace(/ /g, "_");
}

function formatLevelOrder(level) {
  const order = {
    National: 0,
    State: 1,
    Regional: 2,
    Invitational: 3,
  };
  return order[level] !== undefined ? order[level] : 4;
}

function stripDivisionSuffix(name) {
  if (!name) return name;
  return name.replace(/\s*\(Div\.\s*[A-Z]\)\s*$/i, "");
}

function summarizeSchoolRows(rowsByFile) {
  const summaries = {};
  for (const filename of Object.keys(rowsByFile)) {
    const rows = rowsByFile[filename];
    const first = rows[0];
    const bestRank = rows.reduce(
      (acc, row) => Math.min(acc, row.rank || Number.MAX_SAFE_INTEGER),
      Number.MAX_SAFE_INTEGER,
    );

    summaries[filename] = {
      filename,
      tournamentName: first.tournamentName,
      tournamentYear: first.tournamentYear,
      tournamentDateFmt: first.tournamentDateFmt,
      tournamentDateISO: first.tournamentDateISO,
      season: first.season,
      level: first.level,
      division: first.division,
      keywords: first.keywords,
      totalTeams: first.totalTeams,
      teams: rows.map((row) => ({
        teamName: row.teamName,
        rank: row.rank,
        rankOrdinal: row.rankOrdinal,
        points: row.points,
        trophies: row.trophies,
      })),
      bestRank: bestRank === Number.MAX_SAFE_INTEGER ? null : bestRank,
    };
  }
  return summaries;
}

function byTournament(results) {
  const byFile = {};
  for (const row of results) {
    if (!byFile[row.filename]) byFile[row.filename] = [];
    byFile[row.filename].push(row);
  }
  return summarizeSchoolRows(byFile);
}

function flattenEventResults(eventResults) {
  const flat = {};
  for (const key of Object.keys(eventResults || {})) {
    const block = eventResults[key];
    const eventList = block.eventList || [];
    for (const tournament of block.tournaments || []) {
      flat[tournament.fn] = {
        filename: tournament.fn,
        season: block.season,
        division: block.division,
        name: tournament.name,
        level: tournament.level,
        date: tournament.date,
        medals: tournament.medals || 3,
        trophies: tournament.trophies || 3,
        teams: tournament.teams || [],
        events: tournament.events || {},
        eventMeta: tournament.eventMeta || {},
        eventList,
      };
    }
  }
  return flat;
}

function eventDisplayName(name, meta) {
  if (!meta) return name;
  if (meta.trial) return `${name} (Trial)`;
  if (meta.trialed) return `${name} (Trialed)`;
  return name;
}

function buildTournamentRows(leftRows, rightRows) {
  const filenames = new Set([...Object.keys(leftRows), ...Object.keys(rightRows)]);
  const rows = [];

  for (const filename of filenames) {
    const left = leftRows[filename] || null;
    const right = rightRows[filename] || null;
    const base = left || right;
    const leftBest = left ? left.bestRank : null;
    const rightBest = right ? right.bestRank : null;

    let winner = "none";
    if (leftBest != null && rightBest != null) {
      if (leftBest < rightBest) winner = "left";
      else if (rightBest < leftBest) winner = "right";
      else winner = "tie";
    }

    rows.push({
      filename,
      tournamentName: base.tournamentName,
      tournamentNameShort: stripDivisionSuffix(base.tournamentName),
      tournamentYear: base.tournamentYear,
      tournamentDateFmt: base.tournamentDateFmt,
      tournamentDateISO: base.tournamentDateISO,
      season: base.season,
      level: base.level,
      division: base.division,
      left,
      right,
      shared: !!(left && right),
      winner,
    });
  }

  rows.sort((a, b) => {
    if (a.tournamentDateISO !== b.tournamentDateISO) {
      return a.tournamentDateISO < b.tournamentDateISO ? 1 : -1;
    }
    const levelDiff = formatLevelOrder(a.level) - formatLevelOrder(b.level);
    if (levelDiff !== 0) return levelDiff;
    return a.tournamentName.localeCompare(b.tournamentName);
  });

  return rows;
}

function buildEventRows(leftEvents, rightEvents) {
  const filenames = new Set([...Object.keys(leftEvents), ...Object.keys(rightEvents)]);
  const rows = [];

  for (const filename of filenames) {
    const left = leftEvents[filename] || null;
    const right = rightEvents[filename] || null;
    const base = left || right;
    const eventNameSet = new Set();

    for (const eventName of base.eventList || []) eventNameSet.add(eventName);
    if (left) {
      for (const eventName of Object.keys(left.events || {})) eventNameSet.add(eventName);
    }
    if (right) {
      for (const eventName of Object.keys(right.events || {})) eventNameSet.add(eventName);
    }

    const eventNames = Array.from(eventNameSet);
    const eventMeta = {};
    const eventDisplayNames = {};
    for (const eventName of eventNames) {
      const meta = (left && left.eventMeta && left.eventMeta[eventName])
        || (right && right.eventMeta && right.eventMeta[eventName])
        || null;
      eventMeta[eventName] = meta;
      eventDisplayNames[eventName] = eventDisplayName(eventName, meta);
    }

    rows.push({
      filename,
      tournamentName: base.name,
      level: base.level,
      date: base.date,
      season: base.season,
      division: base.division,
      medals: base.medals || 3,
      left,
      right,
      shared: !!(left && right),
      eventNames,
      eventMeta,
      eventDisplayNames,
    });
  }

  rows.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.tournamentName.localeCompare(b.tournamentName);
  });

  return rows;
}

module.exports = async () => {
  const schoolData = await schoolDataFactory();

  return {
    compare: (school1Slug, school2Slug) => {
      const school1Name = toSchoolName(school1Slug);
      const school2Name = toSchoolName(school2Slug);

      const leftSchool = schoolData.fromSchoolName(school1Slug || "");
      const rightSchool = schoolData.fromSchoolName(school2Slug || "");

      const leftRows = byTournament(leftSchool.results || []);
      const rightRows = byTournament(rightSchool.results || []);

      const tournamentRows = buildTournamentRows(leftRows, rightRows);
      const sharedTournamentRows = tournamentRows.filter((row) => row.shared);

      let leftWins = 0;
      let rightWins = 0;
      let ties = 0;
      for (const row of sharedTournamentRows) {
        if (row.winner === "left") leftWins++;
        else if (row.winner === "right") rightWins++;
        else if (row.winner === "tie") ties++;
      }

      const leftEvents = flattenEventResults(leftSchool.eventResults || {});
      const rightEvents = flattenEventResults(rightSchool.eventResults || {});
      const eventRows = buildEventRows(leftEvents, rightEvents);

      return {
        school1Name,
        school2Name,
        school1Slug: toSchoolSlug(school1Name),
        school2Slug: toSchoolSlug(school2Name),
        sameSchool: school1Name.toLowerCase() === school2Name.toLowerCase(),
        leftSchool,
        rightSchool,
        tournamentRows,
        eventRows,
        summary: {
          sharedTournaments: sharedTournamentRows.length,
          allTournaments: tournamentRows.length,
          leftWins,
          rightWins,
          ties,
        },
      };
    },
  };
};
