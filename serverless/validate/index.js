// dependency bundling
require("commander");
require("fetch-retry");
require("js-yaml");
require("yup");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method not allowed",
    };
  }
  if (!event.body) {
    return {
      statusCode: 400,
      body: "No body",
    };
  }
  const data = {};
  try {
    const parsed = JSON.parse(event.body);
    if (!parsed.rep) {
      return {
        statusCode: 400,
        body: "No rep",
      };
    }
    data.rep = parsed.rep;
  } catch {
    return {
      statusCode: 400,
      body: "Invalid JSON",
    };
  }

  const sciolyff = (await import("sciolyff")).default;
  const validated = await sciolyff.valid(data.rep);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(validated),
  };
};
