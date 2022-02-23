const fs = require("fs");

// for serverless dep tracking
require("sciolyff");

module.exports = async () => {
  const sciolyff = (await import("sciolyff")).default;

  return (filename) => {
    const file = fs.readFileSync(`./data/${filename}.yaml`, "utf8");
    return new sciolyff.Interpreter(file);
  };
};
