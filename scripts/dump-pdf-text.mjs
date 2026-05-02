import fs from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";

const pdfPath = path.join(process.cwd(), "题库", "人工智能训练师三级理论知识题库.pdf");
const buf = fs.readFileSync(pdfPath);
const parser = new PDFParse({ data: new Uint8Array(buf) });
const data = await parser.getText();
await parser.destroy();
console.log(data.text.slice(0, 15000));
console.log("\n--- length ---\n", data.text.length, "pages", data.total);
