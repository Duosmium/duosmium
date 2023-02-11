const fs = require("fs");
const sharedHelpers = require("./sharedHelpers");

if (!process.env.ELEVENTY_SERVERLESS) {
  // explicitly use var for global scoping
  var { ContrastChecker } = require("color-contrast-calc");
  var { extractColors } = require("extract-colors");
  var chroma = require("chroma-js");
}

// find the correct capitalization for a tournament file
// excludes file extension
function canonicalCase(filename, path="results") {
  filename = filename.split(".")[0];
  const filenames = fs
    .readdirSync("./data/" + path)
    .flatMap((filename) =>
      /^[0-9].*/.test(filename) ? [filename.split(".")[0]] : []
    );
  if (filenames.includes(filename)) {
    return filename;
  }
  return (
    filenames.find((f) => f.toLowerCase() === filename.toLowerCase()) ??
    filename
  );
}

// used for setting the meta canonical tag for SEO
function canonicalizePath(filename) {
  const parts = filename.split("/");
  const filenames = fs
    .readdirSync("./data/results")
    .flatMap((filename) =>
      /^[0-9].*/.test(filename) ? [filename.split(".")[0]] : []
    );

  return parts
    .map((part) => {
      if (filenames.includes(part)) {
        return part;
      }
      return (
        filenames.find((f) => f.toLowerCase() === part.toLowerCase()) ?? part
      );
    })
    .join("/");
}

function findLogoPath(filename) {
  const cached = JSON.parse(
    fs.readFileSync("./cache/tourn-images.json", "utf8")
  );
  if (cached[filename]) {
    return cached[filename];
  }
  if (process.env.ELEVENTY_SERVERLESS) {
    return "/images/logos/default.jpg";
  }

  const tournamentYear = parseInt(filename.slice(0, 4));
  const tournamentName = filename.slice(11, -2).replace("_no_builds", "");
  const getYear = (image) => parseInt(image.match(/^\d+/)?.[0] ?? 0);

  const images = fs.readdirSync("./src/images/logos");
  const sameDivision = images.filter((image) =>
    filename.endsWith(image.split(".")[0].match(/_[abc]$/)?.[0] ?? "")
  );

  const hasTournName = sameDivision.filter((image) =>
    image.includes(tournamentName)
  );

  // use state logo if regional logo does not exist
  let stateFallback = [];
  if (/_regional_[abc]$/.test(filename)) {
    const stateName = filename.split("_")[1] + "_states";
    stateFallback = sameDivision.filter((image) => image.includes(stateName));
  }

  // remove format info from name
  let withoutFormat = [];
  if (/(mini|satellite|in-person)_?(so)?_/.test(filename)) {
    const nameWithoutFormat = tournamentName.replace(
      /(mini|satellite|in-person)_?(so)?_/,
      ""
    );
    withoutFormat = sameDivision.filter((image) =>
      image.includes(nameWithoutFormat)
    );
  }

  const recentYear = hasTournName
    .concat(...withoutFormat, stateFallback, "default.jpg")
    .filter((image) => getYear(image) <= tournamentYear);
  const selected = recentYear.reduce((prev, curr) => {
    const currentScore = getYear(curr) + curr.length / 100;
    const prevScore = getYear(prev) + prev.length / 100;
    return currentScore > prevScore ? curr : prev;
  });

  cached[filename] = "/images/logos/" + selected;
  fs.writeFileSync("./cache/tourn-images.json", JSON.stringify(cached));
  return "/images/logos/" + selected;
}

async function findBgColor(filename) {
  const cached = JSON.parse(fs.readFileSync("./cache/bg-colors.json", "utf8"));
  if (cached[filename]) {
    return cached[filename];
  }
  if (process.env.ELEVENTY_SERVERLESS) {
    return "#1f1b35";
  }

  const colors = await extractColors("./src" + findLogoPath(filename, true));
  let chosenColor = chroma(
    colors.reduce((prev, curr) =>
      // choose color based on area if saturation is past
      // a threshold value, otherwise fallback to saturation
      curr.saturation > 0.05 && prev.saturation > 0.05
        ? curr.area > prev.area
          ? curr
          : prev
        : curr.saturation > prev.saturation
        ? curr
        : prev
    ).hex
  );
  while (ContrastChecker.contrastRatio("#f5f5f5", chosenColor.hex()) < 5.5) {
    chosenColor = chosenColor.darken();
  }
  cached[filename] = chosenColor.hex();
  fs.writeFileSync("./cache/bg-colors.json", JSON.stringify(cached));
  return chosenColor.hex();
}

