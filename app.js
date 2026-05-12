let driverQuestions = [];
let englishQuestions = [];
let questions = [];
let signAssets = {};
let activeApp = localStorage.getItem("practiceActiveApp") || "driver";
const appConfigs = {
  driver: {
    progressKey: "gaDriverProgressV1",
    legacyMissedKey: "gaDriverMissed",
    eyebrow: "Georgia DDS Study Helper",
    title: "Driver License Practice",
    subtitle: "English + Amharic questions for calmer studying.",
    targetValue: "15/20",
    targetLabel: "DDS passing target",
    practiceTitle: "20-question practice test",
    practiceHelp: "Start a timed-style mixed set from the full question bank. Georgia says each Knowledge Exam part needs 15 correct out of 20.",
    testButton: "Start 20-question test",
    sourceNote: `Based on the Georgia DDS
      <a href="https://dds.georgia.gov/drivers-manual" target="_blank" rel="noreferrer">Drivers Manual</a>
      and
      <a href="https://dds.georgia.gov/testing-and-training/practice-test" target="_blank" rel="noreferrer">practice-test guidance</a>.
      This is a study app, not an official DDS exam.`,
    modes: [
      ["all", "All topics"],
      ["signs", "Road signs"],
      ["rules", "Road rules"],
      ["safety", "Safe driving"],
      ["ga", "Georgia laws"],
      ["missed", "Missed practice"]
    ],
    topicNames: {
      signs: "Road signs",
      rules: "Road rules",
      safety: "Safe driving",
      ga: "Georgia law"
    },
    topicHelp(question) {
      return question.topic === "signs"
        ? "Road signs are tested in English, so learn the English words and the meaning."
        : "Read both languages, then answer from the meaning, not just memorized words.";
    }
  },
  english: {
    progressKey: "basicEnglishProgressV1",
    legacyMissedKey: "basicEnglishMissed",
    eyebrow: "Basic English Helper",
    title: "English Practice",
    subtitle: "Work, safety, money, time, and daily English with Amharic support.",
    targetValue: "Practice",
    targetLabel: "Build confidence",
    practiceTitle: "20-question English practice",
    practiceHelp: "Practice useful sentences for work, shopping, time, safety, and everyday conversation.",
    testButton: "Start English practice",
    sourceNote: "Basic English practice for everyday and work situations. You can edit the wording in english-questions.json.",
    modes: [
      ["all", "All topics"],
      ["work", "Work English"],
      ["safety", "Safety words"],
      ["daily", "Daily phrases"],
      ["time", "Time words"],
      ["money", "Money/shopping"],
      ["missed", "Missed practice"]
    ],
    topicNames: {
      work: "Work English",
      safety: "Safety words",
      daily: "Daily phrases",
      time: "Time words",
      money: "Money/shopping"
    },
    topicHelp() {
      return "Read the situation, say the English sentence out loud, then tap Practiced.";
    }
  }
};
if (!appConfigs[activeApp]) activeApp = "driver";
const els = {
  driverAppBtn: document.querySelector("#driverAppBtn"),
  englishAppBtn: document.querySelector("#englishAppBtn"),
  appEyebrow: document.querySelector("#appEyebrow"),
  appTitle: document.querySelector("#appTitle"),
  appSubtitle: document.querySelector("#appSubtitle"),
  mode: document.querySelector("#mode"),
  score: document.querySelector("#score"),
  answered: document.querySelector("#answered"),
  streak: document.querySelector("#streak"),
  bankTotal: document.querySelector("#bankTotal"),
  targetValue: document.querySelector("#targetValue"),
  targetLabel: document.querySelector("#targetLabel"),
  questionNumber: document.querySelector("#questionNumber"),
  questionEn: document.querySelector("#questionEn"),
  questionAm: document.querySelector("#questionAm"),
  answers: document.querySelector("#answers"),
  feedback: document.querySelector("#feedback"),
  questionCard: document.querySelector(".question-card"),
  backBtn: document.querySelector("#backBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  reviewBtn: document.querySelector("#reviewBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  testBtn: document.querySelector("#testBtn"),
  clearMissedBtn: document.querySelector("#clearMissedBtn"),
  speakBtn: document.querySelector("#speakBtn"),
  signVisual: document.querySelector("#signVisual"),
  inlineSignVisual: document.querySelector("#inlineSignVisual"),
  missedPanel: document.querySelector("#missedPanel"),
  missedCount: document.querySelector("#missedCount"),
  missedList: document.querySelector("#missedList"),
  topicTitle: document.querySelector("#topicTitle"),
  topicHelp: document.querySelector("#topicHelp"),
  sourceNote: document.querySelector(".source-note"),
  practiceTitle: document.querySelector("#practiceTitle"),
  practiceHelp: document.querySelector("#practiceHelp")
};

let pool = shuffle([...questions]);
let current = null;
let answeredCurrent = false;
let score = 0;
let answered = 0;
let streak = 0;
let missed = [];
let completedQuestionIds = [];
let testQueue = null;
let questionHistory = [];
let historyIndex = -1;
let showingTestComplete = false;
let showingDone = false;

function safeJsonArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function loadProgress() {
  try {
    const config = appConfigs[activeApp];
    const saved = JSON.parse(localStorage.getItem(config.progressKey) || "{}");
    return {
      score: positiveInteger(saved.score),
      answered: positiveInteger(saved.answered),
      streak: positiveInteger(saved.streak),
      missed: Array.isArray(saved.missed) ? saved.missed : safeJsonArray(config.legacyMissedKey),
      completedQuestionIds: Array.isArray(saved.completedQuestionIds) ? saved.completedQuestionIds : []
    };
  } catch {
    const config = appConfigs[activeApp];
    return {
      score: 0,
      answered: 0,
      streak: 0,
      missed: safeJsonArray(config.legacyMissedKey),
      completedQuestionIds: []
    };
  }
}

function applyProgress(progress) {
  score = progress.score;
  answered = progress.answered;
  streak = progress.streak;
  missed = progress.missed;
  completedQuestionIds = progress.completedQuestionIds;
}

function saveProgress() {
  const progress = {
    score,
    answered,
    streak,
    missed,
    completedQuestionIds,
    savedAt: new Date().toISOString()
  };
  const config = appConfigs[activeApp];
  localStorage.setItem(config.progressKey, JSON.stringify(progress));
  localStorage.setItem(config.legacyMissedKey, JSON.stringify(missed));
}

function clearProgress() {
  const config = appConfigs[activeApp];
  localStorage.removeItem(config.progressKey);
  localStorage.removeItem(config.legacyMissedKey);
}

function shuffle(items) {
  return items
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function baseQuestionsForMode() {
  const mode = els.mode.value;
  if (mode === "missed") {
    return missedQuestions();
  }
  if (mode === "all") return questions;
  return questions.filter((q) => q.topic === mode);
}

function completedQuestionSet() {
  return new Set(completedQuestionIds);
}

function filteredPool(includeCompleted = false) {
  const base = baseQuestionsForMode();
  if (includeCompleted || els.mode.value === "missed") return base;
  const completed = completedQuestionSet();
  return base.filter((q) => !completed.has(q.id));
}

function missedQuestionIds() {
  return [...new Set(missed.map((item) => typeof item === "string" ? item : item?.id).filter(Boolean))];
}

function missedQuestions() {
  const missedIds = missedQuestionIds();
  return questions.filter((q) => missedIds.includes(q.id) || missedIds.includes(q.question.en));
}

function appConfig() {
  return appConfigs[activeApp];
}

function renderAppShell() {
  const config = appConfig();
  els.driverAppBtn.classList.toggle("active", activeApp === "driver");
  els.englishAppBtn.classList.toggle("active", activeApp === "english");
  els.appEyebrow.textContent = config.eyebrow;
  els.appTitle.textContent = config.title;
  els.appSubtitle.textContent = config.subtitle;
  els.targetValue.textContent = config.targetValue;
  els.targetLabel.textContent = config.targetLabel;
  els.practiceTitle.textContent = config.practiceTitle;
  els.practiceHelp.textContent = config.practiceHelp;
  els.testBtn.textContent = config.testButton;
  els.sourceNote.innerHTML = config.sourceNote;
  els.mode.innerHTML = config.modes
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join("");
}

function switchPracticeApp(nextApp) {
  if (nextApp === activeApp) return;
  activeApp = nextApp;
  localStorage.setItem("practiceActiveApp", activeApp);
  questions = activeApp === "english" ? englishQuestions : driverQuestions;
  applyProgress(loadProgress());
  testQueue = null;
  resetQuestionHistory();
  renderAppShell();
  pool = shuffle([...filteredPool()]);
  updateStats();
  renderQuestion();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function svg(inner, viewBox = "0 0 120 120") {
  return `<svg class="road-sign-svg" viewBox="${viewBox}" aria-hidden="true">${inner}</svg>`;
}

function diamond(fill, inner) {
  return svg(`
    <rect x="18" y="18" width="84" height="84" rx="2" fill="${fill}" stroke="#151515" stroke-width="3" transform="rotate(45 60 60)"></rect>
    ${inner}
  `);
}

function textLine(text, x, y, size = 13, weight = 800, fill = "#151515") {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${fill}" font-family="Arial, sans-serif">${text}</text>`;
}

function schoolSymbol() {
  return `
    <circle cx="44" cy="34" r="6" fill="#151515"></circle>
    <circle cx="72" cy="29" r="8" fill="#151515"></circle>
    <path d="M39 45 L49 45 L55 68 L49 68 L46 94 L38 94 L41 68 L32 68 Z" fill="#151515"></path>
    <path d="M66 43 L80 43 L87 74 L79 74 L75 96 L65 96 L69 74 L58 74 Z" fill="#151515"></path>
    <path d="M49 50 L65 58 M37 49 L26 62 M79 47 L94 58" stroke="#151515" stroke-width="5" stroke-linecap="round"></path>
  `;
}

const signImages = {
  stop: {
    label: "STOP (R1-1)",
    svg: () => svg(`
      <polygon points="41,6 79,6 114,41 114,79 79,114 41,114 6,79 6,41" fill="#c73535" stroke="white" stroke-width="5"></polygon>
      ${textLine("STOP", 60, 68, 25, 900, "white")}
    `)
  },
  yield: {
    label: "YIELD (R1-2)",
    svg: () => svg(`
      <polygon points="60,112 8,10 112,10" fill="#c73535"></polygon>
      <polygon points="60,91 26,22 94,22" fill="white"></polygon>
      ${textLine("YIELD", 60, 46, 13, 900, "#c73535")}
    `)
  },
  warningDiamond: {
    label: "Warning sign",
    svg: () => diamond("#f2c94c", `${textLine("WARNING", 60, 64, 11)}`)
  },
  orangeWork: {
    label: "Work-zone warning",
    svg: () => diamond("#e8873d", `
      ${textLine("WORK", 60, 52, 13)}
      ${textLine("ZONE", 60, 69, 13)}
    `)
  },
  railroadAdvance: {
    label: "Railroad advance (W10-1)",
    svg: () => svg(`
      <circle cx="60" cy="60" r="50" fill="#f2c94c" stroke="#151515" stroke-width="4"></circle>
      <path d="M31 31 L89 89 M89 31 L31 89" stroke="#151515" stroke-width="7" stroke-linecap="round"></path>
      ${textLine("R", 40, 66, 24)}
      ${textLine("R", 80, 66, 24)}
    `)
  },
  school: {
    label: "School / school crossing (S1-1)",
    svg: () => svg(`
      <polygon points="60,8 108,44 90,108 30,108 12,44" fill="#d7f253" stroke="#151515" stroke-width="3"></polygon>
      ${schoolSymbol()}
    `)
  },
  speedLimit: {
    label: "Speed limit",
    svg: () => svg(`
      <rect x="27" y="11" width="66" height="98" rx="2" fill="white" stroke="#151515" stroke-width="3"></rect>
      ${textLine("SPEED", 60, 35, 13)}
      ${textLine("LIMIT", 60, 51, 13)}
      ${textLine("55", 60, 84, 31, 900)}
    `)
  },
  noRightTurn: {
    label: "No right turn",
    svg: () => svg(`
      <rect x="16" y="16" width="88" height="88" fill="white" stroke="#151515" stroke-width="2"></rect>
      <path d="M38 68 H70 V49 L87 66 L70 83 V73 H38 Z" fill="#151515"></path>
      <circle cx="60" cy="60" r="43" fill="none" stroke="#c73535" stroke-width="8"></circle>
      <path d="M31 89 L89 31" stroke="#c73535" stroke-width="8" stroke-linecap="round"></path>
    `)
  },
  oneWayRight: {
    label: "ONE WAY",
    svg: () => svg(`
      <rect x="8" y="37" width="104" height="46" rx="4" fill="#151515"></rect>
      ${textLine("ONE WAY", 52, 66, 15, 900, "white")}
      <path d="M91 48 L108 60 L91 72 Z" fill="white"></path>
    `)
  },
  oneWayLeft: {
    label: "ONE WAY",
    svg: () => svg(`
      <rect x="8" y="37" width="104" height="46" rx="4" fill="#151515"></rect>
      ${textLine("ONE WAY", 68, 66, 15, 900, "white")}
      <path d="M29 48 L12 60 L29 72 Z" fill="white"></path>
    `)
  },
  mergeRight: {
    label: "Merge",
    svg: () => diamond("#f2c94c", `
      <path d="M49 94 V27" stroke="#151515" stroke-width="12" stroke-linecap="butt"></path>
      <path d="M82 94 C79 74 64 64 50 57" stroke="#151515" stroke-width="10" fill="none" stroke-linecap="butt"></path>
    `)
  },
  mergeLeft: {
    label: "Merge",
    svg: () => diamond("#f2c94c", `
      <path d="M71 94 V27" stroke="#151515" stroke-width="12" stroke-linecap="butt"></path>
      <path d="M38 94 C41 74 56 64 70 57" stroke="#151515" stroke-width="10" fill="none" stroke-linecap="butt"></path>
    `)
  },
  slippery: {
    label: "Slippery when wet",
    svg: () => diamond("#f2c94c", `
      <path d="M36 43 H80 L88 59 H30 Z" fill="#151515"></path>
      <circle cx="42" cy="64" r="5" fill="#151515"></circle>
      <circle cx="76" cy="64" r="5" fill="#151515"></circle>
      <path d="M31 83 C43 73 52 93 64 83 S84 73 94 83" fill="none" stroke="#151515" stroke-width="5" stroke-linecap="round"></path>
      <path d="M25 96 C37 86 47 106 59 96 S80 86 94 96" fill="none" stroke="#151515" stroke-width="5" stroke-linecap="round"></path>
    `)
  },
  dividedHighwayBegins: {
    label: "Divided highway begins",
    svg: () => diamond("#f2c94c", `
      <path d="M35 95 V25 H50 V95 Z" fill="#151515"></path>
      <path d="M70 95 V25 H85 V95 Z" fill="#151515"></path>
      <path d="M56 86 V34 C56 26 64 26 64 34 V86 C64 94 56 94 56 86 Z" fill="#f2c94c" stroke="#151515" stroke-width="3"></path>
    `)
  },
  laneEndsRight: {
    label: "Right lane ends (W4-2R)",
    svg: () => diamond("#f2c94c", `
      <path d="M38 96 V26" stroke="#151515" stroke-width="13" stroke-linecap="butt"></path>
      <path d="M80 26 V52 C80 70 65 82 57 96" stroke="#151515" stroke-width="13" fill="none" stroke-linecap="butt"></path>
      <path d="M59 55 V85" stroke="#f2c94c" stroke-width="4" stroke-dasharray="8 6"></path>
    `)
  },
  laneEndsLeft: {
    label: "Left lane ends (W4-2L)",
    svg: () => diamond("#f2c94c", `
      <path d="M82 96 V26" stroke="#151515" stroke-width="13" stroke-linecap="butt"></path>
      <path d="M40 26 V52 C40 70 55 82 63 96" stroke="#151515" stroke-width="13" fill="none" stroke-linecap="butt"></path>
      <path d="M61 55 V85" stroke="#f2c94c" stroke-width="4" stroke-dasharray="8 6"></path>
    `)
  },
  laneEndsMergeLeft: {
    label: "LANE ENDS MERGE LEFT (W9-2)",
    svg: () => diamond("#f2c94c", `
      ${textLine("LANE ENDS", 60, 42, 10)}
      ${textLine("MERGE", 60, 60, 13)}
      ${textLine("LEFT", 60, 79, 16)}
    `)
  },
  laneEndsMergeRight: {
    label: "LANE ENDS MERGE RIGHT (W9-2)",
    svg: () => diamond("#f2c94c", `
      ${textLine("LANE ENDS", 60, 42, 10)}
      ${textLine("MERGE", 60, 60, 13)}
      ${textLine("RIGHT", 60, 79, 14)}
    `)
  },
  pedestrian: {
    label: "Pedestrian crossing",
    svg: () => diamond("#d7f253", `
      <circle cx="60" cy="32" r="7" fill="#151515"></circle>
      <path d="M55 45 L66 45 L74 72 L66 72 L62 96 L52 96 L57 72 L45 72 Z" fill="#151515"></path>
      <path d="M55 50 L41 66 M66 50 L84 61" stroke="#151515" stroke-width="5" stroke-linecap="round"></path>
    `)
  },
  bicycle: {
    label: "Bicycle warning",
    svg: () => diamond("#d7f253", `
      <circle cx="39" cy="77" r="14" fill="none" stroke="#151515" stroke-width="5"></circle>
      <circle cx="82" cy="77" r="14" fill="none" stroke="#151515" stroke-width="5"></circle>
      <path d="M39 77 L56 51 L70 77 L52 77 L62 62 M56 51 H75" fill="none" stroke="#151515" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
      <circle cx="55" cy="35" r="6" fill="#151515"></circle>
    `)
  },
  greenGuide: {
    label: "Guide sign",
    svg: () => svg(`
      <rect x="8" y="24" width="104" height="72" rx="4" fill="#25765c" stroke="white" stroke-width="3"></rect>
      ${textLine("ATLANTA", 60, 50, 15, 900, "white")}
      ${textLine("EXIT 12", 60, 73, 17, 900, "white")}
    `)
  },
  blueServices: {
    label: "Motorist services",
    svg: () => svg(`
      <rect x="8" y="24" width="104" height="72" rx="4" fill="#2457a6" stroke="white" stroke-width="3"></rect>
      ${textLine("H", 31, 55, 22, 900, "white")}
      ${textLine("GAS", 69, 53, 14, 900, "white")}
      ${textLine("FOOD", 68, 78, 14, 900, "white")}
    `)
  },
  deer: {
    label: "Deer crossing",
    svg: () => diamond("#f2c94c", `
      <path d="M34 71 L48 49 L70 48 L88 63 L79 64 L70 56 L54 58 L47 73 Z" fill="#151515"></path>
      <path d="M50 71 L45 97 M67 65 L70 97 M78 63 L84 92" stroke="#151515" stroke-width="5" stroke-linecap="round"></path>
      <path d="M88 63 L97 56 M90 58 L93 44 M94 55 L104 48" stroke="#151515" stroke-width="4" stroke-linecap="round"></path>
    `)
  },
  lowClearance: {
    label: "Low clearance",
    svg: () => diamond("#f2c94c", `
      ${textLine("LOW", 60, 42, 13)}
      ${textLine("CLEARANCE", 60, 59, 10)}
      ${textLine("12'-6\\\"", 60, 80, 18)}
    `)
  },
  crossbuck: {
    label: "Railroad crossing crossbuck",
    svg: () => svg(`
      <g transform="rotate(45 60 60)">
        <rect x="12" y="47" width="96" height="26" fill="white" stroke="#151515" stroke-width="3"></rect>
      </g>
      <g transform="rotate(-45 60 60)">
        <rect x="12" y="47" width="96" height="26" fill="white" stroke="#151515" stroke-width="3"></rect>
      </g>
      <rect x="33" y="49" width="54" height="22" fill="rgba(255,255,255,.92)"></rect>
      ${textLine("RAILROAD", 60, 57, 8)}
      ${textLine("CROSSING", 60, 68, 8)}
    `)
  },
  slowMoving: {
    label: "Slow-moving vehicle",
    svg: () => svg(`
      <polygon points="60,12 108,102 12,102" fill="#c73535"></polygon>
      <polygon points="60,29 91,91 29,91" fill="#e8873d"></polygon>
    `)
  },
  whiteDashedLanes: {
    label: "White dashed lane lines",
    svg: () => svg(`
      <rect x="18" y="8" width="84" height="104" rx="4" fill="#383d43" stroke="#151515" stroke-width="3"></rect>
      <rect x="56" y="14" width="8" height="16" fill="white"></rect>
      <rect x="56" y="42" width="8" height="16" fill="white"></rect>
      <rect x="56" y="70" width="8" height="16" fill="white"></rect>
      <rect x="56" y="98" width="8" height="10" fill="white"></rect>
    `)
  }
};

const visualAliases = {
  diamond: "warningDiamond",
  orange: "orangeWork",
  rail: "railroadAdvance",
  slow: "slowMoving",
  lanes: "whiteDashedLanes"
};

function signAssetFor(key) {
  const assetKey = visualAliases[key] || key;
  return signAssets[assetKey] || null;
}

function visualMarkup(question) {
  const labels = {
    stop: "STOP",
    yield: "",
    diamond: "WARN",
    orange: "WORK",
    rail: "RR",
    rule: "LAW",
    crossbuck: "RAILROAD\nCROSSING",
    slow: "SLOW",
    lanes: "",
    "hand-right": "RIGHT",
    "hand-stop": "STOP",
    "hand-left": "LEFT"
  };
  const visualKeys = question.visuals || [question.visual || "rule"];
  if (visualKeys.some((key) => signAssetFor(key) || signImages[key])) {
    return {
      className: `sign-visual sign-set sign-count-${visualKeys.length}`,
      html: visualKeys
      .filter((key) => signAssetFor(key) || signImages[key])
      .map((key) => {
        const asset = signAssetFor(key);
        const fallback = signImages[key] || signImages[visualAliases[key]];
        const label = asset?.label || fallback?.label || key;
        const visual = asset
          ? `<img class="sign-img" src="${escapeHtml(asset.file)}" alt="${escapeHtml(label)}">`
          : fallback.svg();
        return `
          <figure class="sign-tile">
            ${visual}
            <figcaption>${escapeHtml(label)}</figcaption>
          </figure>
        `;
      })
      .join("")
    };
  }
  return {
    className: `sign-visual sign-${question.visual || "rule"}`,
    html: ["diamond", "orange", "crossbuck", "slow"].includes(question.visual)
      ? `<span>${labels[question.visual]}</span>`
      : labels[question.visual || "rule"]
  };
}

function setVisual(question) {
  const visual = visualMarkup(question);
  els.signVisual.className = visual.className;
  els.signVisual.innerHTML = visual.html;
  const showInlineSign = activeApp === "driver" && question.topic === "signs";
  els.inlineSignVisual.hidden = !showInlineSign;
  els.inlineSignVisual.className = showInlineSign ? `inline-sign-visual ${visual.className}` : "inline-sign-visual";
  els.inlineSignVisual.innerHTML = showInlineSign ? visual.html : "";
  els.signVisual.hidden = activeApp === "english";
  els.topicTitle.textContent = appConfig().topicNames[question.topic] || "Practice";
  els.topicHelp.textContent = appConfig().topicHelp(question);
}

function resetQuestionHistory() {
  questionHistory = [];
  historyIndex = -1;
  showingTestComplete = false;
  showingDone = false;
}

function currentHistoryEntry() {
  return questionHistory[historyIndex] || null;
}

function updateNavButtons() {
  const entry = currentHistoryEntry();
  const atLatestQuestion = historyIndex === questionHistory.length - 1;
  const readyToFinishTest = Boolean(testQueue && testQueue.length === 0 && atLatestQuestion && entry?.selectedIndex !== null);
  if (showingDone) {
    els.backBtn.disabled = questionHistory.length === 0;
    els.nextBtn.textContent = "Next question";
    els.nextBtn.disabled = true;
    return;
  }
  els.backBtn.disabled = showingTestComplete ? questionHistory.length === 0 : historyIndex <= 0;
  els.nextBtn.textContent = readyToFinishTest ? "Finish test" : "Next question";
  els.nextBtn.disabled = !entry || entry.selectedIndex === null || showingTestComplete;
}

function renderPhrasePractice(entry) {
  const phrase = current.answers[current.correctIndex];
  els.answers.innerHTML = `
    <div class="phrase-card">
      <span>Say this</span>
      <strong>${escapeHtml(phrase.en)}</strong>
      <em lang="am">${escapeHtml(phrase.am)}</em>
    </div>
  `;

  if (entry.selectedIndex !== null) {
    els.feedback.hidden = false;
    els.feedback.innerHTML = `
      <b>Practiced. ተለማምደዋል።</b>
      <div class="feedback-reason">
        <span>Note</span>
        <p>${escapeHtml(current.reasoning.en)}</p>
        <p lang="am" class="amharic-reason">${escapeHtml(current.reasoning.am)}</p>
      </div>
    `;
  }
}

function applyAnswerState(selectedIndex) {
  [...els.answers.children].forEach((button, buttonIndex) => {
    button.classList.toggle("correct", selectedIndex !== null && buttonIndex === current.correctIndex);
    button.classList.toggle("wrong", selectedIndex !== null && buttonIndex === selectedIndex && selectedIndex !== current.correctIndex);
  });
}

function renderFeedback(selectedIndex) {
  const isCorrect = selectedIndex === current.correctIndex;
  const correct = current.answers[current.correctIndex];
  const selected = current.answers[selectedIndex];
  const wrongExplanation = activeApp === "driver"
    ? "This does not match the Georgia driving rule for this situation."
    : "This does not match the meaning of the English sentence.";
  const correctAnswer = `
    <div class="feedback-answer">
      <span>Correct answer</span>
      <strong>${escapeHtml(correct.en)}</strong>
      <em lang="am">${escapeHtml(correct.am)}</em>
    </div>
  `;
  const reason = `
    <div class="feedback-reason">
      <span>Reason</span>
      <p>${escapeHtml(current.reasoning.en)}</p>
      <p lang="am" class="amharic-reason">${escapeHtml(current.reasoning.am)}</p>
    </div>
  `;
  const wrongChoice = isCorrect ? "" : `
    <div class="feedback-answer selected-answer">
      <span>Your answer</span>
      <strong>${escapeHtml(selected.en)}</strong>
      <em lang="am">${escapeHtml(selected.am)}</em>
      <p>${wrongExplanation}</p>
    </div>
  `;
  els.feedback.hidden = false;
  els.feedback.innerHTML = isCorrect
    ? `<b>Correct. ትክክል ነው።</b>${correctAnswer}${reason}`
    : `<b>Not this one. ይህ አይደለም።</b>${wrongChoice}${correctAnswer}${reason}`;
}

function practiceEnglishPhrase() {
  if (answeredCurrent) return;
  answeredCurrent = true;
  answered += 1;
  score += 1;
  streak += 1;
  missed = missed.filter((item) => item !== current.id && item !== current.question.en);
  if (!completedQuestionIds.includes(current.id)) {
    completedQuestionIds.push(current.id);
  }
  const entry = currentHistoryEntry();
  if (entry) entry.selectedIndex = current.correctIndex;
  saveProgress();
  updateStats();
  renderPhrasePractice(entry);
  updateNavButtons();
}

function renderReviewFeedback() {
  const correct = current.answers[current.correctIndex];
  els.feedback.hidden = false;
  els.feedback.innerHTML = `
    <b>Review this missed question. ይህን የተሳሳተ ጥያቄ ይከልሱ።</b>
    <div class="feedback-answer">
      <span>Correct answer</span>
      <strong>${escapeHtml(correct.en)}</strong>
      <em lang="am">${escapeHtml(correct.am)}</em>
    </div>
    <div class="feedback-reason">
      <span>Reason</span>
      <p>${escapeHtml(current.reasoning.en)}</p>
      <p lang="am" class="amharic-reason">${escapeHtml(current.reasoning.am)}</p>
    </div>
  `;
}

function nextHistoryEntry() {
  const available = testQueue || filteredPool();
  if (!available.length) {
    return null;
  }

  const availableIds = new Set(available.map((q) => q.id));
  if (!testQueue) pool = pool.filter((q) => availableIds.has(q.id));
  if (!testQueue && pool.length === 0) pool = shuffle([...available]);
  const question = testQueue ? testQueue.shift() : pool[0];
  if (!testQueue) pool = pool.filter((q) => q !== question);
  return {
    question,
    label: testQueue ? `Practice test: ${20 - testQueue.length} of 20` : `Question ${answered + 1}`,
    selectedIndex: null
  };
}

function renderDoneState() {
  showingDone = true;
  current = null;
  const missedCount = missedQuestions().length;
  const totalInMode = filteredPool(true).length;
  els.questionCard?.classList?.remove("has-inline-sign");
  els.inlineSignVisual.hidden = true;
  els.inlineSignVisual.innerHTML = "";
  els.questionNumber.textContent = "DONE";
  els.questionEn.textContent = "DONE - You finished all questions.";
  els.questionAm.textContent = "ተጠናቋል - ሁሉንም ጥያቄዎች ጨርሰዋል።";
  els.answers.innerHTML = "";
  els.feedback.hidden = false;
  els.feedback.innerHTML = `
    <b>Great work. ጥሩ ስራ።</b>
    <p>You completed ${totalInMode} question${totalInMode === 1 ? "" : "s"} in this mode.</p>
    ${missedCount
      ? `<p>Now review the ${missedCount} missed question${missedCount === 1 ? "" : "s"} below.</p>`
      : "<p>No missed questions saved right now.</p>"}
  `;
  updateMissedPanel();
  updateNavButtons();
}

function renderQuestion(entry = null) {
  showingTestComplete = false;
  showingDone = false;
  let activeEntry = entry;
  if (!activeEntry) {
    activeEntry = nextHistoryEntry();
  }

  if (!activeEntry) {
    if (els.mode.value === "missed" && missedQuestions().length === 0) {
      current = null;
      els.questionNumber.textContent = "No questions";
      els.questionEn.textContent = "No missed questions yet.";
      els.questionAm.textContent = "እስካሁን የተሳሳቱ ጥያቄዎች የሉም።";
      els.answers.innerHTML = "";
      els.feedback.hidden = true;
      els.questionCard?.classList?.remove("has-inline-sign");
      updateNavButtons();
    } else {
      renderDoneState();
    }
    return;
  }

  if (!entry) {
    if (historyIndex < questionHistory.length - 1) {
      questionHistory = questionHistory.slice(0, historyIndex + 1);
    }
    questionHistory.push(activeEntry);
    historyIndex = questionHistory.length - 1;
  }

  current = activeEntry.question;
  answeredCurrent = activeEntry.selectedIndex !== null;
  els.questionCard?.classList?.toggle("has-inline-sign", activeApp === "driver" && current.topic === "signs");
  els.feedback.hidden = true;
  els.questionNumber.textContent = activeEntry.label;
  els.questionEn.textContent = current.question.en;
  els.questionAm.textContent = current.question.am;
  setVisual(current);

  els.answers.innerHTML = "";
  if (activeApp === "english") {
    renderPhrasePractice(activeEntry);
    if (!activeEntry.reviewOnly) {
      const button = document.createElement("button");
      button.className = "answer practice-done";
      button.type = "button";
      button.textContent = activeEntry.selectedIndex === null ? "I practiced this" : "Practiced";
      button.disabled = activeEntry.selectedIndex !== null;
      button.addEventListener("click", practiceEnglishPhrase);
      els.answers.appendChild(button);
    }
    updateNavButtons();
    return;
  }

  current.answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.className = "answer";
    button.type = "button";
    button.innerHTML = `<strong>${escapeHtml(answer.en)}</strong><span lang="am">${escapeHtml(answer.am)}</span>`;
    if (activeEntry.reviewOnly) {
      button.disabled = true;
    }
    button.addEventListener("click", () => chooseAnswer(index));
    els.answers.appendChild(button);
  });

  applyAnswerState(activeEntry.reviewOnly ? current.correctIndex : activeEntry.selectedIndex);
  if (activeEntry.reviewOnly) {
    renderReviewFeedback();
  } else if (activeEntry.selectedIndex !== null) {
    renderFeedback(activeEntry.selectedIndex);
  }
  updateNavButtons();
}

function chooseAnswer(index) {
  if (answeredCurrent) return;
  answeredCurrent = true;
  answered += 1;
  const isCorrect = index === current.correctIndex;
  if (isCorrect) {
    score += 1;
    streak += 1;
    missed = missed.filter((item) => item !== current.id && item !== current.question.en);
  } else {
    streak = 0;
    if (!missed.includes(current.id)) missed.push(current.id);
  }
  if (!completedQuestionIds.includes(current.id)) {
    completedQuestionIds.push(current.id);
  }
  const entry = currentHistoryEntry();
  if (entry) entry.selectedIndex = index;
  saveProgress();
  updateStats();
  applyAnswerState(index);
  renderFeedback(index);
  updateNavButtons();
}

function updateStats() {
  els.score.textContent = score;
  els.answered.textContent = answered;
  els.streak.textContent = streak;
  els.bankTotal.textContent = questions.length;
  updateMissedPanel();
}

function renderMissedReview(question) {
  testQueue = null;
  resetQuestionHistory();
  els.mode.value = "missed";
  const entry = {
    question,
    label: "Missed review",
    selectedIndex: question.correctIndex,
    reviewOnly: true
  };
  questionHistory.push(entry);
  historyIndex = 0;
  renderQuestion(entry);
  els.questionCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateMissedPanel() {
  const items = missedQuestions();
  els.missedPanel.hidden = items.length === 0;
  els.missedCount.textContent = items.length;
  els.reviewBtn.textContent = items.length ? `Review missed (${items.length})` : "Review missed";
  els.missedList.innerHTML = "";

  items.forEach((question, index) => {
    const button = document.createElement("button");
    button.className = "missed-item";
    button.type = "button";
    button.innerHTML = `
      <strong>${index + 1}. ${escapeHtml(question.question.en)}</strong>
      <span lang="am">${escapeHtml(question.question.am)}</span>
    `;
    button.addEventListener("click", () => renderMissedReview(question));
    els.missedList.appendChild(button);
  });
}

function resetStats() {
  score = 0;
  answered = 0;
  streak = 0;
  missed = [];
  completedQuestionIds = [];
  testQueue = null;
  els.nextBtn.textContent = "Next question";
  if (els.mode.value === "missed") els.mode.value = "all";
  clearProgress();
  resetQuestionHistory();
  pool = shuffle([...filteredPool()]);
  updateStats();
  renderQuestion();
}

function renderTestComplete() {
  showingTestComplete = true;
  const passed = activeApp === "driver" ? score >= 15 : true;
  const missedCount = missedQuestions().length;
  els.questionCard?.classList?.remove("has-inline-sign");
  els.inlineSignVisual.hidden = true;
  els.inlineSignVisual.innerHTML = "";
  els.questionNumber.textContent = "Practice test complete";
  els.questionEn.textContent = activeApp === "driver"
    ? (passed ? "Passed practice target." : "Keep practicing, then try again.")
    : "English practice complete.";
  els.questionAm.textContent = activeApp === "driver"
    ? (passed ? "የልምምድ ግብን አልፈዋል።" : "ልምምድ ይቀጥሉ፣ ከዚያ እንደገና ይሞክሩ።")
    : "የእንግሊዝኛ ልምምድ ተጠናቋል።";
  els.answers.innerHTML = "";
  els.feedback.hidden = false;
  els.feedback.innerHTML = `
    <b>Your score: ${score}/20</b>
    ${activeApp === "driver" ? "DDS uses 15 correct out of 20 as the passing target for each Knowledge Exam part." : "Review the missed English questions below, then try again when ready."}
    ${missedCount ? `<p>${missedCount} missed question${missedCount === 1 ? "" : "s"} are saved below in Questions to review.</p>` : "<p>No missed questions saved right now.</p>"}
  `;
  els.nextBtn.textContent = "Next question";
  testQueue = null;
  updateMissedPanel();
  updateNavButtons();
}

els.backBtn.addEventListener("click", () => {
  if (showingTestComplete || showingDone) {
    historyIndex = questionHistory.length - 1;
    renderQuestion(currentHistoryEntry());
    return;
  }
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  renderQuestion(currentHistoryEntry());
});

els.nextBtn.addEventListener("click", () => {
  if (historyIndex < questionHistory.length - 1) {
    historyIndex += 1;
    renderQuestion(currentHistoryEntry());
    return;
  }
  if (testQueue && testQueue.length === 0) {
    renderTestComplete();
    return;
  }
  renderQuestion();
});

els.mode.addEventListener("change", () => {
  testQueue = null;
  resetQuestionHistory();
  pool = shuffle([...filteredPool()]);
  renderQuestion();
});

els.reviewBtn.addEventListener("click", () => {
  els.mode.value = "missed";
  testQueue = null;
  resetQuestionHistory();
  pool = shuffle([...filteredPool()]);
  renderQuestion();
});

els.resetBtn.addEventListener("click", resetStats);

els.clearMissedBtn.addEventListener("click", () => {
  missed = [];
  if (els.mode.value === "missed") {
    els.mode.value = "all";
    resetQuestionHistory();
    pool = shuffle([...filteredPool()]);
    renderQuestion();
  }
  saveProgress();
  updateStats();
});

els.driverAppBtn.addEventListener("click", () => switchPracticeApp("driver"));
els.englishAppBtn.addEventListener("click", () => switchPracticeApp("english"));

els.testBtn.addEventListener("click", () => {
  score = 0;
  answered = 0;
  streak = 0;
  completedQuestionIds = [];
  saveProgress();
  updateStats();
  testQueue = shuffle([...questions]).slice(0, 20);
  resetQuestionHistory();
  els.nextBtn.textContent = "Next question";
  renderQuestion();
});

els.speakBtn.addEventListener("click", () => {
  if (!("speechSynthesis" in window) || !current) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(current.question.en);
  utterance.lang = "en-US";
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
});

async function loadQuestions() {
  try {
    const [response, englishResponse, assetResponse] = await Promise.all([
      fetch("./questions.json?v=assets1"),
      fetch("./english-questions.json?v=apps1"),
      fetch("./assets/signs/sources.json?v=assets1")
    ]);
    if (!response.ok) throw new Error(`Unable to load questions: ${response.status}`);
    if (!englishResponse.ok) throw new Error(`Unable to load English questions: ${englishResponse.status}`);
    if (!assetResponse.ok) throw new Error(`Unable to load sign assets: ${assetResponse.status}`);
    signAssets = await assetResponse.json();
    driverQuestions = await response.json();
    englishQuestions = await englishResponse.json();
    questions = activeApp === "english" ? englishQuestions : driverQuestions;
    applyProgress(loadProgress());
    renderAppShell();
    pool = shuffle([...filteredPool()]);
    updateStats();
    renderQuestion();
  } catch (error) {
    els.questionNumber.textContent = "Could not load questions";
    els.questionEn.textContent = "Please check questions.json.";
    els.questionAm.textContent = "questions.json እባክዎ ይመልከቱ።";
    els.answers.innerHTML = "";
    els.feedback.hidden = false;
    els.feedback.innerHTML = `<b>Loading error</b>${escapeHtml(error.message)}`;
  }
}

loadQuestions();
