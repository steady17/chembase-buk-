// Turns a ChemBot answer into text that sounds right when read aloud:
// formulas become words ("dy over dx equals 2x"), markdown symbols are dropped.

const GREEK = {
  alpha: "alpha", beta: "beta", gamma: "gamma", delta: "delta", epsilon: "epsilon", varepsilon: "epsilon",
  zeta: "zeta", eta: "eta", theta: "theta", kappa: "kappa", lambda: "lambda", mu: "mu", nu: "nu",
  xi: "xi", pi: "pi", rho: "rho", sigma: "sigma", tau: "tau", phi: "phi", varphi: "phi", chi: "chi",
  psi: "psi", omega: "omega", Gamma: "gamma", Delta: "delta", Theta: "theta", Lambda: "lambda",
  Sigma: "sigma", Phi: "phi", Psi: "psi", Omega: "omega", Pi: "pi",
};

const WORDS = {
  times: "times", cdot: "times", div: "divided by", pm: "plus or minus", mp: "minus or plus",
  approx: "approximately equal to", sim: "approximately", neq: "not equal to", ne: "not equal to",
  le: "less than or equal to", leq: "less than or equal to", ge: "greater than or equal to",
  geq: "greater than or equal to", ll: "much less than", gg: "much greater than",
  to: "gives", rightarrow: "gives", longrightarrow: "gives", Rightarrow: "implies", implies: "implies",
  leftarrow: "comes from", leftrightarrow: "goes both ways with", rightleftharpoons: "is in equilibrium with",
  infty: "infinity", int: "integral of", oint: "integral of", sum: "sum of", prod: "product of",
  partial: "partial", nabla: "del", ln: "natural log of", log: "log", exp: "e to the", sin: "sine of",
  cos: "cosine of", tan: "tangent of", sinh: "hyperbolic sine of", cosh: "hyperbolic cosine of",
  tanh: "hyperbolic tangent of", lim: "limit", max: "max", min: "min", circ: "degrees", degree: "degrees",
  propto: "is proportional to", in: "in", cdots: "and so on", ldots: "and so on", dots: "and so on",
  quad: " ", qquad: " ", hbar: "h bar", ell: "l", prime: "prime", dagger: "dagger", 
};

const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };
const SUB = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

function power(p) {
  p = p.trim();
  if (p === "2") return " squared ";
  if (p === "3") return " cubed ";
  const spoken = p.replace(/^[-−]/, "minus ").replace(/^\+/, "plus ");
  return " to the power of " + spoken + " ";
}


// ----- units, formulas and abbreviations -----
const UNIT_WORDS = {   // [plural, singular] - "joules per mole"
  kJ: ["kilojoules", "kilojoule"], J: ["joules", "joule"], kg: ["kilograms", "kilogram"], g: ["grams", "gram"], mg: ["milligrams", "milligram"],
  kmol: ["kilomoles", "kilomole"], mmol: ["millimoles", "millimole"], mol: ["moles", "mole"], L: ["litres", "litre"], mL: ["millilitres", "millilitre"],
  K: ["kelvin", "kelvin"], kPa: ["kilopascals", "kilopascal"], MPa: ["megapascals", "megapascal"], Pa: ["pascals", "pascal"],
  atm: ["atmospheres", "atmosphere"], kW: ["kilowatts", "kilowatt"], W: ["watts", "watt"], N: ["newtons", "newton"],
  km: ["kilometres", "kilometre"], cm: ["centimetres", "centimetre"], mm: ["millimetres", "millimetre"], m: ["metres", "metre"],
  min: ["minutes", "minute"], s: ["seconds", "second"], h: ["hours", "hour"], Hz: ["hertz", "hertz"], V: ["volts", "volt"],
};
const UNIT_NAMES = Object.keys(UNIT_WORDS).sort((a, b) => b.length - a.length).join("|");
// one unit, with an optional power:  m³   m^3   s^-1   s⁻¹
const TOK = "(?:" + UNIT_NAMES + ")(?:\\^\\s*[-−]?\\d|⁻?[¹²³])?";
// kg/m³   Pa·s   J/(mol·K)
const CHAIN_DOT = "(?:" + TOK + "\\s*\\/\\s*\\(\\s*" + TOK + "(?:\\s*[·⋅]\\s*" + TOK + ")*\\s*\\)|" + TOK + "(?:\\s*[·⋅]\\s*" + TOK + "|\\s*\\/\\s*" + TOK + ")*)";
// the same, but plain spaces also allowed:  J mol⁻¹ K⁻¹
const CHAIN_SP = TOK + "(?:(?:\\s*[·⋅]\\s*|\\s*\\/\\s*\\(?\\s*|\\s+)" + TOK + "\\)?)*";