const trophyAndMedalColors = [
  "#ffee58",
  "#cfd8dc",
  "#d8bf99",
  "#ffefc0",
  "#dcedc8",
  "#eeccff",
  "#fdd5b4",
  "#d4f0f1",
  "#ffc8db",
  "#dab9d1",
  "#e5e5e5",
  "#e5e5e5",
  "#e5e5e5",
  "#e5e5e5",
  "#e5e5e5",
  "#f4f4f4",
  "#f4f4f4",
  "#f4f4f4",
  "#f4f4f4",
  "#f4f4f4",
];

function trophyAndMedalCss(trophies, medals, reverse = false) {
  return trophyAndMedalColors
    .map((color, i) => {
      let output = [];
      if (i < medals) {
        output.push(
          `td.event-points[data-points='${reverse ? reverse - i : i + 1}'] div`
        );
        output.push(
          `td.event-points-focus[data-points='${
            reverse ? reverse - i : i + 1
          }'] div`
        );
        output.push(
          `div#team-detail tr[data-points='${reverse ? reverse - i : i + 1}']`
        );
      }
      if (i < trophies) {
        output.push(`td.rank[data-points='${i + 1}'] div`);
      }
      if (output.length > 0) {
        output =
          output.join(",") + `{background-color: ${color};border-radius: 1em;}`;
      }
      return output;
    })
    .join("");
}

function acronymize(phrase) {
  return phrase
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .join("");
}

function acronymizeFull(phrase) {
  return phrase
    .split(" ")
    .map((w) => w[0])
    .join("");
}

function keywords(interpreter) {
  const t = interpreter.tournament;
  const words = [
    t.name,
    t.short_name,
    t.location,
    t.name ? acronymize(t.name) : null,
    t.name ? acronymizeFull(t.name) : null,
    t.location && t.location.split(" ").length > 1
      ? acronymize(t.location)
      : null,
    t.name
      ? acronymize(t.name.replace("Tournament", "Science Olympiad"))
      : null,
    t.name
      ? acronymizeFull(t.name.replace("Tournament", "Science Olympiad"))
      : null,
    t.level,
    t.level === "Nationals" ? "nats" : null,
    t.level === "Nationals" ? "sont" : null,
    t.level === "Invitational" ? "invite" : null,
    t.level === "Regionals" ? "regs" : null,
    t.state,
    t.state ? sharedHelpers.expandStateName(t.state) : null,
    t.state === "nCA" ? "norcal" : null,
    t.state === "sCA" ? "socal" : null,
    t.state === "nCA" || t.state === "sCA" ? "california" : null,
    `div-${t.division}`,
    `division-${t.division}`,
    t.year,
    t.date ? t.date.toISOString().split("T")[0] : null,
    t.date
      ? t.date.toLocaleDateString(undefined, {
          weekday: "long",
          timeZone: "UTC",
        })
      : null,
    t.date
      ? t.date.toLocaleDateString(undefined, { month: "long", timeZone: "UTC" })
      : null,
    t.date ? t.date.getUTCDate() : null,
    t.date ? t.date.getUTCFullYear() : null,
    t.startDate ? t.startDate.toISOString().split("T")[0] : null,
    t.startDate
      ? t.startDate.toLocaleDateString(undefined, {
          weekday: "long",
          timeZone: "UTC",
        })
      : null,
    t.startDate
      ? t.startDate.toLocaleDateString(undefined, {
          month: "long",
          timeZone: "UTC",
        })
      : null,
    t.startDate ? t.startDate.getUTCDate() : null,
    t.startDate ? t.startDate.getUTCFullYear() : null,
    t.endDate ? t.endDate.toISOString().split("T")[0] : null,
    t.endDate
      ? t.endDate.toLocaleDateString(undefined, {
          weekday: "long",
          timeZone: "UTC",
        })
      : null,
    t.endDate
      ? t.endDate.toLocaleDateString(undefined, {
          month: "long",
          timeZone: "UTC",
        })
      : null,
    t.endDate ? t.endDate.getUTCDate() : null,
    t.endDate ? t.endDate.getUTCFullYear() : null,
    "science",
    "olympiad",
    "tournament",
    interpreter.histograms !== undefined ? "histograms" : null,
  ];
  return Array.from(
    words
      // split spaces, dedupe, convert to lowercase, remove nulls
      .reduce((acc, v) => {
        if (v) {
          v.toString()
            .split(" ")
            .forEach((w) => acc.add(w.toLowerCase()));
        }
        return acc;
      }, new Set())
  ).join(" ");
}

