const fs = require("fs/promises");

module.exports = async () => {
  const sciolyff = (await import("sciolyff")).default;

  const files = (await fs.readdir("./data")).filter((filename) =>
    /^[0-9].*/.test(filename)
  );
  const data = await Promise.all(
    files.map(async (filename) => {
      const file = await fs.readFile(`./data/${filename}`, "utf8");
      return {
        filename: filename.split(".")[0],
        file,
      };
    })
  );
  return data.reduce((acc, { filename, file }) => {
    acc[filename] = new sciolyff.Interpreter(file);
    return acc;
  }, {});
};
