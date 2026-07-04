/**
 * Widget Témoignages Insuffle — embarquable en une balise script.
 *
 *   <script src="https://temoignages.insuffle.com/widget.js" defer
 *           data-marque="insuffle"    (insuffle | academie | vide = toutes)
 *           data-limit="6"            (nombre de témoignages)
 *           data-note="4"             (note minimale)
 *           data-event="…"            (id d'événement)
 *           data-type="…"             (id de typologie)
 *           data-anonyme="1"          (auteurs anonymisés)
 *           data-layout="grid"        (grid | list)
 *           data-theme="light"        (light | dark)
 *           data-target="#avis"></script>  (sélecteur CSS optionnel)
 *
 * Sans data-target, le widget s'insère juste après la balise script.
 * Isolation totale (Shadow DOM) : n'interfère pas avec le CSS du site hôte.
 * Contenu inséré uniquement via textContent : aucune injection possible.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var origin;
  try {
    origin = new URL(script.src).origin;
  } catch (e) {
    return;
  }

  var THEMES = {
    insuffle: { accent: "#eab308", accentText: "#0f172a" },
    academie: { accent: "#8e2183", accentText: "#ffffff" },
  };

  var opts = {
    marque: script.getAttribute("data-marque") || "",
    limit: parseInt(script.getAttribute("data-limit") || "6", 10),
    note: script.getAttribute("data-note") || "",
    event: script.getAttribute("data-event") || "",
    type: script.getAttribute("data-type") || "",
    anonyme: script.getAttribute("data-anonyme") === "1",
    layout: script.getAttribute("data-layout") === "list" ? "list" : "grid",
    theme: script.getAttribute("data-theme") === "dark" ? "dark" : "light",
    target: script.getAttribute("data-target") || "",
  };

  // ── Conteneur + Shadow DOM ──────────────────────────────────
  var host = document.createElement("div");
  host.setAttribute("data-temoignages-widget", "");
  if (opts.target) {
    var t = document.querySelector(opts.target);
    if (!t) return;
    t.appendChild(host);
  } else {
    script.parentNode.insertBefore(host, script.nextSibling);
  }
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var dark = opts.theme === "dark";
  var style = document.createElement("style");
  style.textContent =
    ":host{all:initial;display:block}" +
    ".wrap{font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.5;color:" + (dark ? "#e2e8f0" : "#1e293b") + "}" +
    ".grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}" +
    ".list{display:flex;flex-direction:column;gap:16px;max-width:680px}" +
    ".card{border-radius:16px;padding:20px;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;" +
      "background:" + (dark ? "#1e293b" : "#ffffff") + ";" +
      "border:1px solid " + (dark ? "rgba(148,163,184,.2)" : "rgba(15,23,42,.08)") + ";" +
      "box-shadow:0 1px 3px rgba(15,23,42,.06)}" +
    ".stars{display:flex;gap:2px}" +
    ".star{width:16px;height:16px}" +
    ".quote{margin:0;font-size:14.5px;white-space:pre-line}" +
    ".who{display:flex;align-items:center;gap:10px;margin-top:auto;padding-top:6px}" +
    ".avatar{width:36px;height:36px;border-radius:999px;display:flex;align-items:center;justify-content:center;" +
      "font-weight:700;font-size:13px;flex:none}" +
    ".name{font-weight:600;font-size:13.5px}" +
    ".meta{font-size:12px;color:" + (dark ? "#94a3b8" : "#64748b") + "}" +
    ".link{text-decoration:none;color:inherit;display:block}" +
    ".link:hover .card{border-color:" + (dark ? "rgba(148,163,184,.45)" : "rgba(15,23,42,.2)") + "}" +
    ".empty{font-size:13.5px;color:" + (dark ? "#94a3b8" : "#64748b") + ";padding:8px 0}";
  root.appendChild(style);

  var wrap = document.createElement("div");
  wrap.className = "wrap";
  root.appendChild(wrap);

  // ── Rendu ───────────────────────────────────────────────────
  function starSvg(filled, color) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("class", "star");
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", "M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.8 1-5.85L1.5 7.65l5.9-.85L10 1.5z");
    p.setAttribute("fill", filled ? color : "none");
    p.setAttribute("stroke", filled ? color : (dark ? "#475569" : "#cbd5e1"));
    p.setAttribute("stroke-width", "1.5");
    svg.appendChild(p);
    return svg;
  }

  function initials(name) {
    var parts = name.trim().split(/\s+/);
    return ((parts[0] || "").charAt(0) + (parts[1] || "").charAt(0)).toUpperCase() || "?";
  }

  function card(item) {
    var theme = THEMES[item.marque] || THEMES.insuffle;

    var a = document.createElement("a");
    a.className = "link";
    a.href = origin + item.url;
    a.target = "_blank";
    a.rel = "noopener";

    var c = document.createElement("div");
    c.className = "card";

    var stars = document.createElement("div");
    stars.className = "stars";
    for (var i = 1; i <= 5; i++) stars.appendChild(starSvg(i <= item.note, theme.accent));
    c.appendChild(stars);

    var q = document.createElement("p");
    q.className = "quote";
    var texte = item.contenu || "";
    q.textContent = texte.length > 280 ? texte.slice(0, 277).replace(/\s+\S*$/, "") + "…" : texte;
    c.appendChild(q);

    var who = document.createElement("div");
    who.className = "who";

    var av = document.createElement("div");
    av.className = "avatar";
    av.style.background = theme.accent;
    av.style.color = theme.accentText;
    av.textContent = initials(item.auteur || "?");
    who.appendChild(av);

    var idBlock = document.createElement("div");
    var nm = document.createElement("div");
    nm.className = "name";
    nm.textContent = item.auteur || "";
    idBlock.appendChild(nm);
    var metaParts = [];
    if (item.poste) metaParts.push(item.poste);
    if (item.entreprise) metaParts.push(item.entreprise);
    if (metaParts.length) {
      var mt = document.createElement("div");
      mt.className = "meta";
      mt.textContent = metaParts.join(" · ");
      idBlock.appendChild(mt);
    }
    who.appendChild(idBlock);
    c.appendChild(who);

    a.appendChild(c);
    return a;
  }

  // ── Chargement ──────────────────────────────────────────────
  var qs = [];
  if (opts.marque) qs.push("marque=" + encodeURIComponent(opts.marque));
  if (opts.limit > 0) qs.push("limit=" + opts.limit);
  if (opts.note) qs.push("note=" + encodeURIComponent(opts.note));
  if (opts.event) qs.push("event=" + encodeURIComponent(opts.event));
  if (opts.type) qs.push("type=" + encodeURIComponent(opts.type));
  if (opts.anonyme) qs.push("anonyme=1");

  fetch(origin + "/api/public/temoignages" + (qs.length ? "?" + qs.join("&") : ""))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var items = (d && d.data) || [];
      if (!items.length) {
        var e = document.createElement("p");
        e.className = "empty";
        e.textContent = "Aucun témoignage pour le moment.";
        wrap.appendChild(e);
        return;
      }
      var grid = document.createElement("div");
      grid.className = opts.layout;
      items.forEach(function (item) { grid.appendChild(card(item)); });
      wrap.appendChild(grid);
    })
    .catch(function () { /* silencieux : jamais d'erreur visible sur le site hôte */ });
})();