function teamAttended(team) {
  return team.placings.map((p) => p.participated).some((p) => p);
}

const summaryTitles = [
  "Champion",
  "Runner-up",
  "Third-place",
  "Fourth-place",
  "Fifth-place",
  "Sixth-place",
];

function supTag(placing) {
  const exempt = placing.exempt || placing.droppedAsPartOfWorstPlacings;
  const tie = placing.tie && !placing.pointsLimitedByMaximumPlace;
  if (tie || exempt) {
    return `<sup>${exempt ? "◊" : ""}${tie ? "*" : ""}</sup>`;
  }
  return "";
}

function bidsSupTag(team) {
  return team.earnedBid ? "<sup>✧</sup>" : "";
}

function bidsSupTagNote(tournament) {
  const nextTournament =
    tournament.level === "Regionals"
      ? `${tournament.state
          .replace("sCA", "SoCal")
          .replace("nCA", "NorCal")} State Tournament`
      : "National Tournament";
  const qualifiee = tournament.bidsPerSchool > 1 ? "team" : "school";
  return `Qualified ${qualifiee} for the ${tournament.year} ${nextTournament}`;
}

function placingNotes(placing) {
  const place = placing.place;
  const points = placing.isolatedPoints;
  return [
    placing.event.trial ? "trial event" : null,
    placing.event.trialed ? "trialed event" : null,
    placing.disqualified ? "disqualified" : null,
    placing.didNotParticipate ? "did not participate" : null,
    placing.participationOnly ? "participation points only" : null,
    placing.tie ? "tie" : null,
    placing.exempt ? "exempt" : null,
    placing.pointsLimitedByMaximumPlace ? "points limited" : null,
    placing.unknown ? "unknown place" : null,
    placing.pointsAffectedByExhibition && place - points == 1
      ? "placed behind exhibition team"
      : null,
    placing.pointsAffectedByExhibition && place - points > 1
      ? "placed behind exhibition teams"
      : null,
    placing.droppedAsPartOfWorstPlacings ? "dropped" : null,
  ]
    .flatMap((s) => (s ? [s[0].toUpperCase() + s.slice(1)] : []))
    .join(", ");
}

function teamsToStates(interpreter) {
  return Array.from(
    interpreter.teams.reduce((acc, t) => {
      acc.add(t.state);
      return acc;
    }, new Set())
  ).sort((a, b) => a.localeCompare(b));
}

function fmtDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function timeDelta(time) {
  return Date.now() - time;
}

function escapeCsv(s) {
  if (typeof s !== "string") {
    return s;
  }
  if (
    s.includes('"') ||
    s.includes(",") ||
    s.includes("\n") ||
    s.includes("\r")
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

module.exports = {
  canonicalCase,
  canonicalizePath,
  findLogoPath,
  findBgColor,
  trophyAndMedalCss,
  keywords,
  teamAttended,
  summaryTitles,
  supTag,
  bidsSupTag,
  bidsSupTagNote,
  placingNotes,
  teamsToStates,
  fmtDate,
  timeDelta,
  escapeCsv,
  ...sharedHelpers,
};
