const fs = require("fs");
const TOML = require("@iarna/toml");
const debug = require("debug")("Eleventy:Serverless");

// redirect handler code from 11ty serverless bundler plugin
function addRedirectsWithoutDuplicates(name, config, newRedirects) {
  // keep non-generated redirects or those generated by a different function
  let redirects = (config.redirects || []).filter((entry) => {
    return (
      !entry._generated_by_eleventy_serverless ||
      entry._generated_by_eleventy_serverless !== name
    );
  });

  // Sort for stable order
  newRedirects.sort((a, b) => {
    if (a.from < b.from) {
      return -1;
    } else if (a.from > b.from) {
      return 1;
    }
    return 0;
  });

  for (let r of newRedirects) {
    let found = false;
    for (let entry of redirects) {
      if (r.from === entry.from && r.to === entry.to) {
        found = true;
      }
    }
    if (!found) {
      // EDITED: push redirects to back
      redirects.push(r);
    }
  }

  if (redirects.length) {
    config.redirects = redirects;
  } else {
    delete config.redirects;
  }

  return config;
}

module.exports = function (opts) {
  return function netlifyTomlRedirectHandler(name, outputMap) {
    let newRedirects = [];
    for (let url in outputMap) {
      newRedirects.push({
        from: url,
        to: `/.netlify/${opts.odb ? "builders" : "functions"}/${name}`,
        status: 200,
        // EDITED: disable force
        force: opts.force,
        _generated_by_eleventy_serverless: name,
      });
    }

    let configFilename = "./netlify.toml";
    let cfg = {};
    // parse existing netlify.toml
    if (fs.existsSync(configFilename)) {
      cfg = TOML.parse(fs.readFileSync(configFilename));
    }
    let cfgWithRedirects = addRedirectsWithoutDuplicates(
      name,
      cfg,
      newRedirects
    );

    fs.writeFileSync(configFilename, TOML.stringify(cfgWithRedirects));
    debug(
      `Eleventy Serverless (${name}), writing (×${newRedirects.length}): ${configFilename}`
    );
  };
};
