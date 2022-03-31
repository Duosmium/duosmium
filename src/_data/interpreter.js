const fs = require("fs");

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
      const file = fs.readFileSync(`./data/${filename}.yaml`, "utf8");
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

    valid: async (rep) => {
      return await sciolyff.valid(rep);
    },
  };
};
