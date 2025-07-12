const STATES_BY_POSTAL_CODE = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  nCA: "Northern California",
  sCA: "Southern California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

function expandStateName(postalCode) {
  return STATES_BY_POSTAL_CODE[postalCode];
}

function generateFilename(interpreter) {
  // ^(19|20)\d{2}-[01]\d-[0-3]\d_([\w]+_invitational|([ns]?[A-Z]{2})_[\w]+_regional|([ns]?[A-Z]{2})_states|nationals)_(no_builds_)?[abc]$
  let output = "";
  output += interpreter.tournament.startDate.getUTCFullYear();
  output +=
    "-" +
    (interpreter.tournament.startDate.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0");
  output +=
    "-" +
    interpreter.tournament.startDate.getUTCDate().toString().padStart(2, "0");
  switch (interpreter.tournament.level) {
    case "Nationals":
      output += "_nationals";
      break;
    case "States":
      output += `_${interpreter.tournament.state}_states`;
      break;
    case "Regionals":
      output += `_${interpreter.tournament.state}_${(
        interpreter.tournament.shortName ?? interpreter.tournament.name
      )
        .toLowerCase()
        .split("regional")[0]
        .replace(/\./g, "")
        .replace(/[^\w]/g, "_")}regional`;
      break;
    default:
      output += `_${(
        interpreter.tournament.shortName ?? interpreter.tournament.name
      )
        .toLowerCase()
        .split("invitational")[0]
        .replace(/\./g, "")
        .replace(/[^\w]/g, "_")}invitational`;
      break;
  }
  output += "_" + interpreter.tournament.division.toLowerCase();
  return output;
}

function getSeasonFromFilename(filename) {
  const date = new Date(filename.slice(0, 10));

  const seasonStart = new Date(date.getFullYear(), 6, 15); // july 15
  if (date >= seasonStart) {
    return date.getFullYear() + 1;
  }
  return date.getFullYear();
}

function findTournamentImage(filename, images) {
  const season = getSeasonFromFilename(filename);
  const name = filename.slice(11);
  const state = /([A-Za-z]+)\w+_regional_[abc]$/.exec(name)?.[1];

  const aliases = [name];
  if (state) aliases.push(state + "_states");

  /*
    Matches images with this format:
      - short_name_YYYY-YYYY.ext
      - short_name_YYYY-.ext
      - short_name_YYYY.ext
      - short_name.ext
    Capture Groups (e.g. short_name_1234-5678.ext):
      1. short_name
      2. 1234
      3. -5678
      4. 5678
   */
  const parseImage = /(\w+?)(?:_(\d{4}))?(-(\d{4})?)?\.\w+/;
  const candidates = images
    .flatMap((imgFilename) => {
      const parsed = parseImage.exec(imgFilename);
      const imageName = parsed[1];
      const startYear = parseInt(parsed[2]) || undefined;
      const endYear = parsed[3] ? parseInt(parsed[4]) || Infinity : startYear;

      if (
        !aliases.some((name) => {
          const parts = name.split("_");
          return imageName.split("_").every((part) => parts.includes(part));
        }) ||
        season < (startYear ?? -Infinity) ||
        season > (endYear ?? Infinity)
      ) {
        return [];
      }

      return [
        {
          file: imgFilename,
          length: imageName.length,
          startYear: startYear ?? -Infinity,
          duration: (endYear ?? Infinity) - (startYear ?? -Infinity),
        },
      ];
    })
    .sort(
      (a, b) =>
        b.length - a.length ||
        a.duration - b.duration ||
        b.startYear - a.startYear,
    );

  return "/images/logos/" + (candidates[0]?.file || "default.png");
}

function tournamentTitle(tInfo) {
  if (tInfo.name) return tInfo.name;

  switch (tInfo.level) {
    case "Nationals":
      return "Science Olympiad National Tournament";
    case "States":
      return `${expandStateName(
        tInfo.state,
      )} Science Olympiad State Tournament`;
    case "Regionals":
      return `${tInfo.location} Regional Tournament`;
    case "Invitational":
      return `${tInfo.location} Invitational`;
  }
}

function tournamentTitleShort(tInfo) {
  switch (tInfo.level) {
    case "Nationals":
      return "National Tournament";
    case "States":
      return `${tInfo.state
        .replace("sCA", "SoCal")
        .replace("nCA", "NorCal")} State Tournament`;
    case "Regionals":
    case "Invitational":
      if (!tInfo.shortName) {
        let cut = tInfo.level === "Regionals" ? "Regional" : "Invitational";
        let splits = tInfo.name.split(cut, 2)[0];
        return `${splits} ${cut}${cut === "Regional" ? " Tournament" : ""}`;
      }
      return tInfo.shortName;
  }
}

function formatSchool(team) {
  if (team.schoolAbbreviation) {
    return abbrSchool(team.schoolAbbreviation);
  }
  return abbrSchool(team.school);
}

function abbrSchool(school) {
  return school
    .replace("Elementary School", "Elementary")
    .replace(/Elementary[ /-]Middle School/, "E.M.S.")
    .replace("Middle School", "M.S.")
    .replace("Junior High School", "J.H.S.")
    .replace(/Middle[ /-]High School/, "M.H.S.")
    .replace(/Junior[ /-]Senior High School/, "Jr./Sr. H.S.")
    .replace("High School", "H.S.")
    .replace("Secondary School", "Secondary")
    .replace("Saint ", "St. ");
}

function fullSchoolName(team) {
  const location = team.city
    ? `(${team.city}, ${team.state})`
    : `(${team.state})`;
  return `${team.school} ${location}`;
}

function fullTeamName(team) {
  const location = team.city
    ? `(${team.city}, ${team.state})`
    : `(${team.state})`;
  return `${team.school} ${team.suffix ? team.suffix + " " : ""}${location}`;
}

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

module.exports = {
  expandStateName,
  generateFilename,
  findTournamentImage,
  tournamentTitle,
  tournamentTitleShort,
  formatSchool,
  abbrSchool,
  fullSchoolName,
  fullTeamName,
  ordinalize,
};