// lengths read as "square metres" / "cubic metres"; everything else as "squared" / "cubed"
const LENGTHS = new Set(["m", "cm", "mm", "km"]);
function withPower(x, word) {
  if (LENGTHS.has(x.u) && (x.mag === 2 || x.mag === 3)) return (x.mag === 2 ? "square " : "cubic ") + word;
  return word + powWord(x.mag);
}
function powWord(n) { return n === 2 ? " squared" : n === 3 ? " cubed" : n > 3 ? " to the power of " + n : ""; }

// "J mol⁻¹ K⁻¹" -> "joules per mole per kelvin",  "h⁻¹" -> "per hour",  "kg/m³" -> "kilograms per metre cubed"
function speakChain(text, one) {
  const t = text.replace(/⁻¹/g, "^-1").replace(/⁻²/g, "^-2").replace(/⁻³/g, "^-3")
    .replace(/¹/g, "^1").replace(/²/g, "^2").replace(/³/g, "^3").replace(/\^\s*\{?\s*([-−]?\d)\s*\}?/g, "^$1").replace(/−/g, "-");
  const nums = [], dens = [];
  let afterSlash = false;
  const re = new RegExp("(\\/)|(" + UNIT_NAMES + ")(?:\\^(-?\\d))?", "g");
  let m;
  while ((m = re.exec(t))) {
    if (m[1]) { afterSlash = true; continue; }
    const exp = m[3] !== undefined ? parseInt(m[3], 10) : 1;
    const mag = Math.abs(exp);
    const bottom = afterSlash !== (exp < 0);
    (bottom ? dens : nums).push({ u: m[2], mag });
  }
  const numWords = nums.map((x, i) => withPower(x, UNIT_WORDS[x.u][i === nums.length - 1 && !one ? 0 : 1])).join(" ");
  const denWords = dens.map((x) => "per " + withPower(x, UNIT_WORDS[x.u][1])).join(" ");
  return [numWords, denWords].filter(Boolean).join(" ");
}
const hasNeg = (c) => /⁻|\^\s*[-−]/.test(c);

// Units written as a power-of-minus-one chain, anywhere in the text:  "mol h⁻¹"  "s^-1"
function negUnitChains(s) {
  return s.replace(new RegExp("(^|[^A-Za-z\\\\])(" + CHAIN_SP + ")(?![A-Za-z])", "g"),
    (m, pre, chain) => (hasNeg(chain) ? pre + " " + speakChain(chain) + " " : m));
}
// "285.8 kJ/mol" -> "285.8 kilojoules per mole"   (only straight after a number)
function expandUnits(s) {
  return s.replace(new RegExp("(\\d[\\d.,]*)\\s*(" + CHAIN_DOT + ")(?![A-Za-z0-9])", "g"), (_, d, u) => d + " " + speakChain(u, d === "1"));
}
// column titles like "Density (kg/m³)" and "Rate (mol/L/h)"
function bracketUnits(s) {
  return s.replace(new RegExp("\\(\\s*(" + CHAIN_SP + ")\\s*\\)", "g"), (m, c, off, str) =>
    ((/[\/\^²³·⋅]/.test(c) || /[A-Za-z]{2,}/.test(c)) && str[off - 1] !== "/") ? ", in " + speakChain(c) + "," : m);
}
// a roman-type group inside a formula, e.g. \text{kJ/mol} or \mathrm{J\,mol^{-1}}: if it is only units, say them as units
function unitOnly(inner) {
  const clean = inner.replace(/\\[,;:! ]/g, " ").replace(/\\cdot/g, "·").trim();
  return new RegExp("^" + CHAIN_SP + "$").test(clean) ? speakChain(clean) : inner;
}

