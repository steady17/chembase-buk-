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
  dm: ["decimetres", "decimetre"], MJ: ["megajoules", "megajoule"], km: ["kilometres", "kilometre"], cm: ["centimetres", "centimetre"], mm: ["millimetres", "millimetre"], m: ["metres", "metre"],
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
const LENGTHS = new Set(["m", "cm", "mm", "km", "dm"]);
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

// ── Chemical formulas ──────────────────────────────────────────────────────
// "Al2(SO4)3" -> "A L 2, S O 4 taken 3 times"     "Ca2+" -> "C A 2 plus"     "[H+]" -> "concentration of H plus"
const ELEMENTS = new Set("H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" "));
// Well-known compounds are named when written on their own (no number in front).
const KNOWN_FORMULAS = { NaCl: "sodium chloride", NaOH: "sodium hydroxide", KOH: "potassium hydroxide", CaCO3: "calcium carbonate",
  HCl: "hydrochloric acid", H2SO4: "sulphuric acid", HNO3: "nitric acid", H3PO4: "phosphoric acid", H2O: "water", CO2: "carbon dioxide",
  NH3: "ammonia", CH4: "methane", H2O2: "hydrogen peroxide", NaHCO3: "sodium bicarbonate", CaO: "calcium oxide", "Ca(OH)2": "calcium hydroxide",
  KMnO4: "potassium permanganate", Na2CO3: "sodium carbonate", CuSO4: "copper sulphate", KCl: "potassium chloride", MgO: "magnesium oxide",
  SO2: "sulphur dioxide", H2S: "hydrogen sulphide", NO2: "nitrogen dioxide", C2H5OH: "ethanol", CH3OH: "methanol", C6H12O6: "glucose" };
const LONE = new Set("Fe Cu Ag Au Zn Pb Hg Mg Ca Na Li Al Si Cl Br Ni Mn Cr Sn Ti Pt Pd Cd Ba Sr Cs Rb Ar Ne Kr Xe Rn".split(" "));
const spellSym = (sym) => sym.toUpperCase().split("").join(" ");
// parse "Al2(SO4)3" -> spoken words, or null when it is not a real formula
function formulaWords(body) {
  const out = []; let i = 0, symbols = 0, digits = false;
  while (i < body.length) {
    const c = body[i];
    if (c === "(") {
      const j = body.indexOf(")", i);
      if (j < 0) return null;
      const inner = formulaWords(body.slice(i + 1, j));
      if (inner === null) return null;
      symbols += inner.n; let k = j + 1, num = "";
      while (/\d/.test(body[k] || "")) num += body[k++];
      if (num) digits = true;
      out.push(", " + inner.t + (num ? " taken " + num + " times" : "") + ","); i = k;
    } else if (/[A-Z]/.test(c)) {
      let sym = c; if (/[a-z]/.test(body[i + 1] || "")) sym += body[i + 1];
      if (!ELEMENTS.has(sym)) { if (sym.length === 2 && ELEMENTS.has(c)) sym = c; else return null; }
      i += sym.length; symbols++; out.push(spellSym(sym));
      let num = ""; while (/\d/.test(body[i] || "")) num += body[i++];
      if (num) { digits = true; out.push(num); }
    } else return null;
  }
  return { t: out.join(" ").replace(/\s+,/g, ",").replace(/,\s*,/g, ","), n: symbols, digits };
}
// spoken formulas found inside LaTeX wait here (as plain letters) until the whole text is cleaned, then go back in
let CHEM_STORE = [];
const alpha = (n) => { let r = ""; do { r = String.fromCharCode(97 + (n % 26)) + r; n = Math.floor(n / 26); } while (n > 0); return r; };
const unalpha = (t) => [...t].reduce((a, c) => a * 26 + (c.charCodeAt(0) - 97), 0);
const clean = (t) => t.replace(/^,\s*/, "").replace(/,\s*$/, "");
const chargeWords = (c) => {
  const m = /^(\d*)([+\-−])$/.exec(c); if (!m) return "";
  return " " + (m[1] && m[1] !== "1" ? m[1] + " " : "") + (m[2] === "+" ? "plus" : "minus");
};
const ELNAMES = { H: "hydrogen", C: "carbon", N: "nitrogen", O: "oxygen", P: "phosphorus", S: "sulphur", Cl: "chlorine", I: "iodine", K: "potassium", Na: "sodium",
  Fe: "iron", Cu: "copper", Mn: "manganese", Cr: "chromium", Pb: "lead", Sn: "tin", Hg: "mercury", Co: "cobalt", Ni: "nickel", Ti: "titanium", V: "vanadium",
  Au: "gold", Ag: "silver", Ce: "cerium", Pt: "platinum", Os: "osmium", Ru: "ruthenium", Ir: "iridium", U: "uranium", Pu: "plutonium", Th: "thorium", Ra: "radium",
  Rn: "radon", Cs: "caesium", Sr: "strontium", Tc: "technetium", Am: "americium", Zn: "zinc", Al: "aluminium", Mg: "magnesium", Ca: "calcium", Li: "lithium", He: "helium" };
function chemPrep(s) {
  const NAMES = ELNAMES;
  const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
  const SUPD = "⁰¹²³⁴⁵⁶⁷⁸⁹", supNum = (t) => t.split("").map((c) => SUP[c]).join("");
  // isotopes: ¹⁴C, ^{14}C, ^14C, U-235, I-131  ->  "carbon 14", "uranium 235"
  s = s.replace(/(^|[^A-Za-z0-9])([⁰¹²³⁴⁵⁶⁷⁸⁹]{1,3})([A-Z][a-z]?)(?![a-z])/g, (m, p, d, el) => p + (NAMES[el] || spellSym(el)) + " " + supNum(d) + " ");
  s = s.replace(/(^|[^A-Za-z0-9])\^\{?(\d{1,3})\}?\s?([A-Z][a-z]?)(?![a-z])/g, (m, p, d, el) => ELEMENTS.has(el) ? p + (NAMES[el] || spellSym(el)) + " " + d + " " : m);
  s = s.replace(/\b(U|Pu|Th|Ra|Rn|Cs|Sr|Tc|Co|I|C|K|Am)-(\d{2,3})\b/g, (m, el, d) => NAMES[el] + " " + d);
  // oxidation states: Fe(III) -> "iron 3",  iron(III) -> "iron 3"
  s = s.replace(/\b([A-Z][a-z]?)\(\s?(VIII|VII|VI|IV|IX|III|II|X|V|I)\s?\)/g, (m, el, r) => NAMES[el] ? NAMES[el] + " " + ROMAN[r] : m);
  s = s.replace(/\b([a-z]{3,})\(\s?(VIII|VII|VI|IV|IX|III|II|X|V|I)\s?\)/g, (m, w, r) => w + " " + ROMAN[r]);
  // standard-state symbols:  ΔH°, ΔHf°, ΔG°f, ΔS° , E°
  const QTY = { H: "enthalpy", G: "Gibbs free energy", S: "entropy" }, OF = { f: " of formation", c: " of combustion", r: " of reaction", rxn: " of reaction", vap: " of vaporisation", fus: " of fusion" };
  s = s.replace(/Δ\s?([HGS])\s?_?\{?(f|c|r|rxn|vap|fus)?\}?\s?°\s?_?\{?(f|c|r|rxn)?\}?/g, (m, q, a, b) => " standard " + QTY[q] + (OF[a || b] || " change") + " ");
  s = s.replace(/(^|[^A-Za-z])E°/g, "$1standard electrode potential E ");
  // pK_a, pH-like subscripts
  s = s.replace(/\bpK_\{?([A-Za-z0-9]+)\}?/g, (m, b) => "p K " + subWord(b));
  // percent by weight / volume, molarity
  s = s.replace(/\bw\/w\b/g, "weight by weight").replace(/\bv\/v\b/g, "volume by volume").replace(/\bw\/v\b/g, "weight by volume").replace(/\bv\/w\b/g, "volume by weight");
  s = s.replace(/(\d)\s?mM\b/g, "$1 millimolar").replace(/(\d)\s?[µμ]M\b/g, "$1 micromolar").replace(/(\d)\s?M(?![A-Za-z0-9])/g, "$1 molar");
  // double and triple bonds between carbons: CH2=CH2, HC≡CH
  s = s.replace(/\b(C[H\d]*)=(?=C[H\d]*\b)/g, "$1 double bond ").replace(/\b(H?C[H\d]*)≡(?=C[H\d]*\b)/g, "$1 triple bond ");
  // bonds written with hyphens: CH3-CH2-OH, NaCl-H2O, a leading -COOH / -NH2
  s = s.replace(/\bR-(?=[A-Z])/g, "R ");
  s = s.replace(/(^|\s)-(?=(?:COOH|OH|NH2|CHO|CH3|NO2|SH|CN|CO|NH)(?![A-Za-z0-9]))/g, "$1");
  for (let k = 0; k < 3; k++) s = s.replace(/\b([A-Za-z0-9()]*[A-Za-z0-9)])-([A-Z][A-Za-z0-9()]*)\b/g, (m, a, b) => {
    const fa = formulaWords(a), fb = formulaWords(b);
    const ok = (f, x) => f && (f.n >= 2 || f.digits || LONE.has(x));
    return ok(fa, a) && ok(fb, b) ? a + ", " + b : m;
  });
  // m3 -> m³, mol-1 -> mol⁻¹ (typed without superscripts)
  s = s.replace(/(\d\s?|\/)(mm|cm|km|dm|m)([23])(?![A-Za-z0-9])/g, (m, p, u, n) => p + u + (n === "2" ? "²" : "³"))
       .replace(/\b(mol|s|h|min|K|kg|g|L|J|W|Pa|m)-([12])(?![\d.])/g, (m, u, n) => u + (n === "1" ? "⁻¹" : "⁻²"));
  // SO4(2-)  CO3(2-)
  s = s.replace(/([A-Z][a-z]?\d*)\((\d*[+\-−])\)/g, (m, a, c) => a + "\uE005" + c);
  // Ca^2+ , SO4^2- , PO4^{3-}  (a charge, not a power)
  s = s.replace(/([A-Z][a-z]?\d*|\))\^\{?(\d*)([+\-−])\}?(?![A-Za-z0-9])/g, (m, a, d, sg) => a + "\uE005" + d + sg);
  // subscripts and superscript charges written as unicode -> plain characters
  s = s.replace(/([A-Za-z)\]])([₀-₉]+)/g, (m, a, d) => a + d.split("").map((c) => SUB[c]).join(""));
  s = s.replace(/([A-Za-z0-9)\]])[\^\uE005]?\{?([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻])\}?(?![⁰¹²³⁴⁵⁶⁷⁸⁹])/g, (m, a, d, sg) => a + "\uE005" + d.split("").map((c) => SUP[c]).join("") + SUP[sg]);
  s = s.replace(/([\d)])[·•]\s?(?=\d*[A-Z])/g, "$1 dot ");
  s = s.replace(/(\d)\s?e[\^\uE005]?\{?-\}?(?![A-Za-z0-9{])/g, (m, d) => d + (d === "1" ? " electron " : " electrons ")).replace(/(^|[^A-Za-z0-9])e[\^\uE005]?\{?-\}?(?![A-Za-z0-9{])/g, "$1electron ").replace(/\b(NO|SO)x\b/g, (m, a) => spellSym(a) + " x");
  // complex ions: [Fe(CN)6]3-  [Cu(NH3)4]2+
  s = s.replace(/\[([A-Z][A-Za-z0-9()]*)\][\^\uE005]?\{?(\d*[+\-−])\}?(?![A-Za-z0-9])/g, (m, inner, ch) => {
    const f = formulaWords(inner);
    return f ? " complex " + clean(f.t) + chargeWords(ch) + " " : m;
  });
  // species in square brackets are concentrations:  [H+], [OH-], [C][D]/[A][B]
  {
    const one = (inner) => {
      const mm = /^(.*?)(?:[\^\uE005]?(\d*[+\-−]))?$/.exec(inner);
      if (/^[A-Z]$/.test(mm[1])) return "concentration of " + mm[1] + chargeWords(mm[2] || "");
      const f = formulaWords(mm[1]);
      if (!f || (!mm[2] && f.n < 2 && !f.digits)) return null;
      return "concentration of " + clean(f.t) + chargeWords(mm[2] || "");
    };
    s = s.replace(/(?:\[[A-Z][A-Za-z0-9()^\uE005+\-−]*\])+/g, (run) => {
      const parts = run.slice(1, -1).split("][").map(one);
      return parts.includes(null) ? run : " " + parts.join(" times ") + " ";
    });
    s = s.replace(/(concentration of [^/]*?)\s*\/\s*(?=concentration of)/g, "$1, divided by ");
  }
  return s;
}
function chemFormulas(s, wrap) {
  s = chemPrep(s);
  s = s.replace(/(^|[^A-Za-z0-9_.\\])(\d*)((?:(?:[A-Z][a-z]?|\((?:[A-Z][a-z]?\d*)+\))\d*)+)([\^\uE005]?\{?\d*[+\-−]\}?)?(?:\((aq|g|l|s)\))?(?![A-Za-z0-9])/g, (m, pre, coef, body, ch, st) => {
    let charge = (ch || "").replace(/[\^\uE005{}]/g, "");
    // "Ca2+" / "SO42-": the digits just before the sign belong to the charge
    if (charge && charge.length === 1) {
      const t = /^([A-Za-z()]+?[A-Za-z)])(\d+)$/.exec(body);
      if (t && /^[A-Z][a-z]?$/.test(t[1])) { body = t[1]; charge = t[2] + charge; }                       // single element: Ca2+
      else { const u = /^(.*[A-Za-z)])(\d{2,})$/.exec(body); if (u) { body = u[1] + u[2].slice(0, -1); charge = u[2].slice(-1) + charge; } }   // SO42-
    }
    let open = "", close = "";
    const w = /^\(([^()]*)\)$/.exec(body);
    if (w) { body = w[1]; open = "("; close = ")"; }
    const f = formulaWords(body);
    if (!f) return m;
    if (f.n < 2 && !f.digits && !charge && !coef && !(LONE.has(body) && body.length === 2)) return m;   // a lone "I", "He", "As" is just a word
    const name = !coef && !charge && KNOWN_FORMULAS[body];
    const piece = (coef ? coef + " " : "") + (name ? name : clean(f.t) + chargeWords(charge)) + (st ? " " + ({ aq: "aqueous", g: "gas", l: "liquid", s: "solid" })[st] : "");
    if (wrap) { CHEM_STORE.push(piece); return pre + open + "\\text{ chemqq" + alpha(CHEM_STORE.length - 1) + "z }" + close; }
    return pre + open + piece + close + " ";
  });
  return wrap ? s : s.replace(/\b([A-Za-z]{3,})\s*\(\1\)/gi, "$1").replace(/\b(ethanol|methanol|glucose|water|methane|ammonia|acid|complex)[:,]?\s+\1\b/gi, "$1");
}
const SPELL = new Set(["CSTR", "PFR", "PQ", "PQs", "CGPA", "GPA", "BUK", "NSChE", "SIWES", "NSE", "LPG", "CNG", "PVC", "CFD", "PID", "HETP", "LMTD", "COD", "BOD", "TDS"]);
const spellOne = (tok) => tok.replace(/([A-Z][a-z]?)(\d*)/g, (m, el, d) => el.toUpperCase().split("").join(" ") + (d ? " " + d : "") + " ").trim();
// "H2SO4" -> "H 2 S O 4", "HCl" -> "H C L", "CSTR" -> "C S T R", "2H2O" -> "2 H 2 O", "O2" -> "O 2"
function spellFormulas(s) {
  // acronyms such as CSTR, PFR, LPG are spelled letter by letter (real formulas were handled earlier)
  return s.replace(/\b([A-Za-z]{2,6})\b/g, (m, tok) => SPELL.has(tok) ? spellOne(tok) : m);
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

// how a subscript is spoken (never "sub"):  x_1 -> "x1",  F_in -> "F in",  C_A -> "C A",  rho_i -> "rho i",  T_lm -> "T L M"
const SUB_WORDS = { avg: "average", tot: "total", gen: "generation", acc: "accumulation", rxn: "reaction", eq: "equilibrium", ref: "reference", sat: "saturation",
  vap: "vapour", liq: "liquid", init: "initial", std: "standard", sys: "system", surr: "surroundings", cat: "catalyst", amb: "ambient", rev: "reversible",
  abs: "absolute", rel: "relative", ex: "exit", min: "minimum", max: "maximum", cv: "control volume" };
function subWord(b) {
  const t = b.trim();
  if (!t) return " ";
  if (/^\d+$/.test(t)) return t;
  if (SUB_WORDS[t.toLowerCase()] && /^[a-z]+$/.test(t)) return " " + SUB_WORDS[t.toLowerCase()] + " ";
  if (/^[a-z]{4,}$/.test(t) || /^(in|out|top|net|mix|dry|wet|hot|cold|feed)$/.test(t)) return " " + t + " ";   // a real word
  // letters and digits: spell them out  (A0 -> "A 0", AB -> "A B", lm -> "L M")
  return " " + t.replace(/([A-Za-z])(?=[A-Za-z0-9])/g, "$1 ").replace(/(\d)(?=[A-Za-z])/g, "$1 ").replace(/\b[a-z]\b/g, (c) => c.toUpperCase()) + " ";
}

// chemistry written in LaTeX:  \ce{H2SO4},  \mathrm{H_2O},  Ca^{2+},  SO_4^{2-}  ->  plain "H2SO4", "Ca\uE0052+" for the formula reader
function chemTeX(tex) {
  const el = (x) => ELEMENTS.has(x);
  const QTY = { H: "enthalpy", G: "Gibbs free energy", S: "entropy" }, OF = { f: " of formation", c: " of combustion", r: " of reaction", rxn: " of reaction", vap: " of vaporisation", fus: " of fusion" };
  tex = tex.replace(/\\Delta\s*([HGS])\s*(?:_\s*\{?\s*(?:\\mathrm\{|\\text\{)?([a-z]+)\}?\s*\}?)?\s*\^\s*\{?\s*\\circ\s*\}?\s*(?:_\s*\{?([a-z]+)\}?)?/g, (m, q, a, b) => " \\text{ standard " + QTY[q] + (OF[a || b] || " change") + " } ");
  tex = tex.replace(/(\b[E])\s*\^\s*\{?\s*\\circ\s*\}?/g, " \\text{ standard electrode potential E } ");
  tex = tex.replace(/(\^\s*\{?\s*\\circ\s*\}?)(\s*\\?(?:mathrm|text)?\{?\s*)([CF])\b/g, (m, a, b, u) => " \\text{ degrees " + (u === "C" ? "Celsius" : "Fahrenheit") + " } ");
  tex = tex.replace(/\^\s*\{?\s*\\circ\s*\}?\s*\\?(?:mathrm|text)?\{?\s*(?=C\b|F\b)/g, " ");
  tex = tex.replace(/\^\s*\{?\s*(\d{1,3})\s*\}?\s*\\?(?:mathrm|text)?\{?\s*([A-Z][a-z]?)\}?/g, (m, d, e) => ELEMENTS.has(e) ? " \\text{ " + (ELNAMES[e] || spellSym(e)) + " " + d + " } " : m);
  tex = tex.replace(/\\ce\s*\{([^{}]*)\}/g, (m, t) => " " + t.replace(/<=>/g, " \\rightleftharpoons ").replace(/->/g, " \\to ").replace(/<-/g, " \\leftarrow ").replace(/\^(?:\{(\d*[+\-−])\}|(\d*[+\-−])(?!\d))/g, (m, a, b) => "\uE005" + (a || b)).replace(/_\{?(\d+)\}?/g, "$1") + " ");
  tex = tex.replace(/\\(?:mathrm|text|textrm|mathit|mathbf)\s*\{([^{}]*)\}/g, (m, t, off, all) => {
    if (!/^[A-Z][A-Za-z0-9_^{}()+\-−]*$/.test(t) || !el((t.match(/^[A-Z][a-z]?/) || [""])[0])) return m;
    const multi = (t.match(/[A-Z]/g) || []).length >= 2 || /[\d_^]/.test(t);
    const after = all.slice(off + m.length);
    return multi || /^(?:_|\^\{?\d*[+\-−]\}?(?!\d))/.test(after) ? t : m;
  });
  tex = tex.replace(/([A-Z][a-z]?|\))_\{?(\d+)\}?/g, (m, a, d) => (a === ")" || el(a) ? a + d : m));
  tex = tex.replace(/([A-Z][a-z]?\d*|\))\^(?:\{(\d*[+\-−])\}|(\d*[+\-−])(?!\d))/g, (m, a, c1, c2) => (a === ")" || el(a.replace(/\d+$/, "")) ? a + "\uE005" + (c1 || c2) : m));
  return chemFormulas(tex, true);
}

// LaTeX -> plain spoken words
export function mathToWords(tex) {
  let s = " " + tex + " ";
  s = s.replace(/\^\s*\{\s*([-−]?\d)\s*\}/g, "^$1");
  // _{\text{out}} -> _{out}   (so "m dot out" and "F out" can be recognised)
  s = s.replace(/_\s*\{\s*\\(?:text|mathrm|textrm|mathit|mathbf|textbf)\s*\{([^{}]*)\}\s*\}/g, "_{$1}");
  // align / equation / cases blocks: drop the wrapper, make each row its own sentence
  s = s.replace(/\\begin\s*\{(?:aligned|align\*?|alignat\*?|equation\*?|gather\*?|gathered|split|eqnarray\*?|multline\*?|cases|array|matrix|pmatrix|bmatrix|vmatrix|smallmatrix)\}(?:\s*\{[^{}]*\})?/g, " ")
       .replace(/\\end\s*\{[a-zA-Z*]+\}/g, " ")
       .replace(/\\(?:tag|label)\s*\{[^{}]*\}/g, " ").replace(/\\(?:nonumber|notag)\b/g, " ")
       .replace(/\\boxed\s*\{([^{}]*)\}/g, " $1 ");
  s = s.replace(/\\\\/g, " . ");
  // limits: \lim_{x \to 0}
  s = s.replace(/\\lim\s*_\s*\{\s*([^{}\\]*?)\s*\\to\s*([^{}]*?)\s*\}/g, " limit as $1 approaches $2 of ");
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
    s = s.replace(/_\s*\{([^{}]*)\}/g, (_, b) => subWord(b));
    s = s.replace(/_\s*([A-Za-z0-9])/g, (_, b) => subWord(b));
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

// a line like "Rate = k * C_A^2" or "m_in - m_out = dm/dt": a short line with "=" and few real words
function looksLikeEquation(line) {
  const t = line.trim();
  if (!t || t.length > 220 || !t.includes("=")) return false;
  if (/[.!?]\s+[A-Z]/.test(t)) return false;                    // two sentences
  const longWords = (t.match(/[A-Za-z]{4,}/g) || []).length;
  return longWords <= 5 && /[A-Za-z0-9)\]]\s*=/.test(t);
}
const CODE_LANG = /^(py|python|js|javascript|jsx|ts|typescript|c|cpp|c\+\+|cs|csharp|java|bash|sh|shell|zsh|matlab|octave|r|sql|json|html|css|xml|yaml|yml|go|rust|php|ruby|swift|kotlin|vb|vba|powershell)$/;
// what to say for a ```fenced``` block
function speakFence(f) {
  if (!f) return "";
  const body = f.body || "";
  if (CODE_LANG.test(f.lang) || /(\bdef |\bimport |\bfunction\b|console\.|\bprint\(|#include|\bpublic |\breturn\b|\bfor ?\(|\bwhile ?\(|=>)/.test(body)) return "The code is shown on screen.";
  if (/^(latex|tex|math|katex)$/.test(f.lang)) return mathToWords(body.replace(/\$/g, "")) + ".";
  return body.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    l = expandUnits(negUnitChains(expandAbbreviations(l)));
    return (looksLikeEquation(l) ? mathToWords(l) : l.replace(/[*_`]/g, "")).replace(/[.:;]+$/, "") + ".";
  }).join(" ");
}


const GREEK_SAY = { α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "epsilon", ζ: "zeta", η: "eta", θ: "theta", κ: "kappa", λ: "lambda", ν: "nu", ξ: "xi", σ: "sigma", ς: "sigma", τ: "tau", υ: "upsilon", φ: "phi", χ: "chi", ψ: "psi", ω: "omega", Γ: "gamma", Θ: "theta", Λ: "lambda", Ξ: "xi", Σ: "sigma", Φ: "phi", Ψ: "psi", Ω: "omega", Π: "pi", ϕ: "phi" };
const VULGAR = { "½": "one half", "⅓": "one third", "⅔": "two thirds", "¼": "one quarter", "¾": "three quarters", "⅛": "one eighth" };
// symbols and shorthand that voices skip or mispronounce
function symbolsToWords(s) {
  s = s.replace(/[αβγδεζηθκλνξσςυφχψωΓΘΛΞΣΦΨΩΠϕ]/g, (c) => " " + GREEK_SAY[c] + " ");
  s = s.replace(/[½⅓⅔¼¾⅛]/g, (c) => " " + VULGAR[c] + " ");
  s = s.replace(/√\s*\(/g, " square root of (").replace(/√/g, " square root of ").replace(/∞/g, " infinity ").replace(/∑/g, " sum of ").replace(/∫/g, " integral of ")
       .replace(/∂/g, " partial ").replace(/∇/g, " del ").replace(/∝/g, " is proportional to ").replace(/∴/g, " therefore ").replace(/∵/g, " because ")
       .replace(/↔/g, " goes both ways with ").replace(/⟷/g, " goes both ways with ").replace(/…/g, ", ");
  s = s.replace(/\s[·⋅]\s/g, " times ");
  // plain-text reaction arrows
  s = s.replace(/\s*<=+>\s*/g, " is in equilibrium with ").replace(/\s*<-+>\s*/g, " is in equilibrium with ").replace(/\s*-{1,2}>\s*/g, " gives ").replace(/\s*=>\s*/g, " implies ");
  // state symbols after a formula:  H2O(l), NaCl(aq)
  s = s.replace(/([A-Za-z0-9\)])\((aq|g|l|s)\)/g, (m, f, st) => f + " " + ({ aq: "aqueous", g: "gas", l: "liquid", s: "solid" })[st]);
  // numbers: 1.5e-3, 2–5, 25-30
  s = s.replace(/(\d)[eE]([+-]?\d+)(?![\w.])/g, (m, d, e) => d + " times 10 to the power of " + (e.startsWith("-") ? "minus " : "") + e.replace(/^[+-]/, ""));
  s = s.replace(/(\d)\s?[–—]\s?(?=\d)/g, "$1 to ").replace(/(\d)-(?=\d)/g, "$1 to ");
  s = s.replace(/\s[–—]\s/g, ", ").replace(/([A-Za-z0-9])=([A-Za-z0-9(-])/g, "$1 equals $2");
  s = s.replace(/&/g, " and ");
  s = s.replace(/(\b\w{1,3}|\)|\b\w{1,3} \d) - (?=\w{1,3}\b|\()/g, "$1 minus ");
  // money
  s = s.replace(/₦\s?(\d+(?:[,.]\d+)*)/g, "$1 naira").replace(/\$(\d+(?:[,.]\d+)*)/g, "$1 dollars").replace(/£(\d+(?:[,.]\d+)*)/g, "$1 pounds").replace(/€(\d+(?:[,.]\d+)*)/g, "$1 euros");
  // more shorthand
  s = s.replace(/\bw\.r\.t\.?/gi, "with respect to").replace(/\bN\.B\.?/g, "Note:").replace(/\bviz\.?/gi, "namely").replace(/\bcf\.\s/g, "compare ");
  // units without a number in front:  "in kJ/mol", "kg/m³", "mol"
  s = s.replace(new RegExp("(^|[^A-Za-z0-9.])(" + TOK + "(?:\\s*\\/\\s*" + TOK + ")+)(?![A-Za-z0-9])", "g"), (m, pre, chain) => pre + speakChain(chain));
  s = s.replace(/(^|[^A-Za-z0-9.])(kJ|kPa|MPa|kW|kmol|mmol|mL|Hz)(?![A-Za-z0-9])/g, (m, pre, u) => pre + UNIT_WORDS[u][0]);
  return s;
}

export function speakable(md) {
  CHEM_STORE = [];
  let s = String(md || "");
  // fenced blocks: real code is skipped, but a formula written in a code block is read like any other formula
  const fences = [];
  s = s.replace(/```([A-Za-z0-9_+#-]*)[ \t]*\n?([\s\S]*?)```/g, (m, lang, body) => { fences.push({ lang: lang.toLowerCase(), body }); return "\n\uE001" + (fences.length - 1) + "\uE002\n"; });
  s = s.normalize("NFC");
  s = s.replace(/[\u2460-\u2473]/g, (c) => " " + (c.charCodeAt(0) - 0x245f) + " ");                 // circled numbers
  s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{25A0}-\u{25FF}\u{2300}-\u{23FF}\u{2500}-\u{257F}\u{FE0F}\u{FE0E}\u{20E3}\u{200D}\u{2022}\u{2023}]/gu, "");
  s = s.replace(/([A-Za-z])[\u0307\u02D9](?:_\{?([A-Za-z0-9]+)\}?)?/g, (_, l, sub) => dotPhrase(l, sub)).replace(/([A-Za-z])\u0308/g, "$1 double dot ").replace(/([A-Za-z])[\u0304\u00AF]/g, "$1 bar ");
  s = s.replace(/([\u1E40\u1E41\u1E44\u1E45\u1E56\u1E57\u1E58\u1E59\u1E86\u1E87\u1E8A\u1E8B\u1E8E\u1E8F])(?:_\{?([A-Za-z0-9]+)\}?)?/g, (_, c, sub) => dotPhrase(({ "\u1E40": "M", "\u1E41": "m", "\u1E44": "N", "\u1E45": "n", "\u1E56": "P", "\u1E57": "p", "\u1E58": "R", "\u1E59": "r", "\u1E86": "W", "\u1E87": "w", "\u1E8A": "X", "\u1E8B": "x", "\u1E8E": "Y", "\u1E8F": "y" })[c], sub));

  // maths first, so its symbols are not touched by the markdown clean-up
  const done = (tex) => " " + mathToWords(chemTeX(tex)) + " ";
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => done(t));
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => done(t));
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => done(t));
  s = s.replace(/\$(?=\S)([^$\n]*?\S)\$(?!\d)/g, (_, t) => done(t));   // "$x$" is maths, "costs $5 and $10" is not
  // tables: read every row, naming the column for each value:  "Water: Density 1000, Viscosity 0.001."
  {
    const out = []; let rows = [];
    const flush = () => {
      if (!rows.length) return;
      const head = rows[0], body = rows.slice(1);
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
  s = chemPrep(s);
  s = expandAbbreviations(s);
  s = negUnitChains(s);
  s = expandUnits(s);
  s = bracketUnits(s);
  s = s.replace(/(^|[\s(])~(?=\s?\d)/g, "$1approximately ").replace(/ > /g, " greater than ").replace(/ < /g, " less than ");
  s = s.replace(/\b(\d+):(\d+)\b/g, (m, a, b) => (b.length === 2 && +a <= 24 && +b < 60 ? m : a + " to " + b));   // 1:2 -> "1 to 2", 3:30 stays a time
  // equations typed as plain text ("m_in - m_out = dm/dt") are read like formulas
  s = s.split("\n").map((line) => (looksLikeEquation(line) ? mathToWords(line) + "." : line)).join("\n");
  s = s.replace(/\*\*|__|\*|~~/g, "");
  s = s.replace(/(\w|\))\^\{?(-?\d+|[A-Za-z])\}?/g, (m, b, p) => b + power(p));      // x^2, 10^6 written without LaTeX
  s = s.replace(/\b([A-Za-z])_\{?([A-Za-z0-9]+)\}?/g, (m, l, sub) => l + subWord(sub));
  s = expandUnits(s);
  s = symbolsToWords(s);
  s = unicodeToWords(s);
  s = s.replace(/\bChE\b/g, "Chemical Engineering");
  s = chemFormulas(s);
  s = spellFormulas(s);
  s = s.replace(/\uE001(\d+)\uE002/g, (m, i) => " " + speakFence(fences[+i]) + " ");
  s = s.replace(/([^.!?:;,\s])[ \t]*\n+/g, "$1. ").replace(/\n+/g, " ");
  s = s.replace(/chemqq([a-y]+)z/g, (m, a) => CHEM_STORE[unalpha(a)] || "");
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

// English voices, best sounding first
export function englishVoices(voices) {
  const en = (voices || []).filter((v) => /^en([-_]|$)/i.test(v.lang));
  const rank = (v) => {
    let r = 0;
    if (/natural|neural|online|enhanced|premium|studio/i.test(v.name)) r += 50;
    if (/google/i.test(v.name)) r += 20;
    if (/^en[-_](NG|GB)/i.test(v.lang)) r += 10;
    else if (/^en[-_]US/i.test(v.lang)) r += 8;
    if (v.localService === false) r += 3;
    if (/compact|espeak|robot|novelty|zarvox|trinoids|bells|cellos|boing|bubbles|bad news|good news|whisper|organ|jester|wobble|albert|fred|junior|kathy|ralph/i.test(v.name)) r -= 60;
    return r;
  };
  return en.map((v, i) => ({ v, r: rank(v), i })).sort((x, y) => y.r - x.r || x.i - y.i).map((x) => x.v);
}

// Choose the most natural English voice the phone has.
// Voice 1 / Voice 2: the best female and the best male voice a device has (same idea on iPhone, Android and computer)
const FEMALE_RE = /female|woman|samantha|karen|moira|tessa|fiona|victoria|allison|ava\b|susan|zira|hazel|jenny|aria|libby|sonia|emma|michelle|catherine|serena|kate\b|martha|nicky|amy\b|joanna|salli|ivy\b|kendra|kimberly|raveena|natasha|heera|neerja|ezinne|sara\b|nora|laura|siri.*female|ellen|veena|zoe|lisa|shelley|sandy|flo\b|grandma/i;
const MALE_RE = /\bmale\b|daniel|alex\b|oliver|arthur|rishi|aaron|tom\b|mark\b|david|george|ryan|guy\b|davis|christopher|eric\b|ethan|brian|roger|steffan|james|liam|prabhat|ravi|abeo|gordon|lee\b|evan|reed|rocko|eddy|grandpa|nathan|jason|sam\b/i;
export function voicesByGender(list) {
  const l = list || [];
  const female = l.find((v) => FEMALE_RE.test(v.name));
  const male = l.find((v) => !FEMALE_RE.test(v.name) && MALE_RE.test(v.name));
  const first = female || l[0] || null;
  return { female: first, male: male || l.find((v) => v !== first) || first };
}
export function pickVoice(voices) {
  return englishVoices(voices)[0] || null;
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
