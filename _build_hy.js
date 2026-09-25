const fs = require("fs");
const FILE = "C:/Codes/qoder/LearnLang/src/data/words/hy.json";
const SRC = "C:/Codes/qoder/LearnLang/_armwords.txt";

function unesc(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
}

const ROM = {
  0x0561:"a",0x0562:"b",0x0563:"g",0x0564:"d",0x0565:"e",0x0566:"z",0x0567:"ë",0x0568:"i",
  0x0569:"l",0x056A:"x",0x056B:"ts",0x056C:"k",0x056D:"h",0x056E:"dz",0x056F:"gh",0x0570:"ch",
  0x0571:"m",0x0572:"y",0x0573:"n",0x0574:"sh",0x0575:"o",0x0576:"ch",0x0577:"p",0x0578:"j",
  0x0579:"rr",0x057A:"s",0x057B:"v",0x057C:"t",0x057D:"r",0x057E:"ts'",0x057F:"w",0x0580:"p'",
  0x0581:"k'",0x0582:"vo",0x0583:"f",0x0584:"ev",0x0585:"ov",0x0587:"ev"
};
function romanize(word) {
  let out = "";
  for (const ch of word) {
    let cp = ch.codePointAt(0);
    if (cp >= 0x0531 && cp <= 0x0556) cp += 48; // uppercase -> lowercase
    const r = ROM[cp];
    if (r === undefined) return null;
    out += r;
  }
  return out.toLowerCase();
}
function isArmenian(w) {
  return /^[\u0530-\u058F\uFB13-\uFB17]+$/.test(w);
}

const GLOSS_FIX = {
  "said":"to say","went":"to go","came":"to come","made":"to make","had":"to have",
  "does":"to do","tell":"to tell","grew":"to grow","met":"to meet","know":"to know",
  "think":"to think","take":"to take","give":"to give","find":"to find","want":"to want",
  "look":"to look","become":"to become","leave":"to leave","feel":"to feel","bring":"to bring",
  "receive":"to receive","understand":"to understand","mean":"to mean","send":"to send","build":"to build","stay":"to stay"
};
function fixGloss(g) {
  g = g.trim().toLowerCase();
  const first = g.split(/[,;]/)[0].trim();
  return GLOSS_FIX[first] || first;
}

// Load existing curated entries (lines with escaped-object JSON before final comma)
const raw = fs.readFileSync(FILE, "utf8");
const entries = [];
const used = new Set();
for (const line of raw.split("\n")) {
  const m = line.match(/^\{("word.*)\},?$/);
  if (!m) continue;
  try {
    const obj = JSON.parse("{" + m[1] + "}");
    const w = obj.word;
    if (typeof w !== "string" || !isArmenian(w) || used.has(w)) continue;
    used.add(w);
    entries.push({ word: w, meaning: obj.meaning, roman: obj.roman });
  } catch (e) {}
}
console.log("kept curated:", entries.length);

// Parse source list
const src = fs.readFileSync(SRC, "utf8");
const mm = src.match(/"""([\s\S]*?)"""/);
const rows = mm[1].split("\n").map(l => l.split("\t")).filter(p => p.length >= 3);
let added = 0, skipped = 0;
for (const p of rows) {
  if (entries.length >= 1000) break;
  let w = p[1].trim().replace(/^[-\u2010-\u2015]\s*/, "").trim();
  const g = p[2].trim();
  if (!w || !g || !isArmenian(w) || used.has(w)) { skipped++; continue; }
  const roman = romanize(w);
  if (!roman) { skipped++; continue; }
  used.add(w);
  entries.push({ word: w, meaning: fixGloss(g), roman });
  added++;
}
console.log("added from source:", added, "skipped:", skipped, "total:", entries.length);

// Write final file: one object per line, real UTF-8 Armenian chars
function esc(s) { return JSON.stringify(s); }
const lines = entries.map(e =>
  "{" + '"word":' + esc(e.word) + ", " + '"meaning":' + esc(e.meaning) + ", " + '"roman":' + esc(e.roman) + "}"
);
let text = unesc("[\n" + lines.join(",\n") + "\n]\n");
fs.writeFileSync(FILE, text, "utf8");
const check = JSON.parse(text);
console.log("final:", check.length, "unique:", new Set(check.map(x => x.word)).size);
