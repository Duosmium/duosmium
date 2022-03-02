const fs = require("fs");

module.exports = async () => {
  const sciolyff = (await import("sciolyff")).default;

  return (filename, urlPath) => {
    if (/[^A-Za-z0-9_\-]/.test(filename)) {
      throw new Error(`Invalid filename: ${filename}`);
    }
    const file = fs.readFileSync(`./data/${filename}.yaml`, "utf8");
    if (urlPath.includes("/superscore/")) {
      return new sciolyff.Interpreter(file).superscore(true);
    }
    return new sciolyff.Interpreter(file);
  };
};
