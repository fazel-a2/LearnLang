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
    if (cp >= 0x0531 && cp <= 0x0556) cp += 48;
    const r = ROM[cp];
    if (r === undefined) return null;
    out += r;
  }
  return out.toLowerCase();
}
function isArm(w) { return /^[\u0561-\u0588\u058F]+$/.test(w); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const arr = JSON.parse(fs.readFileSync(FILE, "utf8"));
const used = new Set(arr.map(e => e.word));
console.log("start:", arr.length);

const TITLES = ("kitchen bedroom ceiling stair carpet pillow blanket sheet curtain mirror closet " +
"basket barrel jug kettle napkin tray coaster spoon fork chopstick whisk grater " +
"garage fence gate courtyard lawn hedge orchard barn stable shed cage leash collar " +
"paw horn hoof shell scale fin gill prey predator herd flock swarm hive honeycomb wax " +
"thunder lightning rainbow fog mist frost hail breeze gale storm drought flood tide current " +
"shade blossom petal stem branch trunk bark cone pollen sprout weed vine harvest " +
"wolf cub foal calf lamb kid chick hatch brood peck claw beak " +
"law judge jury evidence verdict witness suspect criminal victim crime theft murder robbery " +
"citizen resident foreigner immigrant refugee neighbor stranger crowd mob crowd " +
"freedom justice right duty law rule order peace war army navy soldier officer weapon " +
"president parliament minister policy election vote party government office agency " +
"salary wage profit loss expense budget tax debt loan interest currency exchange " +
"factory machine engine motor device tool instrument material product goods supply demand " +
"science research experiment theory hypothesis discovery invention technology software " +
"medicine doctor patient hospital clinic pharmacy treatment cure disease virus vaccine " +
"education degree exam lesson homework class course training skill knowledge " +
"culture tradition custom festival holiday celebration gift wedding funeral birthday " +
"poem novel story author reader library publication article news magazine " +
"soul spirit ghost demon angel heaven hell prayer worship fast feast sin virtue " +
"pride shame guilt regret hope fear anger joy sadness surprise boredom love hate " +
"distance speed weight height depth width length size volume mass density " +
"yellow orange purple pink golden silver bronze copper iron steel tin lead glass plastic " +
"wood cloth leather wool cotton silk thread needle scissors seam pocket sleeve collar button " +
"blank wet dry damp sharp blunt smooth rough flat tight loose"
).split(/\s+/).filter((v, i, a) => a.indexOf(v) === i);

async function fetchTitle(t) {
  const url = "https://en.wiktionary.org/w/rest.php/v1/page/" + encodeURIComponent(t);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "FlashcardAppDataBuilder/1.0 (contact: dev@example.com)" } });
      if (res.status === 429) { await sleep(4000); continue; }
      if (!res.ok) return null;
      const j = await res.json();
      const cands = [];
      for (const m of (j.source || "").matchAll(/\{\{t([+-]?)\|hy\|([^}|]+)/g)) cands.push(m[2].trim());
      for (const c of cands) {
        if (isArm(c) && c.length > 1 && !used.has(c)) return c;
      }
      return null;
    } catch (e) { await sleep(2000); }
  }
  return null;
}

function unesc(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
}

(async () => {
  let done = 0;
  for (const t of TITLES) {
    if (arr.length >= TARGET) break;
    const w = await fetchTitle(t);
    if (w && !used.has(w)) {
      used.add(w);
      arr.push({ word: w, meaning: t, roman: romanize(w) });
      done++;
      process.stdout.write("+" );
    } else process.stdout.write(".");
    await sleep(700);
  }
  console.log("\nadded:", done, "final:", arr.length);
  const lines = arr.map(e =>
    "{" + '"word":' + JSON.stringify(e.word) + ', "meaning":' + JSON.stringify(e.meaning) + ', "roman":' + JSON.stringify(e.roman) + "}"
  );
  const text = unesc("[\n" + lines.join(",\n") + "\n]\n");
  fs.writeFileSync(FILE, text, "utf8");
  const check = JSON.parse(text);
  console.log("written:", check.length, "unique:", new Set(check.map(x => x.word)).size);
})();
