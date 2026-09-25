const fs = require("fs");
const FILE = "C:/Codes/qoder/LearnLang/src/data/words/hy.json";
const TARGET = 1000;

const ROM = {
  0x0561:"a",0x0562:"b",0x0563:"g",0x0564:"d",0x0565:"e",0x0566:"z",0x0567:"e",0x0568:"e",
  0x0569:"t'",0x056A:"zh",0x056B:"i",0x056C:"l",0x056D:"kh",0x056E:"ts",0x056F:"k",0x0570:"h",
  0x0571:"j",0x0572:"gh",0x0573:"ch",0x0574:"m",0x0575:"y",0x0576:"n",0x0577:"sh",0x0578:"o",
  0x0579:"ch'",0x057A:"p",0x057B:"dz",0x057C:"rr",0x057D:"s",0x057E:"v",0x057F:"t",0x0580:"r",
  0x0581:"ts'",0x0582:"u",0x0583:"p'",0x0584:"k'",0x0585:"o",0x0586:"f",0x0587:"ev"
};
function romanize(word) {
  let out = "";
  for (const ch of word) {
    let cp = ch.codePointAt(0);
    if (cp >= 0x0531 && cp <= 0x0556) cp += 48; // uppercase -> lowercase letter
    const r = ROM[cp];
    if (r === undefined) return null;
    out += r;
  }
  return out.toLowerCase();
}
function isArm(w) { return /^[\u0530-\u0588\u058F]+$/.test(w); }

let arr = [];
try {
  arr = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch (e) {
  // recover from malformed line-per-object file (possibly with doubled braces)
  const raw = fs.readFileSync(FILE, "utf8");
  for (const line of raw.split("\n")) {
    let l = line.trim().replace(/,$/, "");
    if (!l.startsWith("{")) continue;
    while (/^\{\{/.test(l) && /\}\}$/.test(l)) l = l.slice(1, -1);
    try {
      const o = JSON.parse(l);
      if (o && o.word && o.meaning) arr.push(o);
    } catch (e2) { console.log("unparsable line:", l.slice(0, 50)); }
  }
}
const used = new Set();
const out = [];
for (const e of arr) {
  if (!isArm(e.word) || used.has(e.word)) { console.log("dropped:", e.word); continue; }
  used.add(e.word);
  out.push({ word: e.word, meaning: e.meaning, roman: romanize(e.word) });
}
console.log("after rebuild:", out.length);

const TITLES = ("eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen " +
"red black white green yellow blue brown purple gray today tomorrow yesterday evening morning " +
"summer winter spring autumn always often never sometimes soon late early already still again " +
"daughter son husband wife aunt uncle nephew niece cousin grandfather grandmother father mother " +
"bee wolf fox bear pig goat donkey hen duck goose camel horn tail feather fur claw hoof nest egg " +
"carpet floor hat dress shirt shoe sock coat button pocket collar sleeve skin bone muscle cheek " +
"chin elbow wrist knee ankle thumb palm forehead eyebrow eyelash neck throat chest " +
"people example both less century smile idea form size weight clean dirty smooth hard soft " +
"hill valley bridge garden orchard farm field meadow cave island lake ocean shore beach wave tide " +
"king queen prince princess president minister citizen foreigner stranger slave master " +
"knife fork plate bowl glass cup bottle jar pot pan napkin tray " +
"clock key lock safe ladder hammer saw axe nail rope chain rope bucket broom " +
"pencil paper pen ink stamp coin dollar price cost salary pension " +
"music song dance theater movie concert " +
"dog cat horse cow sheep chicken snake"
).split(/\s+/).filter((v,i,a)=>a.indexOf(v)===i);

async function fetchTitle(t) {
  const url = "https://en.wiktionary.org/w/rest.php/v1/page/" + encodeURIComponent(t);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "FlashcardAppDataBuilder/1.0 (contact: dev@example.com)" } });
    if (!res.ok) return null;
    const j = await res.json();
    const wt = j.source || "";
    const cands = [];
    for (const m of wt.matchAll(/\{\{t([+-]?)\|hy\|([^}|]+)/g)) cands.push(m[2].trim());
    for (const c of cands) {
      if (isArm(c) && c.length > 1 && !used.has(c) && !/^[A-Z]/.test(c)) return c;
    }
    return null;
  } catch (e) { return null; }
}

function unesc(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
}

(async () => {
  for (let i = 0; i < TITLES.length && out.length < TARGET; i += 8) {
    const batch = TITLES.slice(i, i + 8);
    const results = await Promise.all(batch.map(fetchTitle));
    for (let k = 0; k < results.length && out.length < TARGET; k++) {
      const w = results[k];
      if (!w || used.has(w)) continue;
      used.add(w);
      out.push({ word: w, meaning: batch[k], roman: romanize(w) });
    }
    process.stdout.write(".");
  }
  console.log("\nfinal count:", out.length);
  const lines = out.map(e =>
    "{" + '"word":' + JSON.stringify(e.word) + ', "meaning":' + JSON.stringify(e.meaning) + ', "roman":' + JSON.stringify(e.roman) + "}"
  );
  const text = unesc("[\n" + lines.join(",\n") + "\n]\n");
  fs.writeFileSync(FILE, text, "utf8");
  const check = JSON.parse(text);
  console.log("written:", check.length, "unique:", new Set(check.map(x => x.word)).size);
})();
