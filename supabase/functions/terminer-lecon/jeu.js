// Fichier généré par scripts/fonctions.mjs à partir de src/lib/jeu : ne pas modifier à la main.

// src/data/regles.json
var regles_default = {
  vies: {
    max: 5,
    recharge_minutes: 30,
    regagnee_par_revision: 1,
    questions_min_revision: 3
  },
  points: {
    qcm_juste: 10,
    carte_max: 10,
    saisie_max: 10,
    estimation_juste: 10,
    pastilles_max: 10,
    bonus_sans_faute_par_question: 5,
    bonus_serie_pourcent: 10,
    bonus_serie_plafond_pourcent: 50
  },
  reussite: {
    lecon: 1,
    epreuve: 1
  },
  serie: {
    fuseau: "Europe/Paris",
    jours_par_gel: 7,
    gels_max: 2
  },
  revision: {
    delais_jours: [0, 1, 2, 4, 8, 16],
    questions_par_seance: 10
  },
  grades: {
    max: 6
  },
  saisie: {
    fautes_tolerees: 1,
    lettres_min_pour_tolerance: 5,
    articles_ignores: [
      "le",
      "la",
      "les",
      "l'"
    ],
    part_pour_juste: 0.7
  },
  garde_fous: {
    secondes_min_par_question: 1.5,
    parties_max_par_heure: 60
  },
  ligues: {
    taille_groupe: 30,
    montent: 7,
    descendent: 5,
    noms: [
      "Sable",
      "Gueules",
      "Azur",
      "Sinople",
      "Pourpre",
      "Argent",
      "Or"
    ],
    couleurs: [
      "#c9b48a",
      "#c0392b",
      "#2f5fa8",
      "#2b8450",
      "#7b3f8c",
      "#b9c0c4",
      "#e3b448"
    ]
  }
};

// src/lib/jeu/regles.ts
var regles = regles_default;

// src/lib/jeu/points.ts
var P = regles.points;
function pointsQcm(juste) {
  return juste ? P.qcm_juste : 0;
}
function pointsSaisie(trouvees, attendues) {
  return attendues > 0 ? Math.round(P.saisie_max * Math.min(trouvees, attendues) / attendues) : 0;
}
function bilanLecon(resultats, options = {}) {
  const total = resultats.length;
  const bonnes = resultats.filter((r) => r.juste).length;
  const seuil = options.epreuve ? regles.reussite.epreuve : regles.reussite.lecon;
  const points = resultats.reduce((s, r) => s + r.points, 0);
  const bonusSansFaute = total > 0 && bonnes === total ? P.bonus_sans_faute_par_question * total : 0;
  const pourcent = Math.min(P.bonus_serie_plafond_pourcent, P.bonus_serie_pourcent * Math.max(0, options.joursSerie ?? 0));
  const bonusSerie = Math.round((points + bonusSansFaute) * pourcent / 100);
  return {
    bonnes,
    total,
    reussie: total > 0 && bonnes / total >= seuil,
    points,
    bonusSansFaute,
    bonusSerie,
    totalPoints: points + bonusSansFaute + bonusSerie
  };
}

