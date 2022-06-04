const chromium = require("chrome-aws-lambda");
const fetch = require("node-fetch");

async function handler(event) {
  try {
    const url = new URL(
      event.path.split("/").slice(2).join("/"),
      new URL(event.rawUrl).origin
    );
    url.searchParams = new URLSearchParams(event.queryStringParameters);

    const browser = await chromium.puppeteer.launch({
      executablePath: await chromium.executablePath,
      args: chromium.args,
      defaultViewport: {
        width: 1024,
        height: 720,
        deviceScaleFactor: 1,
      },
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    page.setJavaScriptEnabled(true);

    let response;
    if (event.httpMethod === "POST") {
      const resp = await fetch(url, {
        method: "POST",
        body: event.body,
      });
      const html = await resp.text();
      response = page.setContent(html);
    } else {
      response = page.goto(url);
    }

    const screenshot = await page.screenshot({
      type: "png",
      encoding: "base64",
      fullPage: false,
      captureBeyondViewport: false,
      clip: {
        x: 0,
        y: 0,
        width: 1024,
        height: 720,
      },
    });

    await browser.close();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/png",
      },
      body: screenshot,
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: error.httpStatusCode || 500,
      body: JSON.stringify(
        {
          error: error.message,
        },
        null,
        2
      ),
    };
  }
}

// Choose one:
// * Runs on each request: AWS Lambda, Netlify Function
// * Runs on first request only: Netlify On-demand Builder
//    1. Don’t forget to `npm install @netlify/functions`
//    2. Also use `redirects: "netlify-toml-builders"` in your config file’s serverless bundler options:
//       https://www.11ty.dev/docs/plugins/serverless/#bundler-options

exports.handler = handler;

// const { builder } = require("@netlify/functions");
// exports.handler = builder(handler);