const KNOWN_FORMULAS = { NaCl: "sodium chloride", NaOH: "sodium hydroxide", KOH: "potassium hydroxide", CaCO3: "calcium carbonate" };
const SPELL = new Set(["CSTR", "PFR", "PQ", "PQs", "CGPA", "GPA", "BUK", "NSChE", "SIWES", "NSE", "LPG", "CNG", "PVC", "CFD", "PID", "HETP", "LMTD", "COD", "BOD", "TDS"]);
const spellOne = (tok) => tok.replace(/([A-Z][a-z]?)(\d*)/g, (m, el, d) => el.toUpperCase().split("").join(" ") + (d ? " " + d : "") + " ").trim();
// "H2SO4" -> "H 2 S O 4", "HCl" -> "H C L", "CSTR" -> "C S T R", "2H2O" -> "2 H 2 O", "O2" -> "O 2"
function spellFormulas(s) {
  s = s.replace(/\b(\d*)((?:[A-Z][a-z]?\d*){2,})\b/g, (m, coef, tok) => {
    if (KNOWN_FORMULAS[tok]) return (coef ? coef + " " : "") + KNOWN_FORMULAS[tok];
    if (!(SPELL.has(tok) || /[a-z\d]/.test(tok))) return m;
    return (coef ? coef + " " : "") + spellOne(tok);
  });
  return s.replace(/\b(\d*)([A-Z][a-z]?)(\d+)\b/g, (m, c, el, d) => (c ? c + " " : "") + el.toUpperCase().split("").join(" ") + " " + d);
}
function expandAbbreviations(s) {
  return s.replace(/\be\.g\./gi, "for example").replace(/\bi\.e\./gi, "that is").replace(/\betc\.(?=\s+[A-Z])/g, "and so on.").replace(/\betc\./gi, "and so on")
    .replace(/\bvs\./gi, "versus").replace(/\bapprox\./gi, "approximately").replace(/\bFig\./g, "Figure")
    .replace(/\bEqs?\./g, "Equation").replace(/\bNo\.\s?(?=\d)/g, "number ");
}


// Dotted letters mean flow rates in Chemical Engineering, so say what they mean:
//   ṁ -> "mass flow rate",  ṁ_in -> "inlet mass flow rate",  ṁ_A -> "mass flow rate of A"
const RATE_NAMES = { m: "mass flow rate", n: "molar flow rate", V: "volumetric flow rate", Q: "heat transfer rate", W: "work rate", E: "energy rate" };
function dotPhrase(letter, sub) {
  const base = RATE_NAMES[letter];
  const sb = (sub || "").replace(/[{}\s\\]/g, "");
  if (!base) return " " + letter + " dot" + (sb ? " " : " ");
  if (!sb) return " " + base + " ";
  const low = sb.toLowerCase();
  if (low === "in" || low === "inlet" || low === "feed" || low === "f") return " " + (low === "f" || low === "feed" ? "feed " : "inlet ") + base + " ";
  if (low === "out" || low === "outlet") return " outlet " + base + " ";
  if (low === "gen") return " " + base + " of generation ";
  if (low === "cv" || low === "sys") return " " + base + " of the system ";
  if (/^\d+$/.test(sb)) return " " + base + " " + sb + " ";
  return " " + base + " of " + sb + " ";
}

