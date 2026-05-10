let questions = [];
const els = {
  mode: document.querySelector("#mode"),
  score: document.querySelector("#score"),
  answered: document.querySelector("#answered"),
  streak: document.querySelector("#streak"),
  bankTotal: document.querySelector("#bankTotal"),
  questionNumber: document.querySelector("#questionNumber"),
  questionEn: document.querySelector("#questionEn"),
  questionAm: document.querySelector("#questionAm"),
  answers: document.querySelector("#answers"),
  feedback: document.querySelector("#feedback"),
  nextBtn: document.querySelector("#nextBtn"),
  reviewBtn: document.querySelector("#reviewBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  testBtn: document.querySelector("#testBtn"),
  speakBtn: document.querySelector("#speakBtn"),
  signVisual: document.querySelector("#signVisual"),
  topicTitle: document.querySelector("#topicTitle"),
  topicHelp: document.querySelector("#topicHelp")
};

let pool = shuffle([...questions]);
let current = null;
let answeredCurrent = false;
let score = 0;
let answered = 0;
let streak = 0;
let missed = JSON.parse(localStorage.getItem("gaDriverMissed") || "[]");
let testQueue = null;

function shuffle(items) {
  return items
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function filteredPool() {
  const mode = els.mode.value;
  if (mode === "missed") {
    return questions.filter((q) => missed.includes(q.id) || missed.includes(q.question.en));
  }
  if (mode === "all") return questions;
  return questions.filter((q) => q.topic === mode);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setVisual(question) {
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
  els.signVisual.className = `sign-visual sign-${question.visual || "rule"}`;
  if (question.visual === "school") {
    els.signVisual.innerHTML = `
      <svg class="school-icon" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="44" cy="30" r="9"></circle>
        <circle cx="74" cy="25" r="11"></circle>
        <path d="M38 46 L50 46 L58 75 L49 75 L45 100 L35 100 L40 75 L30 75 Z"></path>
        <path d="M66 42 L82 42 L91 78 L80 78 L76 104 L64 104 L69 78 L58 78 Z"></path>
        <path d="M50 51 L68 60"></path>
        <path d="M36 50 L22 66"></path>
        <path d="M82 46 L102 60"></path>
      </svg>
    `;
  } else {
    els.signVisual.innerHTML = ["diamond", "orange", "crossbuck", "slow"].includes(question.visual)
    ? `<span>${labels[question.visual]}</span>`
    : labels[question.visual || "rule"];
  }
  const topicNames = {
    signs: "Road signs",
    rules: "Road rules",
    safety: "Safe driving",
    ga: "Georgia law"
  };
  els.topicTitle.textContent = topicNames[question.topic] || "Practice";
  els.topicHelp.textContent = question.topic === "signs"
    ? "Road signs are tested in English, so learn the English words and the meaning."
    : "Read both languages, then answer from the meaning, not just memorized words.";
}

function renderQuestion() {
  const available = testQueue || filteredPool();
  if (!available.length) {
    els.questionNumber.textContent = "No questions";
    els.questionEn.textContent = "No missed questions yet.";
    els.questionAm.textContent = "እስካሁን የተሳሳቱ ጥያቄዎች የሉም።";
    els.answers.innerHTML = "";
    els.feedback.hidden = true;
    els.nextBtn.disabled = true;
    return;
  }

  if (!testQueue && pool.length === 0) pool = shuffle([...available]);
  current = testQueue ? testQueue.shift() : pool.find((q) => available.includes(q)) || shuffle([...available])[0];
  if (!testQueue) pool = pool.filter((q) => q !== current);
  answeredCurrent = false;
  els.nextBtn.disabled = true;
  els.feedback.hidden = true;
  els.questionNumber.textContent = testQueue ? `Practice test: ${20 - testQueue.length} of 20` : `Question ${answered + 1}`;
  els.questionEn.textContent = current.question.en;
  els.questionAm.textContent = current.question.am;
  setVisual(current);

  els.answers.innerHTML = "";
  current.answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.className = "answer";
    button.type = "button";
    button.innerHTML = `<strong>${escapeHtml(answer.en)}</strong><span lang="am">${escapeHtml(answer.am)}</span>`;
    button.addEventListener("click", () => chooseAnswer(index));
    els.answers.appendChild(button);
  });
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
  localStorage.setItem("gaDriverMissed", JSON.stringify(missed));
  updateStats();

  [...els.answers.children].forEach((button, buttonIndex) => {
    if (buttonIndex === current.correctIndex) button.classList.add("correct");
    if (buttonIndex === index && !isCorrect) button.classList.add("wrong");
  });

  els.feedback.hidden = false;
  const correct = current.answers[current.correctIndex];
  const selected = current.answers[index];
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
      <p>This does not match the Georgia driving rule for this situation.</p>
    </div>
  `;
  els.feedback.innerHTML = isCorrect
    ? `<b>Correct. ትክክል ነው።</b>${correctAnswer}${reason}`
    : `<b>Not this one. ይህ አይደለም።</b>${wrongChoice}${correctAnswer}${reason}`;
  els.nextBtn.disabled = false;

  if (testQueue && testQueue.length === 0) {
    els.nextBtn.textContent = "Finish test";
  }
}

function updateStats() {
  els.score.textContent = score;
  els.answered.textContent = answered;
  els.streak.textContent = streak;
  els.bankTotal.textContent = questions.length;
}

function resetStats() {
  score = 0;
  answered = 0;
  streak = 0;
  testQueue = null;
  els.nextBtn.textContent = "Next question";
  pool = shuffle([...filteredPool()]);
  updateStats();
  renderQuestion();
}

els.nextBtn.addEventListener("click", () => {
  if (testQueue && testQueue.length === 0) {
    const passed = score >= 15;
    els.questionNumber.textContent = "Practice test complete";
    els.questionEn.textContent = passed ? "Passed practice target." : "Keep practicing, then try again.";
    els.questionAm.textContent = passed ? "የልምምድ ግብን አልፈዋል።" : "ልምምድ ይቀጥሉ፣ ከዚያ እንደገና ይሞክሩ።";
    els.answers.innerHTML = "";
    els.feedback.hidden = false;
    els.feedback.innerHTML = `<b>Your score: ${score}/20</b>DDS uses 15 correct out of 20 as the passing target for each Knowledge Exam part.`;
    els.nextBtn.disabled = true;
    els.nextBtn.textContent = "Next question";
    testQueue = null;
    return;
  }
  renderQuestion();
});

els.mode.addEventListener("change", () => {
  testQueue = null;
  pool = shuffle([...filteredPool()]);
  renderQuestion();
});

els.reviewBtn.addEventListener("click", () => {
  els.mode.value = "missed";
  pool = shuffle([...filteredPool()]);
  renderQuestion();
});

els.resetBtn.addEventListener("click", resetStats);

els.testBtn.addEventListener("click", () => {
  score = 0;
  answered = 0;
  streak = 0;
  updateStats();
  testQueue = shuffle([...questions]).slice(0, 20);
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
    const response = await fetch("./questions.json?v=json1");
    if (!response.ok) throw new Error(`Unable to load questions: ${response.status}`);
    questions = await response.json();
    pool = shuffle([...questions]);
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
