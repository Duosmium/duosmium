const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

async function handler(event) {
  try {
    const url = new URL(
      event.path.split("/").slice(2).join("/"),
      new URL(event.rawUrl).origin
    );

    const browser = await puppeteer.launch({
      executablePath: await chromium.executablePath(),
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

    const timeout = 8500; // 8.5 seconds, netlify function timeout is 10 sec
    let response = await Promise.race([
      page.goto(url.toString(), {
        timeout,
        waitUntil: ["load"],
      }),
      new Promise((res) => {
        setTimeout(() => {
          res(false);
        }, timeout - 1500);
      }),
    ]);

    if (response === false) {
      await page.evaluate(() => window.stop());
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

const { builder } = require("@netlify/functions");
exports.handler = builder(handler);
