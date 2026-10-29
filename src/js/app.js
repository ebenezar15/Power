/* Power & Presence — a data-driven study app.
   Every text value in the data is either a plain string or an [english, tamil] pair.
   Scripture references stay in English in the data and are converted to Tamil book names at render. */
(function () {
  "use strict";
  var PP = window.PP;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- storage (best effort) ---------- */
  function load(k, f) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  var lang = load("pp.lang", "en") === "ta" ? "ta" : "en";
  var done = load("pp.done", {});

  /* ---------- scripture book names (reused from the Relational Gospel Atlas) ---------- */
  var BOOKS = [
    ["Genesis|Gen", "ஆதியாகமம்"], ["Exodus|Exod|Ex", "யாத்திராகமம்"], ["Leviticus|Lev", "லேவியராகமம்"], ["Numbers|Num", "எண்ணாகமம்"],
    ["Deuteronomy|Deut|Dt", "உபாகமம்"], ["Joshua|Josh", "யோசுவா"], ["Judges|Judg", "நியாயாதிபதிகள்"], ["Ruth", "ரூத்"],
    ["Samuel|Sam", "சாமுவேல்"], ["Kings|Kgs", "இராஜாக்கள்"], ["Chronicles|Chron|Chr", "நாளாகமம்"], ["Ezra", "எஸ்றா"],
    ["Nehemiah|Neh", "நெகேமியா"], ["Esther|Esth", "எஸ்தர்"], ["Job", "யோபு"], ["Psalms|Psalm|Pss|Ps", "சங்கீதம்"],
    ["Proverbs|Prov", "நீதிமொழிகள்"], ["Ecclesiastes|Eccles|Eccl|Ecc", "பிரசங்கி"], ["Song of Songs|Song of Solomon|Song", "உன்னதப்பாட்டு"],
    ["Isaiah|Isa", "ஏசாயா"], ["Jeremiah|Jer", "எரேமியா"], ["Lamentations|Lam", "புலம்பல்"], ["Ezekiel|Ezek", "எசேக்கியேல்"],
    ["Daniel|Dan", "தானியேல்"], ["Hosea|Hos", "ஓசியா"], ["Joel", "யோவேல்"], ["Amos", "ஆமோஸ்"], ["Obadiah|Obad", "ஒபதியா"],
    ["Jonah", "யோனா"], ["Micah|Mic", "மீகா"], ["Nahum|Nah", "நாகூம்"], ["Habakkuk|Hab", "ஆபகூக்"], ["Zephaniah|Zeph", "செப்பனியா"],
    ["Haggai|Hag", "ஆகாய்"], ["Zechariah|Zech", "சகரியா"], ["Malachi|Mal", "மல்கியா"],
    ["Matthew|Matt|Mt", "மத்தேயு"], ["Mark|Mk", "மாற்கு"], ["Luke|Lk", "லூக்கா"], ["John|Jn", "யோவான்"], ["Acts", "அப்போஸ்தலர்"],
    ["Romans|Rom", "ரோமர்"], ["Corinthians|Cor", "கொரிந்தியர்"], ["Galatians|Gal", "கலாத்தியர்"], ["Ephesians|Eph", "எபேசியர்"],
    ["Philippians|Phil", "பிலிப்பியர்"], ["Colossians|Col", "கொலோசெயர்"], ["Thessalonians|Thess", "தெசலோனிக்கேயர்"],
    ["Timothy|Tim", "தீமோத்தேயு"], ["Titus", "தீத்து"], ["Philemon|Phlm", "பிலேமோன்"], ["Hebrews|Heb", "எபிரெயர்"],
    ["James|Jas", "யாக்கோபு"], ["Peter|Pet", "பேதுரு"], ["Jude", "யூதா"], ["Revelation|Rev", "வெளிப்படுத்தின விசேஷம்"]
  ];
  var BOOK = {}, alts = [];
  BOOKS.forEach(function (b) { b[0].split("|").forEach(function (n) { BOOK[n] = b[1]; alts.push(n); }); });
  alts.sort(function (a, b) { return b.length - a.length; });
  var REF = new RegExp("\\b(" + alts.join("|").replace(/ /g, "\\s") + ")\\.?(?=\\s?\\d)", "g");

  /* ---------- text helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function T(x) { if (x == null) return ""; if (Array.isArray(x)) return lang === "ta" && x[1] ? x[1] : x[0]; return String(x); }
  function R(s) { s = T(s); return lang === "ta" ? s.replace(REF, function (m, b) { return BOOK[b.replace(/\s+/g, " ")] || m; }) : s; }
  /* light markup: **bold**, *italic*, and scripture names converted */
  function H(x) { return esc(R(x)).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<em>$1</em>"); }
  function U(k) { var u = PP.ui[k]; return u ? T(u) : k; }
  function refEl(r) { return r ? '<span class="ref">' + esc(R(r)) + "</span>" : ""; }
  /* a paragraph field is either one [en, ta] pair or a list of them */
  function L(x) { return Array.isArray(x) && typeof x[0] === "string" ? [x] : (x || []); }
  function paras(list) { return (list || []).map(function (p) { return "<p>" + H(p) + "</p>"; }).join(""); }
  function study(id) { for (var i = 0; i < PP.studies.length; i++) if (PP.studies[i].id === id) return PP.studies[i]; return null; }
  var uid = 0;

  /* ---------- section renderers ---------- */
  var KIND = { prose: "read", cards: "explore", map: "visual map", cycle: "cycle", flow: "flowchart", decide: "decision tree", timeline: "timeline", lens: "perspectives", spectrum: "spectrum", flip: "flip cards", steps: "step by step", table: "comparison", matrix: "matrix", check: "self-check", scale: "balance", pyramid: "levels", wheel: "word wheel", builder: "builder", quiz: "quiz", vs: "contrast" };
  var RENDER = {};
  var WIRE = {};

  RENDER.prose = function (s) {
    var v = s.verses ? '<div class="verses">' + s.verses.map(function (x) { return '<div class="verse">' + refEl(x.r) + H(x.t) + "</div>"; }).join("") + "</div>" : "";
    return '<div class="prose">' + paras(s.paras) + "</div>" + v;
  };

  RENDER.cards = function (s) {
    return '<div class="grid">' + s.items.map(function (c, i) {
      var tag = c.tag ? '<span class="tag">' + H(c.tag) + "</span>" : "";
      var open = c.more ? ' data-card="' + i + '"' : "";
      var el = c.more ? "button" : "div";
      return "<" + el + ' class="card"' + open + (c.more ? ' type="button"' : "") + ">" + tag + "<h3>" + H(c.h) + "</h3><p>" + H(c.p) + "</p>" + refEl(c.r) + (c.more ? '<span class="more">' + U("open") + " →</span>" : "") + "</" + el + ">";
    }).join("") + "</div>";
  };
  WIRE.cards = function (el, s) {
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-card]"); if (!b) return;
      var c = s.items[+b.getAttribute("data-card")];
      openSheet((c.tag ? '<span class="label">' + H(c.tag) + "</span>" : "") + "<h2>" + H(c.h) + "</h2>" + refEl(c.r) + '<div class="prose">' + paras(c.more) + "</div>");
    });
  };

  /* radial mind map: centre node + branches, detail panel beside */
  RENDER.map = function (s) {
    var n = s.nodes.length, W = 560, Hh = 520, cx = W / 2, cy = Hh / 2, rx = 200, ry = 190, svg = "";
    var pts = s.nodes.map(function (_, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
    pts.forEach(function (p, i) { svg += '<path class="medge" data-e="' + i + '" d="M' + cx + " " + cy + " Q " + ((cx + p[0]) / 2 + (p[1] - cy) * .12) + " " + ((cy + p[1]) / 2 - (p[0] - cx) * .12) + " " + p[0] + " " + p[1] + '"/>'; });
    svg += '<g class="mcenter"><circle cx="' + cx + '" cy="' + cy + '" r="64"/>' + wrapSvg(T(s.center), cx, cy, 13, 15) + "</g>";
    pts.forEach(function (p, i) {
      var lab = T(s.nodes[i].h), w = 150, h = 50;
      svg += '<g class="mnode" tabindex="0" role="button" data-n="' + i + '"><rect x="' + (p[0] - w / 2) + '" y="' + (p[1] - h / 2) + '" width="' + w + '" height="' + h + '" rx="10"/>' + wrapSvg(lab, p[0], p[1], 21, 13.5) + "</g>";
    });
    return '<div class="map"><div class="map-fig"><svg viewBox="-30 -10 620 540" role="img" aria-label="' + esc(T(s.center)) + '">' + svg + '</svg></div><div class="map-side"><div class="panel hi detail" data-out>' + '<span class="label">' + U("tapNode") + "</span><p>" + H(s.hint || s.lead || "") + "</p></div></div></div>";
  };
  WIRE.map = function (el, s) {
    function pick(i) {
      $$(".mnode", el).forEach(function (g) { g.classList.toggle("on", +g.getAttribute("data-n") === i); });
      $$(".medge", el).forEach(function (g) { g.classList.toggle("on", +g.getAttribute("data-e") === i); });
      var d = s.nodes[i], out = $("[data-out]", el);
      out.outerHTML = '<div class="panel hi detail" data-out><span class="label">' + (i + 1) + " / " + s.nodes.length + "</span><h3>" + H(d.h) + "</h3>" + refEl(d.r) + '<div class="prose">' + paras(L(d.p)) + "</div></div>";
    }
    el.addEventListener("click", function (e) { var g = e.target.closest(".mnode"); if (g) pick(+g.getAttribute("data-n")); });
    el.addEventListener("keydown", function (e) { var g = e.target.closest(".mnode"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(+g.getAttribute("data-n")); } });
    pick(0);
  };
  function wrapSvg(text, x, y, max, size) {
    var words = String(text).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); });
    if (cur) lines.push(cur);
    lines = lines.slice(0, 4);
    var lh = size * 1.2, y0 = y - (lines.length - 1) * lh / 2 + size * .35;
    return '<text text-anchor="middle" style="font-size:' + size + 'px">' + lines.map(function (l, i) { return '<tspan x="' + x + '" y="' + (y0 + i * lh) + '">' + esc(l) + "</tspan>"; }).join("") + "</text>";
  }

  /* cycle: nodes around a ring with a play-through */
  RENDER.cycle = function (s) {
    var n = s.nodes.length, cx = 230, cy = 210, r = 160, svg = '<defs><marker id="arw' + (++uid) + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--acc)"/></marker></defs>';
    var mk = "arw" + uid;
    for (var i = 0; i < n; i++) {
      var a1 = -Math.PI / 2 + i * 2 * Math.PI / n + .2, a2 = -Math.PI / 2 + (i + 1) * 2 * Math.PI / n - .2;
      if (!s.open || i < n - 1) svg += '<path class="carc" data-a="' + i + '" marker-end="url(#' + mk + ')" d="M' + (cx + r * Math.cos(a1)) + " " + (cy + r * Math.sin(a1)) + " A " + r + " " + r + " 0 0 1 " + (cx + r * Math.cos(a2)) + " " + (cy + r * Math.sin(a2)) + '"/>';
    }
    s.nodes.forEach(function (d, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      var lx = cx + (r + 54) * Math.cos(a), ly = cy + (r + 40) * Math.sin(a);
      svg += '<g class="cnode" tabindex="0" role="button" data-n="' + i + '"><circle cx="' + x + '" cy="' + y + '" r="20"/><text class="num" x="' + x + '" y="' + (y + 4.5) + '" text-anchor="middle">' + (i + 1) + "</text>" + wrapSvg(T(d.h), lx, ly, 16, 12.5).replace("<text ", '<text class="lbl" ') + "</g>";
    });
    if (s.center) svg += wrapSvg(T(s.center), cx, cy, 16, 15).replace("<text ", '<text style="font-family:var(--display);font-weight:700;fill:var(--acc)" ');
    return '<div class="cycle"><div class="cycle-fig"><svg viewBox="-40 -30 540 480">' + svg + '</svg></div><div class="panel hi detail" data-out></div></div><div class="row"><button class="btn ghost" type="button" data-play>' + U("play") + "</button></div>";
  };
  WIRE.cycle = function (el, s) {
    var cur = 0, timer = null;
    function pick(i) {
      cur = i;
      $$(".cnode", el).forEach(function (g) { g.classList.toggle("on", +g.getAttribute("data-n") === i); });
      $$(".carc", el).forEach(function (g) { g.classList.toggle("on", +g.getAttribute("data-a") < i); });
      var d = s.nodes[i];
      $("[data-out]", el).innerHTML = '<span class="label">' + U("stage") + " " + (i + 1) + "</span><h3>" + H(d.h) + "</h3>" + refEl(d.r) + "<p>" + H(d.p) + "</p>";
    }
    el.addEventListener("click", function (e) {
      var g = e.target.closest(".cnode"); if (g) { clearInterval(timer); pick(+g.getAttribute("data-n")); }
      if (e.target.closest("[data-play]")) { clearInterval(timer); pick(0); timer = setInterval(function () { if (cur >= s.nodes.length - 1) clearInterval(timer); else pick(cur + 1); }, 2200); }
    });
    el.addEventListener("keydown", function (e) { var g = e.target.closest(".cnode"); if (g && e.key === "Enter") pick(+g.getAttribute("data-n")); });
    pick(0);
  };

  /* vertical flowchart with optional side branch per node */
  RENDER.flow = function (s) {
    var out = "";
    s.steps.forEach(function (st, i) {
      if (i) out += '<div class="farrow" aria-hidden="true"></div>';
      var cls = "fnode" + (st.kind ? " " + st.kind : "");
      out += '<div class="frow"><div class="fleft">' + (st.left ? H(st.left) : "") + '</div><button type="button" class="' + cls + '"><b><span class="n">' + (st.kind === "q" ? "?" : String(i + 1).padStart(2, "0")) + "</span>" + H(st.h) + "</b>" + (st.p ? '<span class="fp">' + H(st.p) + "</span>" : "") + (st.x ? '<span class="fx">' + H(st.x) + (st.r ? " " + refEl(st.r) : "") + "</span>" : (st.r ? '<span class="ref">' + esc(R(st.r)) + "</span>" : "")) + "</button>" + (st.side ? '<div class="fside"><b>' + H(st.side.h) + "</b>" + H(st.side.p || "") + "</div>" : "<div></div>") + "</div>";
    });
    return '<div class="flow">' + out + "</div>" + (s.x ? "" : "");
  };
  WIRE.flow = function (el) { el.addEventListener("click", function (e) { var b = e.target.closest(".fnode"); if (b) b.classList.toggle("on"); }); };

  /* decision tree */
  RENDER.decide = function () { return '<div class="decide" data-out></div>'; };
  WIRE.decide = function (el, s) {
    var path = [];
    function show(id) {
      var n = s.nodes[id], box = $("[data-out]", el);
      var crumbs = path.length ? '<div class="crumbs">' + path.map(function (p) { return '<span class="crumb">' + H(p) + "</span>"; }).join("") + "</div>" : "";
      if (n.end) {
        box.innerHTML = crumbs + '<div class="res"><span class="label">' + U("result") + "</span><h3>" + H(n.h) + "</h3>" + refEl(n.r) + paras(L(n.p)) + '</div><div class="row"><button class="btn ghost" type="button" data-restart>' + U("restart") + "</button></div>";
      } else {
        box.innerHTML = crumbs + '<p class="q">' + H(n.q) + "</p>" + (n.p ? '<p class="muted">' + H(n.p) + "</p>" : "") + '<div class="chips">' + n.opts.map(function (o, i) { return '<button class="chip" type="button" data-o="' + i + '">' + H(o.l) + "</button>"; }).join("") + "</div>";
      }
      box._id = id;
    }
    el.addEventListener("click", function (e) {
      var box = $("[data-out]", el);
      if (e.target.closest("[data-restart]")) { path = []; show(s.start); return; }
      var b = e.target.closest("[data-o]"); if (!b) return;
      var o = s.nodes[box._id].opts[+b.getAttribute("data-o")];
      path.push(o.l); show(o.to);
    });
    show(s.start);
  };

  RENDER.timeline = function (s) {
    var k = 0;
    return '<div class="tl-wrap"><div class="tl">' + s.eras.map(function (er) {
      return '<div class="tl-era"><span class="label">' + H(er.era) + '</span><div class="tl-items">' + er.items.map(function (it) {
        return '<button type="button" class="tli" data-t="' + (k++) + '"><span class="y">' + H(it.y) + "</span><b>" + H(it.h) + "</b><span>" + H(it.p) + "</span></button>";
      }).join("") + "</div></div>";
    }).join("") + '</div></div><div data-out></div>';
  };
  WIRE.timeline = function (el, s) {
    var flat = []; s.eras.forEach(function (er) { er.items.forEach(function (it) { flat.push(it); }); });
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-t]"); if (!b) return;
      var it = flat[+b.getAttribute("data-t")];
      $$(".tli", el).forEach(function (x) { x.classList.toggle("on", x === b); });
      if (!it.more) return;
      $("[data-out]", el).innerHTML = '<div class="panel hi detail"><span class="label">' + H(it.y) + "</span><h3>" + H(it.h) + "</h3>" + refEl(it.r) + paras(it.more) + "</div>";
    });
  };

  RENDER.lens = function (s) {
    return (s.q ? '<p class="lens-q">' + H(s.q) + "</p>" : "") + '<div class="lens"><div class="chips" role="tablist">' + s.views.map(function (v, i) { return '<button class="chip" type="button" role="tab" data-v="' + i + '">' + H(v.name) + "</button>"; }).join("") + '</div><div data-out></div></div>';
  };
  WIRE.lens = function (el, s) {
    function pick(i) {
      $$("[data-v]", el).forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-v") === i)); });
      var v = s.views[i];
      $("[data-out]", el).innerHTML = '<div class="lens-body">' + (v.who ? '<span class="label">' + H(v.who) + "</span>" : "") + paras(L(v.p)) + refEl(v.r) + (v.c ? '<p class="crit"><b>' + U("weigh") + ":</b> " + H(v.c) + "</p>" : "") + "</div>";
    }
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-v]"); if (b) pick(+b.getAttribute("data-v")); });
    pick(s.start || 0);
  };

  RENDER.spectrum = function (s) {
    var id = "sp" + (++uid);
    return '<div class="spec"><div class="spec-ends"><span>' + H(s.left) + "</span><span>" + H(s.right) + '</span></div><div class="spec-track"></div><label class="label" for="' + id + '">' + U("slide") + '</label><input id="' + id + '" type="range" min="0" max="' + (s.stops.length - 1) + '" value="' + (s.start || 0) + '" step="1"><div class="chips">' + s.stops.map(function (st, i) { return '<button class="chip" type="button" data-s="' + i + '">' + H(st.name) + "</button>"; }).join("") + '</div><div data-out></div></div>';
  };
  WIRE.spectrum = function (el, s) {
    var input = $("input", el);
    function pick(i) {
      input.value = i;
      $$("[data-s]", el).forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-s") === i)); });
      var st = s.stops[i];
      $("[data-out]", el).innerHTML = '<div class="panel hi detail"><h3>' + H(st.name) + "</h3>" + paras(L(st.p)) + (st.who ? '<p class="note">' + H(st.who) + "</p>" : "") + refEl(st.r) + "</div>";
    }
    input.addEventListener("input", function () { pick(+input.value); });
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-s]"); if (b) pick(+b.getAttribute("data-s")); });
    pick(s.start || 0);
  };

  RENDER.flip = function (s) {
    return '<div class="flips">' + s.items.map(function (f) {
      return '<button class="flip" type="button" aria-label="' + esc(T(f.q)) + '"><span class="flip-in"><span class="ff front"><span class="label">' + U("objection") + "</span><h3>" + H(f.q) + '</h3><span class="ref">' + U("tapFlip") + '</span></span><span class="ff back"><span class="label" style="color:var(--acc)">' + U("response") + "</span>" + H(f.a) + (f.r ? "<br>" + refEl(f.r) : "") + "</span></span></button>";
    }).join("") + "</div>";
  };
  WIRE.flip = function (el) { el.addEventListener("click", function (e) { var b = e.target.closest(".flip"); if (b) b.classList.toggle("on"); }); };

  RENDER.steps = function (s) {
    return '<div class="stepper"><div class="step-list">' + s.items.map(function (st, i) { return '<button type="button" data-st="' + i + '"><b>' + String(i + 1).padStart(2, "0") + "</b>" + H(st.h) + "</button>"; }).join("") + '</div><div data-out></div></div>';
  };
  WIRE.steps = function (el, s) {
    var n = s.items.length;
    function pick(i) {
      $$("[data-st]", el).forEach(function (b) { b.setAttribute("aria-current", String(+b.getAttribute("data-st") === i)); });
      var st = s.items[i];
      $("[data-out]", el).innerHTML = '<div class="step-card"><div class="prog"><i style="width:' + ((i + 1) / n * 100) + '%"></i></div><span class="label">' + U("step") + " " + (i + 1) + " / " + n + "</span><h3>" + H(st.h) + "</h3>" + refEl(st.r) + paras(L(st.p)) + (st.prayer ? '<div class="prayer">' + H(st.prayer) + "</div>" : "") + '<div class="row"><button class="btn ghost" type="button" data-go="' + (i - 1) + '"' + (i ? "" : " disabled") + ">← " + U("prev") + '</button><button class="btn" type="button" data-go="' + (i + 1) + '"' + (i < n - 1 ? "" : " disabled") + ">" + U("next") + " →</button></div></div>";
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-st]"); if (b) pick(+b.getAttribute("data-st"));
      var g = e.target.closest("[data-go]"); if (g && !g.disabled) pick(+g.getAttribute("data-go"));
    });
    pick(0);
  };

  RENDER.table = function (s) {
    return (s.filter ? '<div class="chips" data-filter>' + '<button class="chip" type="button" data-f="-1" aria-pressed="true">' + U("all") + "</button>" + s.rows.map(function (r, i) { return '<button class="chip" type="button" data-f="' + i + '">' + H(r[0]) + "</button>"; }).join("") + "</div>" : "") +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + s.cols.map(function (c) { return "<th>" + H(c) + "</th>"; }).join("") + "</tr></thead><tbody>" + s.rows.map(function (r, i) {
        return '<tr data-r="' + i + '">' + r.map(function (c, j) { return j ? "<td>" + H(c) + "</td>" : '<th scope="row">' + H(c) + "</th>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  };
  WIRE.table = function (el) {
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-f]"); if (!b) return; var f = +b.getAttribute("data-f");
      $$("[data-f]", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      $$("tr[data-r]", el).forEach(function (tr) { tr.classList.toggle("dim", f > -1 && +tr.getAttribute("data-r") !== f); });
    });
  };

  RENDER.matrix = function (s) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th>' + s.cols.map(function (c) { return "<th>" + H(c) + "</th>"; }).join("") + "</tr></thead><tbody>" + s.rows.map(function (r) {
      return '<tr><th scope="row">' + H(r.h) + (r.p ? '<br><span class="muted" style="font-weight:400;font-size:13px">' + H(r.p) + "</span>" : "") + "</th>" + r.v.map(function (v) { var d = ""; for (var i = 0; i < 3; i++) d += "<i" + (i < v ? ' class="f"' : "") + "></i>"; return '<td><span class="dots" title="' + v + '/3">' + d + "</span></td>"; }).join("") + "</tr>";
    }).join("") + "</tbody></table></div>" + (s.note ? '<p class="note">' + H(s.note) + "</p>" : "");
  };

  RENDER.check = function (s) {
    var keys = Object.keys(s.groups);
    return '<div class="check"><div class="check-list">' + s.items.map(function (it, i) { var id = "ck" + (++uid); return '<label for="' + id + '"><input type="checkbox" id="' + id + '" data-k="' + it.k + '">' + H(it.t) + "</label>"; }).join("") + '</div><div class="meter panel"><span class="label">' + U("pattern") + "</span>" + keys.map(function (k) { return '<div class="mrow" data-m="' + k + '"><span>' + H(s.groups[k].h) + '</span><span class="mb"><i style="width:0;background:' + s.groups[k].c + '"></i></span><span class="v">0</span></div>'; }).join("") + '<div data-out></div><p class="note">' + H(s.note) + "</p></div></div>";
  };
  WIRE.check = function (el, s) {
    var keys = Object.keys(s.groups);
    function upd() {
      var c = {}, tot = {}; keys.forEach(function (k) { c[k] = 0; tot[k] = 0; });
      $$("input[data-k]", el).forEach(function (i) { var k = i.getAttribute("data-k"); tot[k]++; if (i.checked) c[k]++; });
      var top = null;
      keys.forEach(function (k) { var row = $('[data-m="' + k + '"]', el); $("i", row).style.width = (tot[k] ? c[k] / tot[k] * 100 : 0) + "%"; $(".v", row).textContent = c[k]; if (c[k] && (!top || c[k] / tot[k] > c[top] / tot[top])) top = k; });
      var any = keys.filter(function (k) { return c[k]; });
      $("[data-out]", el).innerHTML = any.length ? any.map(function (k) { return '<div class="detail" style="border-left:3px solid ' + s.groups[k].c + ';padding-left:10px"><b>' + H(s.groups[k].h) + "</b><p style=\"font-size:15px\">" + H(s.groups[k].p) + "</p></div>"; }).join("") : '<p class="muted">' + U("tickHint") + "</p>";
    }
    el.addEventListener("change", upd); upd();
  };

  RENDER.scale = function (s) {
    var svg = '<svg viewBox="0 0 560 230"><polygon points="280,60 250,210 310,210" fill="var(--line)"/><rect x="200" y="208" width="160" height="10" rx="4" fill="var(--line)"/><g class="beam" data-beam><rect x="60" y="56" width="440" height="8" rx="4" fill="var(--acc)"/>' +
      '<g class="pan" data-pan="l"><line x1="80" y1="60" x2="80" y2="120" stroke="var(--muted)"/><path d="M30 120 h100 a50 22 0 0 1 -100 0z" fill="var(--surface)" stroke="var(--line)"/><text x="80" y="160" text-anchor="middle" fill="var(--ink)" style="font-family:var(--mono);font-size:12px" data-cnt="l">0</text></g>' +
      '<g class="pan" data-pan="r"><line x1="480" y1="60" x2="480" y2="120" stroke="var(--muted)"/><path d="M430 120 h100 a50 22 0 0 1 -100 0z" fill="var(--surface)" stroke="var(--line)"/><text x="480" y="160" text-anchor="middle" fill="var(--ink)" style="font-family:var(--mono);font-size:12px" data-cnt="r">0</text></g></g><circle cx="280" cy="60" r="7" fill="var(--ink)"/></svg>';
    function col(side, d) { return '<div class="panel"><span class="label">' + H(d.h) + '</span><div class="chips" style="display:grid">' + d.items.map(function (it, i) { return '<button class="chip" type="button" data-side="' + side + '" data-i="' + i + '">' + H(it) + "</button>"; }).join("") + "</div></div>"; }
    return '<div class="scale"><div class="scale-fig">' + svg + '</div><div class="scale-cols">' + col("l", s.left) + col("r", s.right) + '</div><div data-out></div></div>';
  };
  WIRE.scale = function (el, s) {
    function upd() {
      var l = $$('[data-side="l"][aria-pressed="true"]', el).length, r = $$('[data-side="r"][aria-pressed="true"]', el).length;
      var ang = Math.max(-14, Math.min(14, (r - l) * 3));
      $("[data-beam]", el).style.transform = "rotate(" + ang + "deg)";
      $$(".pan", el).forEach(function (p) { var x = p.getAttribute("data-pan") === "l" ? 80 : 480; p.style.transformOrigin = x + "px 60px"; p.style.transform = "rotate(" + (-ang) + "deg)"; });
      $('[data-cnt="l"]', el).textContent = l; $('[data-cnt="r"]', el).textContent = r;
      var msg = l === 0 && r === 0 ? s.center.p0 : Math.abs(l - r) <= 1 ? s.center.even : l > r ? s.center.left : s.center.right;
      $("[data-out]", el).innerHTML = '<div class="panel hi detail"><p>' + H(msg) + "</p></div>";
    }
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-side]"); if (!b) return; b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); upd(); });
    upd();
  };

  RENDER.pyramid = function (s) {
    var n = s.levels.length;
    return '<div class="pyr"><div class="pyr-fig">' + s.levels.map(function (l, i) { return '<button type="button" data-l="' + i + '" style="width:' + (40 + i * (60 / Math.max(1, n - 1))) + '%">' + H(l.h) + "</button>"; }).join("") + '</div><div data-out></div></div>';
  };
  WIRE.pyramid = function (el, s) {
    function pick(i) { $$("[data-l]", el).forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-l") === i); }); var l = s.levels[i]; $("[data-out]", el).innerHTML = '<div class="panel hi detail"><h3>' + H(l.h) + "</h3>" + refEl(l.r) + paras(L(l.p)) + "</div>"; }
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-l]"); if (b) pick(+b.getAttribute("data-l")); });
    pick(s.start || 0);
  };

  RENDER.wheel = function (s) {
    var n = s.words.length, cx = 190, cy = 190, ro = 180, ri = 70, svg = "";
    s.words.forEach(function (w, i) {
      var a1 = -Math.PI / 2 + i * 2 * Math.PI / n, a2 = a1 + 2 * Math.PI / n, am = (a1 + a2) / 2;
      var p = function (r, a) { return (cx + r * Math.cos(a)).toFixed(1) + " " + (cy + r * Math.sin(a)).toFixed(1); };
      var d = "M" + p(ri, a1) + " L" + p(ro, a1) + " A" + ro + " " + ro + " 0 0 1 " + p(ro, a2) + " L" + p(ri, a2) + " A" + ri + " " + ri + " 0 0 0 " + p(ri, a1) + "z";
      var tx = cx + (ri + ro) / 2 * Math.cos(am), ty = cy + (ri + ro) / 2 * Math.sin(am);
      svg += '<g class="wseg" tabindex="0" role="button" data-w="' + i + '"><path d="' + d + '"/><text x="' + tx + '" y="' + (ty + 4) + '" text-anchor="middle">' + esc(w.w) + "</text></g>";
    });
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (ri - 6) + '" fill="var(--acc-soft)" stroke="var(--acc)"/>' + wrapSvg(T(s.center), cx, cy, 12, 14).replace("<text ", '<text style="fill:var(--ink);font-family:var(--display);font-weight:700" ');
    return '<div class="wheel"><div class="wheel-fig"><svg viewBox="0 0 380 380">' + svg + '</svg></div><div data-out></div></div>';
  };
  WIRE.wheel = function (el, s) {
    function pick(i) { $$(".wseg", el).forEach(function (g) { g.classList.toggle("on", +g.getAttribute("data-w") === i); }); var w = s.words[i]; $("[data-out]", el).innerHTML = '<div class="panel hi detail"><span class="orig" lang="he">' + esc(w.o) + '</span><h3>' + esc(w.w) + " · " + H(w.m) + "</h3>" + refEl(w.r) + paras(L(w.p)) + "</div>"; }
    el.addEventListener("click", function (e) { var g = e.target.closest(".wseg"); if (g) pick(+g.getAttribute("data-w")); });
    el.addEventListener("keydown", function (e) { var g = e.target.closest(".wseg"); if (g && e.key === "Enter") pick(+g.getAttribute("data-w")); });
    pick(0);
  };

  RENDER.builder = function (s) {
    return '<div class="builder"><span class="label">' + H(s.ask) + '</span><div class="chips">' + s.items.map(function (it, i) { return '<button class="chip" type="button" data-b="' + i + '">' + H(it.need) + "</button>"; }).join("") + '</div><div data-out></div>' + (s.note ? '<p class="note">' + H(s.note) + "</p>" : "") + "</div>";
  };
  WIRE.builder = function (el, s) {
    function pick(i) {
      $$("[data-b]", el).forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-b") === i)); });
      var it = s.items[i];
      $("[data-out]", el).innerHTML = '<div class="verse">' + refEl(it.r) + H(it.promise) + '</div><div class="decl">' + H(it.decl) + "</div>" + (it.why ? '<p class="muted">' + H(it.why) + "</p>" : "");
    }
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-b]"); if (b) pick(+b.getAttribute("data-b")); });
    pick(0);
  };

  RENDER.vs = function (s) {
    function col(d, hi) { return '<div class="panel' + (hi ? " hi" : "") + '"><span class="label">' + H(d.h) + "</span><ul>" + d.items.map(function (x) { return "<li>" + H(x) + "</li>"; }).join("") + "</ul></div>"; }
    return '<div class="vs">' + col(s.left) + col(s.right, true) + "</div>" + (s.foot ? '<p class="muted">' + H(s.foot) + "</p>" : "");
  };

  RENDER.quiz = function (s) {
    return '<div class="quiz">' + s.items.map(function (q, i) {
      return '<div class="qcard" data-q="' + i + '"><b>' + (i + 1) + ". " + H(q.q) + '</b><div class="opts">' + q.o.map(function (o, j) { return '<button class="opt" type="button" data-o="' + j + '">' + H(o) + "</button>"; }).join("") + '</div><p class="why" hidden></p></div>';
    }).join("") + '<p class="label" data-score></p></div>';
  };
  WIRE.quiz = function (el, s) {
    var right = 0, answered = 0;
    el.addEventListener("click", function (e) {
      var b = e.target.closest(".opt"); if (!b) return;
      var card = b.closest(".qcard"); if (card._done) return; card._done = true;
      var q = s.items[+card.getAttribute("data-q")], j = +b.getAttribute("data-o");
      answered++; if (j === q.a) right++;
      $$(".opt", card).forEach(function (o, k) { if (k === q.a) o.classList.add("ok"); else if (k === j) o.classList.add("no"); });
      var w = $(".why", card); w.innerHTML = H(q.w); w.hidden = false;
      $("[data-score]", el).textContent = U("score") + ": " + right + " / " + answered;
    });
  };

  /* ---------- views ---------- */
  var main = $("#main"), layer = $("#layer");

  function sectionHTML(st, s, i) {
    var key = st.id + "." + s.id;
    var body = (RENDER[s.type] || RENDER.prose)(s);
    return '<section class="sec" id="' + st.id + "-" + s.id + '" data-sec="' + i + '"><div class="sec-h"><div style="display:grid;gap:6px"><span class="kind">' + esc(T(PP.ui["k_" + s.type] || KIND[s.type] || "")) + "</span><h2>" + H(s.title) + '</h2></div><button class="done-btn" type="button" data-done="' + key + '" aria-pressed="' + !!done[key] + '">' + (done[key] ? "✓ " + U("studied") : U("markStudied")) + "</button></div>" + (s.lead ? '<p class="lead">' + H(s.lead) + "</p>" : "") + body + "</section>";
  }

  function progress(st) { var n = st.sections.length, d = 0; st.sections.forEach(function (s) { if (done[st.id + "." + s.id]) d++; }); return n ? d / n : 0; }

  function renderStudy(st, anchor) {
    document.body.className = "acc-" + st.accent;
    main.innerHTML = '<div class="plate"><header class="shead"><div><span class="label">' + U("study") + " " + st.n + " · " + st.sections.length + " " + U("sections") + "</span><h1>" + H(st.title) + '</h1><p class="tag">' + H(st.tagline) + '</p></div><div class="sglyph" aria-hidden="true">' + glyph(st.accent) + '</div></header><div class="verse-band">' + H(st.verse.t) + refEl(st.verse.r) + '</div><nav class="toc" aria-label="' + esc(U("inStudy")) + '">' + st.sections.map(function (s) { return '<a href="#' + st.id + "-" + s.id + '">' + H(s.short || s.title) + "</a>"; }).join("") + "</nav>" +
      st.sections.map(function (s, i) { return sectionHTML(st, s, i); }).join("") + nextLink(st) + "</div>" + footer();
    st.sections.forEach(function (s, i) { var el = $('[data-sec="' + i + '"]', main); if (WIRE[s.type]) WIRE[s.type](el, s); });
    if (anchor) { var a = document.getElementById(anchor); if (a) setTimeout(function () { a.scrollIntoView(); }, 30); } else window.scrollTo(0, 0);
    spy(st);
  }
  function nextLink(st) {
    var i = PP.studies.indexOf(st), nx = PP.studies[(i + 1) % PP.studies.length];
    return '<a class="scard acc-' + nx.accent + '" href="#' + nx.id + '"><span class="n">' + U("nextStudy") + "</span><h3>" + H(nx.title) + "</h3><p>" + H(nx.tagline) + "</p></a>";
  }
  function footer() { return '<footer class="footer"><p>' + H(PP.ui.foot1) + "</p><p>" + H(PP.ui.foot2) + "</p></footer>"; }

  function spy(st) {
    if (window._pp_obs) window._pp_obs.disconnect();
    if (!("IntersectionObserver" in window)) return;
    window._pp_obs = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        $$(".toc a").forEach(function (a) { var on = a.getAttribute("href") === "#" + id; a.classList.toggle("on", on); if (on && a.scrollIntoView && a.parentNode.scrollWidth > a.parentNode.clientWidth) a.parentNode.scrollLeft = a.offsetLeft - 40; });
        $$(".rail .sub").forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + id); });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    $$(".sec", main).forEach(function (s) { window._pp_obs.observe(s); });
  }

  function glyph(acc) {
    var g = {
      flame: '<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="none" stroke="var(--line)"/><circle cx="100" cy="100" r="64" fill="none" stroke="var(--acc)" stroke-dasharray="3 7"><animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="40s" repeatCount="indefinite"/></circle><path d="M100 40c14 22 30 34 30 60a30 30 0 0 1-60 0c0-14 9-24 15-34 4 9 6 14 14 19 0-18-4-30 1-45z" fill="var(--acc)"/><path d="M100 150v30M70 160l-12 18M130 160l12 18" stroke="var(--acc)" stroke-width="3" stroke-linecap="round"/></svg>',
      sky: '<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="none" stroke="var(--line)"/><path d="M30 120c20-40 120-40 140 0" fill="none" stroke="var(--acc)" stroke-width="2"/><circle cx="100" cy="98" r="22" fill="none" stroke="var(--acc)" stroke-width="3"/><circle cx="100" cy="98" r="9" fill="var(--acc)"><animate attributeName="r" values="7;11;7" dur="4s" repeatCount="indefinite"/></circle><path d="M100 40v18M60 52l9 14M140 52l-9 14M100 140v40" stroke="var(--acc)" stroke-width="3" stroke-linecap="round"/><path d="M78 160h44" stroke="var(--acc)" stroke-width="3"/></svg>',
      tide: '<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="none" stroke="var(--line)"/><g fill="none" stroke="var(--acc)" stroke-width="3" stroke-linecap="round"><path d="M30 120q17-30 35 0t35 0 35 0 35 0"><animate attributeName="d" dur="5s" repeatCount="indefinite" values="M30 120q17-30 35 0t35 0 35 0 35 0;M30 120q17 30 35 0t35 0 35 0 35 0;M30 120q17-30 35 0t35 0 35 0 35 0"/></path><path d="M120 50v60M120 50l26 -8v18" /></g><circle cx="110" cy="112" r="11" fill="var(--acc)"/><path d="M70 150c10 14 50 14 60 0" stroke="var(--acc)" stroke-width="2" fill="none" opacity=".5"/></svg>',
      rose: '<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="none" stroke="var(--line)"/><g stroke="var(--muted)" stroke-width="5" fill="none"><ellipse cx="62" cy="100" rx="20" ry="13"/><ellipse cx="138" cy="100" rx="20" ry="13"/></g><g stroke="var(--acc)" stroke-width="5" fill="none" stroke-linecap="round"><path d="M80 96l10-6"><animate attributeName="d" dur="3s" repeatCount="indefinite" values="M80 96l10-6;M80 92l12-16;M80 96l10-6"/></path><path d="M120 104l-10 6"><animate attributeName="d" dur="3s" repeatCount="indefinite" values="M120 104l-10 6;M120 108l-12 16;M120 104l-10 6"/></path></g><path d="M100 30v30M88 42h24" stroke="var(--acc)" stroke-width="4" stroke-linecap="round"/><path d="M60 150q40 22 80 0" stroke="var(--acc)" stroke-width="2" fill="none"/></svg>'
    };
    return g[acc] || g.flame;
  }

  function renderHome() {
    document.body.className = "acc-gold";
    var n = PP.studies.length, orbs = "";
    PP.studies.forEach(function (st, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n + Math.PI / 4, x = 250 + 158 * Math.cos(a), y = 250 + 158 * Math.sin(a);
      orbs += '<a href="#' + st.id + '" class="acc-' + st.accent + '"><g class="orb"><circle cx="' + x + '" cy="' + y + '" r="66" fill="var(--surface)" stroke="var(--acc)" stroke-width="2"/><circle cx="' + x + '" cy="' + y + '" r="66" fill="var(--acc)" opacity=".12"/>' + wrapSvg(T(st.short), x, y - 4, 12, 15) + '<text class="sm" x="' + x + '" y="' + (y + 34) + '" text-anchor="middle">' + esc(U("study").toUpperCase()) + " " + st.n + "</text></g></a>";
    });
    var svg = '<svg viewBox="0 0 500 500" role="img" aria-label="' + esc(U("mapLabel")) + '"><g class="spin"><circle cx="250" cy="250" r="158" fill="none" stroke="var(--line)" stroke-dasharray="2 8"/><circle cx="250" cy="250" r="232" fill="none" stroke="var(--line)" stroke-dasharray="1 12"/></g><circle cx="250" cy="250" r="70" fill="var(--gold)" opacity=".12"/><circle cx="250" cy="250" r="54" fill="none" stroke="var(--gold)"/>' + wrapSvg(T(PP.ui.hubCenter), 250, 250, 12, 15).replace("<text ", '<text style="fill:var(--gold)" ') + orbs + "</svg>";
    main.innerHTML = '<div class="plate"><section class="hero"><div><span class="label">' + U("eyebrow") + "</span><h1>" + T(PP.ui.heroTitle) + '</h1><p class="lede">' + H(PP.ui.heroLede) + '</p></div><div class="atlas">' + svg + '</div></section><div class="verse-band" style="--acc:var(--gold)">' + H(PP.ui.heroVerse.t) + refEl(PP.ui.heroVerse.r) + '</div><section class="sec"><div class="sec-h"><h2>' + U("fourStudies") + '</h2></div><div class="study-cards">' + PP.studies.map(function (st) {
      var p = progress(st);
      return '<a class="scard acc-' + st.accent + '" href="#' + st.id + '"><span class="n">' + U("study") + " " + st.n + " · " + st.sections.length + " " + U("sections") + "</span><h3>" + H(st.title) + "</h3><p>" + H(st.tagline) + '</p><div class="bar" title="' + Math.round(p * 100) + '%"><i style="width:' + (p * 100) + '%"></i></div></a>';
    }).join("") + "</div></section>" + PP.home.map(function (s, i) { return '<section class="sec acc-gold" data-sec="h' + i + '"><div class="sec-h"><div style="display:grid;gap:6px"><span class="kind">' + esc(T(PP.ui["k_" + s.type] || KIND[s.type] || "")) + "</span><h2>" + H(s.title) + "</h2></div></div>" + (s.lead ? '<p class="lead">' + H(s.lead) + "</p>" : "") + RENDER[s.type](s) + "</section>"; }).join("") + "</div>" + footer();
    PP.home.forEach(function (s, i) { if (WIRE[s.type]) WIRE[s.type]($('[data-sec="h' + i + '"]', main), s); });
    window.scrollTo(0, 0);
  }

  function renderNav(cur) {
    var rail = '<a href="#home" class="acc-gold"' + (cur === "home" ? ' aria-current="page"' : "") + '><span class="dot"></span>' + U("home") + '</a><span class="label">' + U("fourStudies") + "</span>";
    PP.studies.forEach(function (st) {
      rail += '<a href="#' + st.id + '" class="acc-' + st.accent + '"' + (cur === st.id ? ' aria-current="page"' : "") + '><span class="dot"></span>' + H(st.short) + "</a>";
      if (cur === st.id) st.sections.forEach(function (s) { rail += '<a class="sub acc-' + st.accent + '" href="#' + st.id + "-" + s.id + '">' + H(s.short || s.title) + "</a>"; });
    });
    $("#rail").innerHTML = rail;
    $("#tabbar").innerHTML = '<a href="#home" class="acc-gold"' + (cur === "home" ? ' aria-current="page"' : "") + "><i></i>" + U("home") + "</a>" + PP.studies.map(function (st) { return '<a href="#' + st.id + '" class="acc-' + st.accent + '"' + (cur === st.id ? ' aria-current="page"' : "") + "><i></i>" + H(st.tab || st.short) + "</a>"; }).join("");
  }

  var current = null;
  function route(force) {
    var h = (location.hash || "#home").slice(1), parts = h.split("-"), st = study(parts[0]);
    var view = st ? st.id : "home";
    renderNav(view);
    if (view !== current || force) { current = view; if (st) renderStudy(st, parts.length > 1 ? h : null); else renderHome(); }
    else if (st && parts.length > 1) { var a = document.getElementById(h); if (a) a.scrollIntoView(); }
    document.title = T(PP.ui.brand);
  }

  /* ---------- sheet & search ---------- */
  function openSheet(html) {
    layer.innerHTML = '<div class="scrim" data-close></div><aside class="sheet ' + document.body.className + '" role="dialog" aria-modal="true"><button class="icon-btn x" type="button" data-close>' + U("close") + " ✕</button>" + html + "</aside>";
    var b = $(".sheet .x"); if (b) b.focus();
  }
  function closeLayer() { layer.innerHTML = ""; }
  layer.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeLayer(); if (e.target.closest(".results a")) closeLayer(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLayer();
    if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });

  function strings(o, out) {
    if (Array.isArray(o) && o.length === 2 && typeof o[0] === "string" && typeof o[1] === "string") { out.push(T(o)); return out; }
    if (typeof o === "string") { out.push(o); return out; }
    if (o && typeof o === "object") for (var k in o) if (k !== "id" && k !== "type" && k !== "accent") strings(o[k], out);
    return out;
  }
  var index = null, indexLang = null;
  function buildIndex() {
    index = [];
    PP.studies.forEach(function (st) { st.sections.forEach(function (s) { index.push({ st: st, s: s, text: strings(s, []).join(" • ").replace(/\*/g, "") }); }); });
    indexLang = lang;
  }
  function openSearch() {
    if (!index || indexLang !== lang) buildIndex();
    layer.innerHTML = '<div class="scrim" data-close></div><div class="search-box" role="dialog" aria-modal="true"><input id="pp-q" type="search" placeholder="' + esc(U("searchPh")) + '" aria-label="' + esc(U("search")) + '"><div class="results" id="pp-res"></div></div>';
    var q = $("#pp-q"); q.focus();
    q.addEventListener("input", function () {
      var v = q.value.trim().toLowerCase(), res = $("#pp-res");
      if (v.length < 2) { res.innerHTML = ""; return; }
      var hits = index.filter(function (x) { return x.text.toLowerCase().indexOf(v) > -1; }).slice(0, 30);
      res.innerHTML = hits.length ? hits.map(function (x) {
        var t = x.text, i = t.toLowerCase().indexOf(v), snip = t.slice(Math.max(0, i - 60), i + 90);
        return '<a href="#' + x.st.id + "-" + x.s.id + '"><b>' + H(x.s.title) + "</b><small>" + H(x.st.short) + " · …" + esc(snip) + "…</small></a>";
      }).join("") : '<p class="empty">' + U("noResults") + "</p>";
    });
  }
  $("#search-btn").addEventListener("click", openSearch);

  /* ---------- language ---------- */
  function setLangUI() {
    document.documentElement.setAttribute("lang", lang);
    $$(".lang-switch button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang)); });
    $$("[data-ui]").forEach(function (el) { el.textContent = U(el.getAttribute("data-ui")); });
    $("#search-btn").setAttribute("aria-label", U("search"));
  }
  $(".lang-switch").addEventListener("click", function (e) {
    var b = e.target.closest("[data-lang]"); if (!b || b.getAttribute("data-lang") === lang) return;
    var y = window.scrollY, sec = null;
    $$(".sec[id]", main).some(function (s) { if (s.getBoundingClientRect().bottom > 140) { sec = s.id; return true; } return false; });
    lang = b.getAttribute("data-lang"); store("pp.lang", lang); setLangUI();
    route(true);
    if (sec && document.getElementById(sec)) document.getElementById(sec).scrollIntoView(); else window.scrollTo(0, y);
  });

  main.addEventListener("click", function (e) {
    var b = e.target.closest("[data-done]"); if (!b) return;
    var k = b.getAttribute("data-done"); done[k] = !done[k]; if (!done[k]) delete done[k]; store("pp.done", done);
    b.setAttribute("aria-pressed", String(!!done[k])); b.textContent = done[k] ? "✓ " + U("studied") : U("markStudied");
  });

  window.addEventListener("hashchange", function () { route(false); });
  setLangUI();
  route(true);
})();
