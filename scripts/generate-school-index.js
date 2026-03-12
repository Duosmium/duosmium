const fs = require("fs/promises");
const fsSync = require("fs");

async function main() {
  const sciolyff = (await import("sciolyff")).default;
  const files = (await fs.readdir("./data/results")).filter((f) =>
    /^[0-9].*/.test(f)
  );
  const schoolIndex = {};

  for (const file of files) {
    const filename = file.split(".")[0];
    const content = await fs.readFile("./data/results/" + file, "utf8");
    const interpreter = new sciolyff.Interpreter(content);

    for (const team of interpreter.teams) {
      const fullName = team.city
        ? `${team.school} (${team.city}, ${team.state})`
        : `${team.school} (${team.state})`;
      if (!schoolIndex[fullName]) {
        schoolIndex[fullName] = [];
      }
      if (!schoolIndex[fullName].includes(filename)) {
        schoolIndex[fullName].push(filename);
      }
    }
  }

  fsSync.writeFileSync(
    "./cache/school-index.json",
    JSON.stringify(schoolIndex)
  );

  var schoolNames = Object.keys(schoolIndex).sort(function(a, b) {
    return a.localeCompare(b);
  });
  fsSync.writeFileSync(
    "./cache/school-names.json",
    JSON.stringify(schoolNames)
  );

  console.log(
    "Generated school-index.json with",
    Object.keys(schoolIndex).length,
    "schools"
  );
}

main().catch(console.error);
