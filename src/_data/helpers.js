const fs = require("fs");

const IMAGES_PATH = "./src/images/";

function findLogoPath(filename) {
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

  return "/results/images/logos/" + selected;
}

module.exports = {
  findLogoPath,
};
