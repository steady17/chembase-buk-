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
  quad: " ", qquad: " ", hbar: "h bar", ell: "l", prime: "prime", dagger: "dagger", bar: "", hat: "", vec: "", dot: "", tilde: "",
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

// LaTeX -> plain spoken words
export function mathToWords(tex) {
  let s = " " + tex + " ";
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|textbf|textit|operatorname|mathcal|boldsymbol)\s*\{([^{}]*)\}/g, " $1 ");
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg)\b\s*/g, " ");
  s = s.replace(/\\[,;:!]/g, " ").replace(/\\ /g, " ");
  s = s.replace(/\\\\/g, " ");
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
    s = s.replace(/_\s*\{([^{}]*)\}/g, (_, b) => (/^\d+$/.test(b.trim()) ? " " + b + " " : " sub " + b + " "));
    s = s.replace(/_\s*([A-Za-z0-9])/g, (_, b) => (/^\d$/.test(b) ? " " + b + " " : " sub " + b + " "));
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
  s = s.replace(/[()\[\]|]/g, " ").replace(/\s+/g, " ").trim();
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
  // maths first, so its symbols are not touched by the markdown clean-up
  const done = (tex) => " " + mathToWords(tex) + " ";
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => done(t));
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => done(t));
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => done(t));
  s = s.replace(/\$([^$\n]+?)\$/g, (_, t) => done(t));
  // tables: read each row as a sentence
  s = s.split("\n").map((line) => {
    if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-")) return "";
    if (/^\s*\|.*\|\s*$/.test(line)) return line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()).filter(Boolean).join(", ") + ".";
    return line;
  }).join("\n");
  s = s.replace(/`([^`]*)`/g, "$1");
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/https?:\/\/\S+/g, " link ");
  s = s.replace(/^\s{0,3}#{1,6}\s*(.+)$/gm, "$1.");
  s = s.replace(/^\s*>\s?/gm, "").replace(/^\s*[-*•]\s+/gm, "").replace(/^\s*-{3,}\s*$/gm, "");
  s = s.replace(/\*\*|__|\*|~~/g, "");
  s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B50}\u{2B06}]/gu, "");
  s = unicodeToWords(s);
  s = s.replace(/\bNSChE\b/g, "N S C H E").replace(/\bBUK\b/g, "B U K").replace(/\bChE\b/g, "Chemical Engineering");
  s = s.replace(/([^.!?:;,\s])[ \t]*\n+/g, "$1. ").replace(/\n+/g, " ");
  return s.replace(/\s+/g, " ").replace(/\s+([.,!?;:])/g, "$1").replace(/\.\s*\./g, ".").trim();
}

// Browsers stop long speech after a while, so read it in small pieces.
export function speechChunks(md, max = 200) {
  const text = speakable(md);
  if (!text) return [];
  const sentences = text.match(/[^.!?:;]+[.!?:;]*/g) || [text];
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