// src/lib/jeu/reponses.ts
var { fautes_tolerees, lettres_min_pour_tolerance, articles_ignores, part_pour_juste } = regles.saisie;
function normaliser(texte) {
  let s = texte.trim().toLowerCase().replace(/[’`´]/g, "'");
  for (const article of [...articles_ignores].sort((a, b) => b.length - a.length)) {
    const fin = article.endsWith("'") ? "" : "\\s+";
    const m = s.match(new RegExp(`^${article}${fin}`));
    if (m && s.length > m[0].length) {
      s = s.slice(m[0].length);
      break;
    }
  }
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function levenshtein(a, b) {
  let precedente = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const ligne = [i];
    for (let j = 1; j <= b.length; j++) {
      ligne[j] = Math.min(precedente[j] + 1, ligne[j - 1] + 1, precedente[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    precedente = ligne;
  }
  return precedente[b.length];
}
function estAcceptee(saisie, formes) {
  const s = normaliser(saisie);
  if (!s) return false;
  return formes.some((forme) => {
    const f = normaliser(forme);
    if (s === f) return true;
    return f.replace(/ /g, "").length >= lettres_min_pour_tolerance && levenshtein(s, f) <= fautes_tolerees;
  });
}
function trouverReponse(saisie, reponses, dejaTrouvees = /* @__PURE__ */ new Set()) {
  return reponses.findIndex((formes, i) => !dejaTrouvees.has(i) && estAcceptee(saisie, formes));
}
function saisieJuste(trouvees, attendues) {
  if (attendues <= 0) return false;
  return attendues === 1 ? trouvees >= 1 : trouvees / attendues >= part_pour_juste;
}

// src/lib/jeu/formats.ts
var P2 = regles.points;
function estimationJuste(valeur, juste, tolerance) {
  return Math.abs(valeur - juste) <= tolerance + 1e-9;
}
function pointsEstimation(valeur, juste, tolerance) {
  return estimationJuste(valeur, juste, tolerance) ? P2.estimation_juste : 0;
}
function pastillesJustes(cochees, justes) {
  const c = new Set(cochees);
  return c.size === justes.length && justes.every((k) => c.has(k));
}
function pointsPastilles(cochees, justes) {
  const j = new Set(justes);
  const c = [...new Set(cochees)];
  const bonnes = c.filter((k) => j.has(k)).length;
  const pieges = c.length - bonnes;
  return Math.round(P2.pastilles_max * Math.max(0, bonnes - pieges) / justes.length);
}
function ordreJuste(rangs, n) {
  return rangs.length === n && rangs.every((k, i) => k === i);
}

// src/lib/jeu/correction.ts
function corrigerQuestion(q, r) {
  switch (q.type) {
    case "qcm": {
      const juste = r === q.juste;
      return { juste, points: pointsQcm(juste) };
    }
    case "registre": {
      const juste = r === q.juste;
      return { juste, points: pointsQcm(juste) };
    }
    case "molette":
    case "jauge": {
      if (typeof r !== "number") return { juste: false, points: 0 };
      const tol = q.tolerance ?? (q.type === "jauge" ? 5 : 0);
      return { juste: estimationJuste(r, q.juste, tol), points: pointsEstimation(r, q.juste, tol) };
    }
    case "pastilles": {
      const cochees = Array.isArray(r) ? [...new Set(r.filter((x) => typeof x === "number"))] : [];
      return { juste: pastillesJustes(cochees, q.justes), points: pointsPastilles(cochees, q.justes) };
    }
    case "ordre": {
      const rangs = Array.isArray(r) ? r.filter((x) => typeof x === "number") : [];
      const juste = ordreJuste(rangs, q.elements.length);
      return { juste, points: pointsQcm(juste) };
    }
    case "saisie": {
      const textes = Array.isArray(r) ? r.filter((x) => typeof x === "string").slice(0, 200) : [];
      let n = 0;
      if (q.reponses.length === 1) n = textes.some((t) => estAcceptee(t, q.reponses[0])) ? 1 : 0;
      else {
        const trouvees = /* @__PURE__ */ new Set();
        for (const t of textes) {
          const k = trouverReponse(t, q.reponses, trouvees);
          if (k >= 0) trouvees.add(k);
        }
        n = trouvees.size;
      }
      return { juste: saisieJuste(n, q.reponses.length), points: pointsSaisie(n, q.reponses.length) };
    }
    default:
      return { juste: false, points: 0 };
  }
}
function corrigerLecon(lecon, brutes, joursSerie = 0) {
  const reponses = {};
  const resultats = lecon.questions.filter((q) => q.type !== "carte").map((q) => {
    const c = corrigerQuestion(q, brutes[q.id] ?? null);
    reponses[q.id] = c.juste;
    return c;
  });
  return { bilan: bilanLecon(resultats, { epreuve: lecon.epreuve, joursSerie }), reponses };
}
function partieCredible(nbQuestions, dureeMs) {
  return dureeMs >= nbQuestions * regles.garde_fous.secondes_min_par_question * 1e3;
}

// src/lib/jeu/serie.ts
var { fuseau, jours_par_gel, gels_max } = regles.serie;
function jourParis(maintenant) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuseau, year: "numeric", month: "2-digit", day: "2-digit" }).format(maintenant);
}
function joursEntre(de, a) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 864e5);
}

// src/lib/jeu/serveur.ts
function serieDepuisJours(jours, aujourdhui) {
  const tries = [...new Set(jours)].sort().reverse();
  if (!tries.length || joursEntre(tries[0], aujourdhui) > 1) return 0;
  let n = 1;
  for (let i = 1; i < tries.length && joursEntre(tries[i], tries[i - 1]) === 1; i++) n++;
  return n;
}
export {
  corrigerLecon,
  jourParis,
  joursEntre,
  partieCredible,
  regles,
  serieDepuisJours
};
