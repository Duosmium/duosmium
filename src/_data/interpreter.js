const fs = require("fs");
const fetch = require("node-fetch");
const { escapeCsv } = require("../../utils/helpers");

// for serverless depenency bunding
require("commander");
require("fetch-retry");
require("js-yaml");
require("yup");
require("js-yaml-source-map");

module.exports = async () => {
  const sciolyff = (await import("sciolyff")).default;

  return {
    fromFilename: (filename, superscore) => {
      if (/[^A-Za-z0-9_\-]/.test(filename)) {
        throw new Error(`Invalid filename: ${filename}`);
      }
      const file = fs.readFileSync(`./data/results/${filename}.yaml`, "utf8");
      if (superscore) {
        return new sciolyff.Interpreter(file).superscore(true);
      }
      return new sciolyff.Interpreter(file);
    },

    fromRepStr: (rep, superscore) => {
      if (superscore) {
        return new sciolyff.Interpreter(rep).superscore(true);
      }
      return new sciolyff.Interpreter(rep);
    },

    fetchRepFromURL: async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Fetching ${url} failed: ${response.statusText}`);
      }
      return response.text();
    },

    valid: async (rep) => {
      return await sciolyff.valid(rep);
    },

    toCsv: (interpreter) => {
      let output = "";

      // set headers
      output += [
        "number",
        "school",
        "team",
        "exhibition",
        "city",
        "state",
        "track",
        "rank",
        "total",
        ...interpreter.events
          .map(
            (e) =>
              e.name +
              (e.trial ? " (Trial)" : "") +
              (e.trialed ? " (Trialed)" : "")
          )
          .sort((a, b) => a.localeCompare(b)),
      ]
        .map(escapeCsv)
        .join(",");
      output += "\n";

      const teamRow = (team, track) =>
        [
          team.number,
          team.school,
          team.suffix ?? "",
          team.exhibition ? "Yes" : "",
          team.city ?? "",
          team.state,
          track,
          team.rank,
          team.points,
          ...team.placings
            .map((p) => [
              p.unknown && !p.pointsLimitedByMaximumPlace
                ? "??"
                : p.isolatedPoints,
              p.event.name,
            ])
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map((p) => p[0]),
        ]
          .map(escapeCsv)
          .join(",");

      output += interpreter.teams
        .map((t) =>
          teamRow(t, interpreter.tournament.hasTracks ? "Combined" : "")
        )
        .join("\n");

      if (interpreter.tournament.hasTracks) {
        output += "\n";
        output += interpreter.tracks
          .map((track) =>
            track.teams.map((t) => teamRow(t, track.name)).join("\n")
          )
          .join("\n");
      }

      return output;
    },
  };
};
