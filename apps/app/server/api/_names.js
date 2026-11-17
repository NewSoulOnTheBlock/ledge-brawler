// The names players give themselves on the leaderboards (scores.js, daily.js): one line, sixteen characters at most,
// nothing that is a tag or a control character, and nothing offensive. An offensive name is not refused (the standing
// is still kept) but is shown as "Player". The file's name starts with an underscore, so Vercel does not serve it.
const STEMS = [
  // Whole stems that are seldom inside an ordinary word: "dick" is in Dickens, "cock" in Hancock, "rape" in grape.
  "fuck", "shit", "cunt", "bitch", "whore", "slut", "dickhead", "cocksuck", "pussy", "penis", "vagina", "porn", "rapist",
  "nazi", "hitler", "nigg", "fagg", "retard", "kike", "chink", "tranny", "wank", "twat", "asshole", "killyourself",
];
// Letters as they are disguised: digits and symbols for the letters they look like, and everything else dropped.
const LOOKS = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "!": "i", "|": "i" };
const plain = (text) => [...text.toLowerCase()].map((c) => LOOKS[c] ?? c).join("").replace(/[^a-z]/g, "").replace(/(.)\1+/g, "$1");

/** Whether a name is one the boards will not show. */
const offensive = (name) => { const p = plain(name); return STEMS.some((stem) => p.includes(stem.replace(/(.)\1+/g, "$1"))); };

/** A name as the boards keep it, or "" if there is none. */
const named = (value) => {
  const name = String(value ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
  return name && offensive(name) ? "Player" : name;
};

/** Standings reported by this many different people are taken off the board until the owner has looked at them. */
const HIDDEN_AFTER = 3;

module.exports = { named, offensive, HIDDEN_AFTER };
