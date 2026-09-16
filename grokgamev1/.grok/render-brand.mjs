import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const jobs = [
  {
    html: "/workspace/.grok/og-card.html",
    out: "/workspace/.grok/og-raw.png",
    width: 1200,
    height: 630,
  },
  {
    html: "/workspace/.grok/x-banner.html",
    out: "/workspace/.grok/banner-raw.png",
    width: 1200,
    height: 264,
  },
];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  for (const job of jobs) {
    const page = await browser.newPage({
      viewport: { width: job.width, height: job.height },
      deviceScaleFactor: 2,
    });
    await page.goto(pathToFileURL(job.html).href, { waitUntil: "load", timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    await page.screenshot({ path: job.out, type: "png" });
    await page.close();
    console.log("wrote", job.out);
  }
} finally {
  await browser.close();
}