// LaTeX -> plain spoken words
export function mathToWords(tex) {
  let s = " " + tex + " ";
  s = s.replace(/\^\s*\{\s*([-−]?\d)\s*\}/g, "^$1");
  // accents on a letter:  \dot{m} -> "m dot",  \bar{x} -> "x bar",  \vec{F} -> "vector F"
  s = s.replace(/\\ddot\s*\{([^{}]*)\}|\\ddot\s*([A-Za-z])/g, (_, a, b) => " " + (a || b) + " double dot ");
  s = s.replace(/\\dot\s*(?:\{([^{}]*)\}|([A-Za-z]))(?:\s*_\s*(?:\{([^{}]*)\}|([A-Za-z0-9])))?/g, (_, a, b, c, d) => dotPhrase(a || b, c || d));
  s = s.replace(/\\(?:bar|overline)\s*\{([^{}]*)\}|\\bar\s*([A-Za-z])/g, (_, a, b) => " " + (a || b) + " bar ");
  s = s.replace(/\\(?:hat|widehat)\s*\{([^{}]*)\}|\\hat\s*([A-Za-z])/g, (_, a, b) => " " + (a || b) + " hat ");
  s = s.replace(/\\(?:tilde|widetilde)\s*\{([^{}]*)\}|\\tilde\s*([A-Za-z])/g, (_, a, b) => " " + (a || b) + " tilde ");
  s = s.replace(/\\vec\s*\{([^{}]*)\}|\\vec\s*([A-Za-z])/g, (_, a, b) => " vector " + (a || b) + " ");
  // \text{J mol}^{-1}  ->  \text{J mol^{-1}}  (the power belongs to the last unit)
  s = s.replace(/\\(text|mathrm)\s*\{([^{}]*)\}\s*\^\s*\{?\s*([-−]?\d)\s*\}?/g, (_, w, c, e) => "\\" + w + "{" + c.trimEnd() + "^" + e + "}");
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|textbf|textit|operatorname|mathcal|boldsymbol)\s*\{([^{}]*)\}/g, (_, t) => " " + unitOnly(t) + " ");
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg)\b\s*/g, " ");
  s = s.replace(/\\[,;:!]/g, " ").replace(/\\ /g, " ").replace(/\\cdot(?=\s*[A-Za-z])/g, "·");
  s = s.replace(/\\\\/g, " ");
  s = s.replace(/\^\s*\{\s*([-−]?\d)\s*\}/g, "^$1");
  s = negUnitChains(s);
  // 0.05(100 - D) -> "0.05 times (100 - D)"
  s = s.replace(/(^|[^A-Za-z_0-9.])(\d+(?:\.\d+)?)\s*\(/g, "$1$2 times (").replace(/\)\s*\(/g, ") times (");
  s = s.replace(/&/g, " ");
  // limits: \int_0^1 -> "integral from 0 to 1 of"
  const strip = (x) => x.replace(/^\{|\}$/g, "");
  s = s.replace(/\\(int|sum|prod)\s*_\s*(\{[^{}]*\}|[^\s{}\\^])\s*\^\s*(\{[^{}]*\}|[^\s{}\\])/g,
    (_, w, a, b) => " " + (w === "int" ? "integral" : w === "sum" ? "sum" : "product") + " from " + strip(a) + " to " + strip(b) + " of ");
  // fractions, innermost first
  for (let i = 0; i < 12; i++) {
    const before = s;
    s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, " $1 over $2 ");
    s = s.replace(/\\sqrt\s*\[(\d+)\]\s*\{([^{}]*)\}/g, " root $1 of $2 ");
    s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, " square root of $1 ");
    s = s.replace(/\\sqrt\s*([A-Za-z0-9])/g, " square root of $1 ");
    s = s.replace(/\^\s*\{([^{}]*)\}/g, (_, p) => power(p));
    s = s.replace(/\^\s*(-?[A-Za-z0-9])/g, (_, p) => power(p));
    s = s.replace(/_\s*\{([^{}]*)\}/g, (_, b) => (/^\d+$/.test(b.trim()) ? b.trim() : " sub " + b + " "));
    s = s.replace(/_\s*([A-Za-z0-9])/g, (_, b) => (/^\d$/.test(b) ? b : " sub " + b + " "));
    if (s === before) break;
  }
  s = s.replace(/\\([A-Za-z]+)/g, (_, w) => {
    if (GREEK[w]) return " " + GREEK[w] + " ";
    if (Object.prototype.hasOwnProperty.call(WORDS, w)) return " " + WORDS[w] + " ";
    return " " + w + " ";
  });
  s = s.replace(/\\%/g, " percent ").replace(/\\([{}])/g, " ").replace(/\\./g, " ");
  s = s.replace(/[{}$]/g, " ");
  s = s.replace(/≤/g, " less than or equal to ").replace(/≥/g, " greater than or equal to ").replace(/≈/g, " approximately equal to ");
  s = s.replace(/=/g, " equals ").replace(/\+/g, " plus ").replace(/[−–]/g, " minus ");
  s = s.replace(/(^|[\s(=,])-(?=[\dA-Za-z(])/g, "$1 minus ").replace(/-/g, " minus ");
  s = s.replace(/\*/g, " times ").replace(/\//g, " divided by ").replace(/</g, " less than ").replace(/>/g, " greater than ");
  for (let i = 0; i < 6; i++) {
    const before = s;
    s = s.replace(/\(([^()]*)\)/g, (m, inner) => (/ (plus|minus|equals|over|times|divided by) /.test(" " + inner + " ") ? " , " + inner + " , " : " " + inner + " "));
    if (s === before) break;
  }
  s = s.replace(/[()\[\]|]/g, " ").replace(/\s+/g, " ").replace(/^[\s,]+|[\s,]+$/g, "");
  return s;
}

function unicodeToWords(s) {
  s = s.replace(/([⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (m) => power(m.split("").map((c) => SUP[c] || c).join("")));
  s = s.replace(/[₀₁₂₃₄₅₆₇₈₉]+/g, (m) => m.split("").map((c) => SUB[c] || c).join(""));
  return s
    .replace(/×/g, " times ").replace(/÷/g, " divided by ").replace(/±/g, " plus or minus ")
    .replace(/≈/g, " approximately equal to ").replace(/≠/g, " not equal to ")
    .replace(/≤/g, " less than or equal to ").replace(/≥/g, " greater than or equal to ")
    .replace(/→|⟶/g, " gives ").replace(/⇌/g, " is in equilibrium with ").replace(/⇒/g, " implies ")
    .replace(/°C/g, " degrees Celsius").replace(/°F/g, " degrees Fahrenheit").replace(/°/g, " degrees ")
    .replace(/Δ/g, "delta ").replace(/μ/g, "mu ").replace(/π/g, " pi ").replace(/ρ/g, " rho ")
    .replace(/(^|[\s(])−(?=\d)/g, "$1minus ").replace(/−/g, " minus ")
    .replace(/\s=\s/g, " equals ").replace(/\s\+\s/g, " plus ")
    .replace(/%/g, " percent");
}

export function speakable(md) {
  let s = String(md || "");
  s = s.replace(/```[\s\S]*?```/g, " The code is shown on screen. ");
  s = s.normalize("NFC");
  s = s.replace(/[\u2460-\u2473]/g, (c) => " " + (c.charCodeAt(0) - 0x245f) + " ");                 // circled numbers
  s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{25A0}-\u{25FF}\u{2300}-\u{23FF}\u{2500}-\u{257F}\u{FE0F}\u{FE0E}\u{20E3}\u{200D}\u{2022}\u{2023}]/gu, "");
  s = s.replace(/([A-Za-z])[\u0307\u02D9](?:_\{?([A-Za-z0-9]+)\}?)?/g, (_, l, sub) => dotPhrase(l, sub)).replace(/([A-Za-z])\u0308/g, "$1 double dot ").replace(/([A-Za-z])[\u0304\u00AF]/g, "$1 bar ");
  s = s.replace(/([\u1E40\u1E41\u1E44\u1E45\u1E56\u1E57\u1E58\u1E59\u1E86\u1E87\u1E8A\u1E8B\u1E8E\u1E8F])(?:_\{?([A-Za-z0-9]+)\}?)?/g, (_, c, sub) => dotPhrase(({ "\u1E40": "M", "\u1E41": "m", "\u1E44": "N", "\u1E45": "n", "\u1E56": "P", "\u1E57": "p", "\u1E58": "R", "\u1E59": "r", "\u1E86": "W", "\u1E87": "w", "\u1E8A": "X", "\u1E8B": "x", "\u1E8E": "Y", "\u1E8F": "y" })[c], sub));

  // maths first, so its symbols are not touched by the markdown clean-up
  const done = (tex) => " " + mathToWords(tex) + " ";
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => done(t));
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => done(t));
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => done(t));
  s = s.replace(/\$([^$\n]+?)\$/g, (_, t) => done(t));
  // tables: read every row, naming the column for each value:  "Water: Density 1000, Viscosity 0.001."
  {
    const out = []; let rows = [];
    const flush = () => {
      if (!rows.length) return;
      const head = rows[0], body = rows.slice(1);
      out.push("Table.");
      if (!body.length) out.push(head.join(", ") + ".");
      body.forEach((r) => {
        const pairs = r.slice(1).map((c, i) => {
          const h = head[i + 1] || "";
          const um = h.match(/^(.*?)\s*\(([^)]*)\)\s*$/);                       // "Density (kg/m³)"
          if (um && new RegExp("^" + CHAIN_SP + "$").test(um[2].trim()) && c) return (um[1] + " " + c + " " + speakChain(um[2])).trim();
          return ((h && head.length > 2 ? h + " " : "") + c).trim();   // 2-column tables: just "label: value"
        }).filter(Boolean);
        const lead = /^\d+$/.test(r[0] || "") && head[0] ? head[0] + " " : "";   // "Step 1: ..."
        out.push((r[0] ? lead + r[0] + (pairs.length ? ": " : "") : "") + pairs.join(", ") + ".");
      });
      out.push("End of table.");
      rows = [];
    };
    for (const line of s.split("\n")) {
      if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-")) continue;
      if (/^\s*\|.*\|\s*$/.test(line)) rows.push(line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      else { flush(); out.push(line); }
    }
    flush();
    s = out.join("\n");
  }
  s = s.replace(/`([^`]*)`/g, "$1");
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/https?:\/\/\S+/g, " link ");
  s = s.replace(/^\s{0,3}#{1,6}\s*(.+)$/gm, "$1.");
  s = s.replace(/^\s*>\s?/gm, "").replace(/^\s*[-*•]\s+/gm, "").replace(/^\s*-{3,}\s*$/gm, "");
  s = s.replace(/\*\*|__|\*|~~/g, "");
  s = expandAbbreviations(s);
  s = negUnitChains(s);
  s = expandUnits(s);
  s = bracketUnits(s);
  s = s.replace(/(\w|\))\^\{?(-?\d+|[A-Za-z])\}?/g, (m, b, p) => b + power(p));      // x^2, 10^6 written without LaTeX
  s = s.replace(/(^|[\s(])~(?=\s?\d)/g, "$1approximately ").replace(/ > /g, " greater than ").replace(/ < /g, " less than ");
  s = s.replace(/\b(\d+):(\d+)\b/g, (m, a, b) => (b.length === 2 && +a <= 24 && +b < 60 ? m : a + " to " + b));   // 1:2 -> "1 to 2", 3:30 stays a time
  s = expandUnits(s);
  s = unicodeToWords(s);
  s = s.replace(/\bChE\b/g, "Chemical Engineering");
  s = spellFormulas(s);
  s = s.replace(/([^.!?:;,\s])[ \t]*\n+/g, "$1. ").replace(/\n+/g, " ");
  return s.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").replace(/\s+([.,!?;:])/g, "$1").replace(/,\s*,/g, ",").replace(/\.\s*\./g, ".").trim();
}

// Browsers stop long speech after a while, so read it in small pieces.
export function speechChunks(md, max = 160) {
  const text = speakable(md);
  if (!text) return [];
  // cut only where punctuation is followed by a space, so 0.5 and 3:30 stay in one piece
  const sentences = text.match(/.+?(?:[.!?;:]+(?=\s|$)|$)/g) || [text];
  const out = [];
  let cur = "";
  const push = (p) => { if (p.trim()) out.push(p.trim()); };
  for (const sent of sentences) {
    if (sent.length > max) {
      push(cur); cur = "";
      let rest = sent;
      while (rest.length > max) {
        let cut = rest.lastIndexOf(",", max);
        if (cut < 40) cut = rest.lastIndexOf(" ", max);
        if (cut < 1) cut = max;
        push(rest.slice(0, cut + 1)); rest = rest.slice(cut + 1);
      }
      cur = rest;
    } else if ((cur + sent).length > max) { push(cur); cur = sent; }
    else cur += sent;
  }
  push(cur);
  return out;
}

// Choose the most natural English voice the phone has.
export function pickVoice(voices) {
  const en = (voices || []).filter((v) => /^en([-_]|$)/i.test(v.lang));
  if (!en.length) return null;
  const rank = (v) => {
    let r = 0;
    if (/natural|neural|online|enhanced|premium/i.test(v.name)) r += 50;
    if (/google/i.test(v.name)) r += 20;
    if (/^en[-_](NG|GB)/i.test(v.lang)) r += 10;
    else if (/^en[-_]US/i.test(v.lang)) r += 8;
    if (v.localService === false) r += 3;
    return r;
  };
  return en.slice().sort((a, b) => rank(b) - rank(a))[0];
}

// ---------- Sharing / copying ----------
// Plain text that reads well in WhatsApp and other chat apps: formulas use
// real symbols (x², ΔH, ½-style fractions) instead of raw LaTeX.
const SUPCH = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "−": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ" };
const SUBCH = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎", a: "ₐ", e: "ₑ", o: "ₒ", x: "ₓ", h: "ₕ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ", p: "ₚ", s: "ₛ", t: "ₜ" };
const GREEK_SYM = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ",
  kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", varphi: "φ",
  chi: "χ", psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω", Pi: "Π",
};
const SYM = {
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓", approx: "≈", neq: "≠", ne: "≠", le: "≤", leq: "≤", ge: "≥", geq: "≥",
  to: "→", rightarrow: "→", longrightarrow: "→", Rightarrow: "⇒", implies: "⇒", leftarrow: "←", leftrightarrow: "↔",
  rightleftharpoons: "⇌", infty: "∞", int: "∫", oint: "∮", sum: "Σ", prod: "Π", partial: "∂", nabla: "∇", circ: "°", degree: "°",
  propto: "∝", sim: "~", ll: "≪", gg: "≫", cdots: "…", ldots: "…", dots: "…", hbar: "ħ", prime: "′",
  ln: "ln", log: "log", exp: "exp", sin: "sin", cos: "cos", tan: "tan", sinh: "sinh", cosh: "cosh", tanh: "tanh", lim: "lim", max: "max", min: "min",
};

const SPACED = new Set(["times","cdot","div","pm","mp","approx","neq","ne","le","leq","ge","geq","to","rightarrow","longrightarrow","Rightarrow","implies","leftarrow","leftrightarrow","rightleftharpoons","propto","sim","ll","gg"]);

function mapAll(str, table) {
  let out = "";
  for (const c of str) { if (!table[c]) return null; out += table[c]; }
  return out;
}

export function mathToSymbols(tex) {
  let s = " " + tex + " ";
  s = s.replace(/\\dot\s*\{([^{}]*)\}|\\dot\s*([A-Za-z])/g, (_, a, b) => (a || b) + "\u0307");
  s = s.replace(/\\(?:bar|overline)\s*\{([^{}]*)\}|\\bar\s*([A-Za-z])/g, (_, a, b) => (a || b) + "\u0304");
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|textbf|textit|operatorname|mathcal|boldsymbol)\s*\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg)\b\s*/g, "");
  s = s.replace(/\\[,;:!]/g, " ").replace(/\\ /g, " ").replace(/\\\\/g, " ; ").replace(/&/g, " ");
  const one = (x) => /^[A-Za-z0-9.]+$/.test(x.trim());
  for (let i = 0; i < 12; i++) {
    const before = s;
    s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a, b) => (one(a) ? a.trim() : "(" + a.trim() + ")") + "/" + (one(b) ? b.trim() : "(" + b.trim() + ")"));
    s = s.replace(/\\sqrt\s*\[(\d+)\]\s*\{([^{}]*)\}/g, (_, n, x) => (n === "3" ? "∛" : n === "4" ? "∜" : n + "√") + "(" + x + ")");
    s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_, x) => (one(x) ? "√" + x.trim() : "√(" + x.trim() + ")"));
    s = s.replace(/\\sqrt\s*([A-Za-z0-9])/g, "√$1");
    s = s.replace(/\^\s*\{([^{}]*)\}/g, (_, p) => mapAll(p.replace(/\s/g, ""), SUPCH) ?? "^(" + p.trim() + ")");
    s = s.replace(/\^\s*(-?[A-Za-z0-9])/g, (_, p) => mapAll(p, SUPCH) ?? "^" + p);
    s = s.replace(/_\s*\{([^{}]*)\}/g, (_, b) => mapAll(b.replace(/\s/g, ""), SUBCH) ?? "_(" + b.trim() + ")");
    s = s.replace(/_\s*([A-Za-z0-9])/g, (_, b) => mapAll(b, SUBCH) ?? "_" + b);
    if (s === before) break;
  }
  s = s.replace(/\\([A-Za-z]+) ?/g, (_, w) => {
    if (GREEK_SYM[w]) return GREEK_SYM[w];
    if (Object.prototype.hasOwnProperty.call(SYM, w)) {
      if (/^[a-z]+$/.test(SYM[w])) return SYM[w] + " ";
      return SPACED.has(w) ? " " + SYM[w] + " " : SYM[w];
    }
    return w + " ";
  });
  s = s.replace(/\\%/g, "%").replace(/\\([{}])/g, "$1").replace(/\\./g, " ");
  s = s.replace(/[{}$]/g, "");
  return s.replace(/\s+/g, " ").trim();
}

export function shareable(md) {
  let s = String(md || "");
  const keep = [];
  s = s.replace(/```[\s\S]*?```/g, (m) => { keep.push(m); return `\u0000${keep.length - 1}\u0000`; });
  s = s.replace(/[ \t]*\$\$([\s\S]+?)\$\$[ \t]*/g, (_, t) => "\n" + mathToSymbols(t) + "\n");
  s = s.replace(/[ \t]*\\\[([\s\S]+?)\\\][ \t]*/g, (_, t) => "\n" + mathToSymbols(t) + "\n");
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => mathToSymbols(t));
  s = s.replace(/\$([^$\n]+?)\$/g, (_, t) => mathToSymbols(t));
  s = s.split("\n").map((line) => {
    if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-")) return null;
    if (/^\s*\|.*\|\s*$/.test(line)) return line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()).join("  |  ");
    return line;
  }).filter((l) => l !== null).join("\n");
  s = s.replace(/^\s{0,3}#{1,6}\s*(.+?)\s*#*\s*$/gm, "*$1*");   // headings -> WhatsApp bold
  s = s.replace(/\*\*([^*]+)\*\*/g, "*$1*");                       // bold -> WhatsApp bold
  s = s.replace(/^\s*[-*]\s+/gm, "• ");
  s = s.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]);
}
