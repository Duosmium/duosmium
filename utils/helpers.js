const fs = require("fs");
const { ColorContrastCalc } = require("color-contrast-calc");
const { extractColors } = require("extract-colors");

const STATES_BY_POSTAL_CODE = {
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

const IMAGES_PATH = "./src/images/";

function findLogoPath(filename, local = false) {
  const tournamentYear = parseInt(filename.slice(0, 4));
  const tournamentName = filename.slice(11, -2);
  const getYear = (image) => parseInt(image.match(/^\d+/)?.[0] ?? 0);

  const images = fs.readdirSync(IMAGES_PATH + "logos");
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

  const recentYear = hasTournName
    .concat(...stateFallback, "default.jpg")
    .filter((image) => getYear(image) <= tournamentYear);
  const selected = recentYear.reduce((prev, curr) => {
    const currentScore = getYear(curr) + curr.length / 100;
    const prevScore = getYear(prev) + prev.length / 100;
    return currentScore > prevScore ? curr : prev;
  });

  return (local ? IMAGES_PATH : "/results/images/logos/") + selected;
}

async function findBgColor(filename) {
  const colors = await extractColors(findLogoPath(filename, true));
  const chosenColor = colors.reduce((prev, curr) =>
    curr.saturation > prev.saturation ? curr : prev
  );
  const textColor = ColorContrastCalc.colorFrom("#f5f5f5");
  const newColor = ColorContrastCalc.colorFrom(chosenColor.hex);
  const adjusted = textColor.findBrightnessThreshold(newColor, "AA");
  return adjusted.hexCode;
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

function trophyAndMedalCss(trophies, medals) {
  return trophyAndMedalColors
    .map(
      (color, index) =>
        [
          i < medals ? `td.event-points[data-points='${i + 1}'] div` : "",
          i < medals ? `td.event-points-focus[data-points='${i + 1}'] div` : "",
          i < medals ? `div#team-detail tr[data-points='${i + 1}']` : "",
          i < trophies ? `td.rank[data-points='${i + 1}'] div` : "",
        ].join(",") + `{background-color: ${color};border-radius: 1em;}`
    )
    .join("");
}

function tournamentTitle(tInfo) {
  if (tInfo.name) return tInfo.name;

  switch (tInfo.level) {
    case "Nationals":
      return "Science Olympiad National Tournament";
    case "States":
      return `${expandStateName(
        tInfo.state
      )} Science Olympiad State Tournament`;
    case "Regionals":
      return `${tInfo.location} Regional Tournament`;
    case "Invitational":
      return `${tInfo.location} Invitational`;
  }
}

function expandStateName(postalCode) {
  return STATES_BY_POSTAL_CODE[postalCode];
}

module.exports = {
  findLogoPath,
  findBgColor,
  tournamentTitle,
};
