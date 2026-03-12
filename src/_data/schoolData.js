const fs = require("fs");
const {
  tournamentTitle,
  ordinalize,
  expandStateName,
} = require("../../utils/sharedHelpers");

// for serverless dependency bundling
require("commander");
require("fetch-retry");
require("js-yaml");
require("yup");
require("js-yaml-source-map");

function getSeason(date) {
  const seasonStart = new Date(date.getFullYear(), 6, 15);
  if (date >= seasonStart) {
    return date.getFullYear() + 1;
  }
  return date.getFullYear();
}

function fmtDateShort(date) {
  return date.toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const levelMap = {
  Invitational: "Invitational",
  Regionals: "Regional",
  States: "State",
  Nationals: "National",
};

function acronymize(phrase) {
  return phrase
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .join("");
}

function buildKeywords(t) {
  var parts = [
    t.name,
    t.shortName,
    t.location,
    t.name ? acronymize(t.name) : null,
    t.name ? acronymize(t.name.replace("Tournament", "Science Olympiad")) : null,
    t.level,
    t.level === "Nationals" ? "nats" : null,
    t.level === "Nationals" ? "sont" : null,
    t.level === "Invitational" ? "invite" : null,
    t.level === "Regionals" ? "regs" : null,
    t.state,
    t.state ? expandStateName(t.state) : null,
    t.state === "nCA" ? "norcal" : null,
    t.state === "sCA" ? "socal" : null,
    (t.state === "nCA" || t.state === "sCA") ? "california" : null,
    "div-" + t.division,
    t.year,
    t.startDate ? t.startDate.toISOString().split("T")[0] : null,
    t.startDate
      ? t.startDate.toLocaleDateString(undefined, { month: "long", timeZone: "UTC" })
      : null,
    t.startDate ? t.startDate.getUTCFullYear() : null,
  ];
  var set = new Set();
  parts.forEach(function (v) {
    if (v) {
      v.toString()
        .split(" ")
        .forEach(function (w) { set.add(w.toLowerCase()); });
    }
  });
  return Array.from(set).join(" ");
}

function parseCSVLine(line) {
  var result = [];
  var current = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (inQuotes) {
      if (ch === '"') { inQuotes = false; } else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

function loadEventMap(filepath) {
  var map = {};
  try {
    var lines = fs.readFileSync(filepath, 'utf8').trim().split('\n');
    for (var i = 0; i < lines.length; i++) {
      var parts = parseCSVLine(lines[i]);
      var season = parseInt(parts[0]);
      if (!isNaN(season)) {
        map[season] = parts.slice(1).filter(function(e) { return e.length > 0; });
      }
    }
  } catch (e) {}
  return map;
}

module.exports = async () => {
  const sciolyff = (await import("sciolyff")).default;

  // Load the pre-built school index (maps school name -> [filenames])
  let schoolIndex = {};
  try {
    schoolIndex = JSON.parse(
      fs.readFileSync("./cache/school-index.json", "utf8")
    );
  } catch {
    // index not yet built (first build)
  }

  var eventsByDivB = loadEventMap('./data/events-b.csv');
  var eventsByDivC = loadEventMap('./data/events-c.csv');

  return {
    fromSchoolName: (schoolName) => {
      // schoolName comes from URL with underscores replacing spaces
      const targetSchool = schoolName.replace(/_/g, " ");

      // Look up which tournament files contain this school
      const tournamentFiles = schoolIndex[targetSchool] || [];

      const results = [];
      const divisions = new Set();
      const seasons = new Set();
      var eventResultsMap = {};

      for (const filename of tournamentFiles) {
        let file;
        try {
          file = fs.readFileSync(`./data/results/${filename}.yaml`, "utf8");
        } catch {
          try {
            file = fs.readFileSync(`./data/active/${filename}.yaml`, "utf8");
          } catch {
            continue;
          }
        }

        const interpreter = new sciolyff.Interpreter(file);
        const t = interpreter.tournament;
        const season = getSeason(t.startDate);

        var matchingTeams = [];
        for (const team of interpreter.teams) {
          const fullName = team.city
            ? `${team.school} (${team.city}, ${team.state})`
            : `${team.school} (${team.state})`;
          if (fullName === targetSchool) {
            matchingTeams.push(team);
          }
        }

        if (matchingTeams.length === 0) continue;

        matchingTeams.sort(function(a, b) { return a.rank - b.rank; });

        const displayLevel = levelMap[t.level] || t.level;
        const totalTeams = interpreter.teams.filter(function(tm) { return !tm.exhibition; }).length;
        const kw = buildKeywords(t);

        divisions.add(t.division);
        seasons.add(season);

        for (var mi = 0; mi < matchingTeams.length; mi++) {
          var team = matchingTeams[mi];
          results.push({
            filename,
            tournamentName: t.shortName
              ? `${t.shortName} (Div. ${t.division})`
              : `${tournamentTitle(t)} (Div. ${t.division})`,
            tournamentYear: t.year,
            tournamentDate: t.startDate,
            tournamentDateFmt: fmtDateShort(t.startDate),
            tournamentDateISO: t.startDate.toISOString().split("T")[0],
            season,
            level: displayLevel,
            division: t.division,
            teamName: team.suffix
              ? `${team.school} ${team.suffix}`
              : team.school,
            rank: team.rank,
            rankOrdinal: ordinalize(team.rank),
            points: team.points,
            trophies: t.trophies || 3,
            keywords: kw,
            totalTeams,
          });
        }

        var evData = {};
        for (var ei = 0; ei < interpreter.events.length; ei++) {
          var ev = interpreter.events[ei];
          if (ev.trial) continue;
          var placements = [];
          for (var ti = 0; ti < matchingTeams.length; ti++) {
            var placing = matchingTeams[ti].placingFor(ev);
            if (placing) {
              if (placing.disqualified) {
                placements.push({ s: 'DQ' });
              } else if (placing.didNotParticipate || !placing.participated) {
                placements.push({ s: 'NS' });
              } else if (placing.place != null) {
                placements.push({
                  p: placing.place,
                  o: ordinalize(placing.place)
                });
              } else {
                placements.push(null);
              }
            } else {
              placements.push(null);
            }
          }
          evData[ev.name] = placements;
        }

        var erKey = season + '_' + t.division;
        if (!eventResultsMap[erKey]) {
          eventResultsMap[erKey] = { season: season, division: t.division, tournaments: [] };
        }
        eventResultsMap[erKey].tournaments.push({
          fn: filename,
          name: t.shortName || tournamentTitle(t),
          level: displayLevel,
          date: t.startDate.toISOString().split('T')[0],
          medals: t.medals || 3,
          trophies: t.trophies || 3,
          teams: matchingTeams.map(function(tm) {
            return {
              name: tm.suffix ? tm.school + ' ' + tm.suffix : tm.school,
              rank: tm.rank,
              rankOrd: ordinalize(tm.rank),
              pts: tm.points
            };
          }),
          events: evData
        });
      }

      // Sort by date descending
      results.sort((a, b) => b.tournamentDate - a.tournamentDate);

      // Parse school name into parts
      const match = targetSchool.match(/^(.+?)\s*\((.+)\)$/);
      let school = targetSchool;
      let city = "";
      let state = "";
      if (match) {
        school = match[1].trim();
        const loc = match[2].trim();
        const locParts = loc.split(", ");
        if (locParts.length >= 2) {
          city = locParts.slice(0, -1).join(", ");
          state = locParts[locParts.length - 1];
        } else {
          state = loc;
        }
      }

      const sortedDivisions = Array.from(divisions).sort();
      const sortedSeasons = Array.from(seasons).sort((a, b) => a - b);
      const oldestSeason = sortedSeasons.length > 0 ? sortedSeasons[0] : null;

      // Unique seasons list for filter (descending)
      const seasonsList = Array.from(seasons).sort((a, b) => b - a);

      function compressYears(years) {
        if (years.length === 0) return '';
        var parts = [];
        var i = 0;
        while (i < years.length) {
          var start = years[i];
          var end = start;
          while (i + 1 < years.length && years[i + 1] === end + 1) {
            i++;
            end = years[i];
          }
          if (end - start >= 2) {
            parts.push(start + '-' + end);
          } else {
            for (var y = start; y <= end; y++) parts.push('' + y);
          }
          i++;
        }
        return parts.join(', ');
      }

      var bestPlacements = {};
      var bestLevels = ["Invitational", "Regional", "State", "National"];
      for (var li = 0; li < bestLevels.length; li++) {
        var lv = bestLevels[li];
        var best = null;
        var bestSeasons = [];
        for (var ri = 0; ri < results.length; ri++) {
          if (results[ri].level === lv) {
            if (best === null || results[ri].rank < best) {
              best = results[ri].rank;
              bestSeasons = [results[ri].season];
            } else if (results[ri].rank === best) {
              if (bestSeasons.indexOf(results[ri].season) === -1) {
                bestSeasons.push(results[ri].season);
              }
            }
          }
        }
        if (best !== null) {
          bestSeasons.sort(function(a, b) { return a - b; });
          bestPlacements[lv] = { rank: ordinalize(best), seasons: bestSeasons, seasonsDisplay: compressYears(bestSeasons) };
        }
      }

      var stateFull = state ? expandStateName(state) : '';

      var levelSort = { 'National': 0, 'State': 1, 'Regional': 2, 'Invitational': 3 };
      for (var erk in eventResultsMap) {
        var er = eventResultsMap[erk];
        if (er.division === 'C') { er.eventList = eventsByDivC[er.season] || []; }
        else if (er.division === 'B') { er.eventList = eventsByDivB[er.season] || []; }
        else { er.eventList = []; }
        er.tournaments.sort(function(a, b) {
          var la = levelSort[a.level] !== undefined ? levelSort[a.level] : 4;
          var lb = levelSort[b.level] !== undefined ? levelSort[b.level] : 4;
          if (la !== lb) return la - lb;
          return a.date.localeCompare(b.date);
        });
      }

      const uniqueFilenames = new Set(results.map(r => r.filename));

      return {
        schoolName: targetSchool,
        school,
        city,
        state,
        stateFull,
        divisions: sortedDivisions,
        oldestSeason,
        totalTournaments: uniqueFilenames.size,
        seasonsList,
        bestPlacements,
        eventResults: eventResultsMap,
        results,
      };
    },
  };
};
