/**
 * 移动端多机型真模拟截图
 * 用法：
 *   node scripts/mobile-shot.mjs <url> [outDir]
 *
 * 示例：
 *   node scripts/mobile-shot.mjs file://$(pwd)/deploy/welcome/randy-profile.html .tmp-mobile
 *   node scripts/mobile-shot.mjs https://qiway.site/ .tmp-mobile
 *
 * 输出：每个机型一张 PNG，命名 <slug>-WxH.png。
 *
 * 必须在 puppeteer 真模拟下运行（与 chrome --window-size 截图根本不同）。
 * 参见 ~/.cursor/rules/mobile-ui-verification.mdc
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEVICES = [
  { slug: "iphone-se", label: "iPhone SE / 13 mini", width: 375, height: 667, dpr: 2 },
  { slug: "iphone-15", label: "iPhone 13/14/15", width: 390, height: 844, dpr: 3 },
  { slug: "iphone-15-plus", label: "iPhone 14/15 Plus", width: 428, height: 926, dpr: 3 },
  { slug: "iphone-15-pmax", label: "iPhone 15 Pro Max", width: 430, height: 932, dpr: 3 },
];

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

async function main() {
  const [, , urlArg, outArg] = process.argv;
  if (!urlArg) {
    console.error("Usage: node scripts/mobile-shot.mjs <url> [outDir]");
    process.exit(1);
  }
  const outDir = path.resolve(outArg || path.join(root, ".tmp-mobile"));
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: "new" });
  console.log(`URL: ${urlArg}`);
  console.log(`Out: ${outDir}`);

  try {
    for (const dev of DEVICES) {
      const page = await browser.newPage();
      await page.setUserAgent(IOS_UA);
      await page.setViewport({
        width: dev.width,
        height: dev.height,
        deviceScaleFactor: dev.dpr,
        isMobile: true,
        hasTouch: true,
      });

      await page.goto(urlArg, { waitUntil: "networkidle2", timeout: 30_000 });

      const file = path.join(outDir, `${dev.slug}-${dev.width}x${dev.height}.png`);
      await page.screenshot({ path: file, fullPage: false });

      const info = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      }));
      const ok = info.innerWidth === dev.width ? "OK" : "MISMATCH";
      console.log(
        `[${ok}] ${dev.label.padEnd(20)} ${dev.width}x${dev.height}  →  ${path.relative(root, file)}` +
          `  (viewport reported ${info.innerWidth}x${info.innerHeight})`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
