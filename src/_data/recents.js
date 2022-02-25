const fs = require("fs/promises");
const yaml = require("js-yaml");
const simpleGit = require("simple-git");

module.exports = async () => {
  // don't run on serverless requests
  if (process.env.ELEVENTY_SERVERLESS) return;

  const recentsFile = await fs.readFile("./data/recents.yaml", "utf8");
  const recents = yaml.load(recentsFile);

  const git = simpleGit();

  const newFiles = (await fs.readdir("./data")).filter(
    (filename) => !recents.includes(filename) && /^[0-9].*/.test(filename)
  );
  const newList = (
    await Promise.all(
      newFiles.map(async (filename) => {
        const log = await git.log({
          file: `./data/${filename}`,
          "-M90%": null,
        });
        const firstCommitDate =
          log.total > 0
            ? Date.parse(log.all[log.all.length - 1].date)
            : Infinity;
        return [filename, firstCommitDate];
      })
    )
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([f, _]) => f);
  const fullList = newList.concat(recents);

  const recentsFileContent = yaml.dump(fullList);
  await fs.writeFile("./data/recents.yaml", recentsFileContent);

  return fullList;
};
