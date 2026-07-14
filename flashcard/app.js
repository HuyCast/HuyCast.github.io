const PDF_URL = "pdf/toeic-600.pdf";
const STORE_KEY = "toeicClassic.v1";
const DAY = 86400000;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  words: [],
  filtered: [],
  index: 0,
  view: "home",
  flipped: false,
  voices: [],
  quiz: null,
  timer: null,
  startedAt: Date.now(),
  data: {
    cards: {},
    settings: { theme: "light", accent: "en-US", voice: "", rate: 1, pitch: 1 },
    sessions: {},
    quizHistory: []
  }
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindElements();
  loadStore();
  applyTheme();
  bindEvents();
  setupSpeech();
  await loadPdf(PDF_URL);
  window.addEventListener("beforeunload", recordStudyTime);
}

function bindElements() {
  [
    "libraryStatus", "viewTitle", "themeToggle", "totalWords", "learnedWords", "dueWords",
    "streakDays", "memoryRate", "globalProgress", "topicGrid", "homeTopicSelect",
    "searchInput", "topicFilter", "posFilter", "statusFilter", "modeFilter", "flashcard",
    "favoriteBtn", "cardTopic", "cardWord", "cardPos", "cardIpa", "speakBtn",
    "cardMeaning", "cardExample", "cardExampleVi", "cardNote", "cardCounter",
    "prevCard", "nextCard", "todayTitle", "todayText", "quizType", "quizTimer",
    "quizPrompt", "quizOptions", "quizTextAnswer", "startQuiz", "submitQuiz",
    "listenQuiz", "quizScore", "quizCount", "quizFeedback", "totalViews",
    "totalCorrect", "totalWrong", "studyTime", "progressChart", "quizHistory",
    "historyCount", "pdfUpload", "voiceSelect", "accentSelect", "rateInput",
    "pitchInput", "rateValue", "pitchValue", "resetProgress", "toast"
  ].forEach(id => els[id] = document.getElementById(id));
}

function bindEvents() {
  $$(".nav-item").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));
  els.themeToggle.addEventListener("click", toggleTheme);
  els.searchInput.addEventListener("input", debounce(applyFilters, 180));
  [els.topicFilter, els.posFilter, els.statusFilter, els.modeFilter].forEach(el => el.addEventListener("change", applyFilters));
  els.homeTopicSelect.addEventListener("change", () => {
    els.topicFilter.value = els.homeTopicSelect.value;
    switchView("cards");
    applyFilters();
  });
  els.flashcard.addEventListener("click", e => {
    if (!e.target.closest("button")) flipCard();
  });
  els.flashcard.addEventListener("keydown", e => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      flipCard();
    }
  });
  bindSwipe();
  els.prevCard.addEventListener("click", () => moveCard(-1));
  els.nextCard.addEventListener("click", () => moveCard(1));
  els.speakBtn.addEventListener("click", e => {
    e.stopPropagation();
    speak(currentWord()?.word);
  });
  els.favoriteBtn.addEventListener("click", e => {
    e.stopPropagation();
    toggleFavorite();
  });
  $$(".srs-actions button").forEach(btn => btn.addEventListener("click", () => gradeCard(btn.dataset.grade)));
  $$("[data-action='start-due']").forEach(btn => btn.addEventListener("click", () => {
    els.statusFilter.value = "due";
    switchView("cards");
    applyFilters();
  }));
  els.startQuiz.addEventListener("click", startQuiz);
  els.submitQuiz.addEventListener("click", submitQuiz);
  els.listenQuiz.addEventListener("click", () => state.quiz?.current && speak(state.quiz.current.word));
  els.quizTextAnswer.addEventListener("keydown", e => {
    if (e.key === "Enter") submitQuiz();
  });
  els.pdfUpload.addEventListener("change", handlePdfUpload);
  els.voiceSelect.addEventListener("change", updateSettings);
  els.accentSelect.addEventListener("change", updateSettings);
  els.rateInput.addEventListener("input", updateSettings);
  els.pitchInput.addEventListener("input", updateSettings);
  els.resetProgress.addEventListener("click", resetProgress);
}

async function loadPdf(source) {
  try {
    els.libraryStatus.textContent = "Đang tải PDF offline...";
    const pdfjs = await import("./assets/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "./assets/pdf.worker.min.mjs";
    const loadingTask = typeof source === "string"
      ? pdfjs.getDocument(source)
      : pdfjs.getDocument({ data: source });
    const pdf = await loadingTask.promise;
    const pageLines = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      pageLines.push(...itemsToLines(content.items));
    }
    state.words = parseVocabulary(pageLines);
    window.__toeicDebug = { lineCount: pageLines.length, sample: pageLines.slice(0, 180), parsed: state.words.slice(0, 10) };
    if (state.words.length < 100) throw new Error("Không nhận diện đủ từ vựng từ PDF.");
    bootstrapLibrary();
    toast(`Đã đọc ${state.words.length} từ từ PDF.`);
  } catch (error) {
    console.error(error);
    els.libraryStatus.textContent = "Chưa đọc được PDF. Hãy chọn file trong Settings.";
    toast("Không đọc được PDF mặc định. Bạn có thể upload lại trong Settings.");
  }
}

function itemsToLines(items) {
  const rows = [];
  items
    .filter(item => item.str && item.str.trim())
    .map(item => ({
      text: item.str.trim(),
      x: item.transform[4],
      y: Math.round(item.transform[5])
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .forEach(item => {
      let row = rows.find(r => Math.abs(r.y - item.y) <= 2);
      if (!row) {
        row = { y: item.y, items: [] };
        rows.push(row);
      }
      row.items.push(item);
    });
  return rows.map(row => row.items.sort((a, b) => a.x - b.x).map(item => item.text).join(" ").replace(/\s+/g, " ").trim());
}

function parseVocabulary(lines) {
  const words = [];
  let topic = null;
  let pendingMeaning = [];
  let inVocabulary = false;
  const topicRegex = /^Topic\s+(\d+)\.?\s*(.+)$/i;
  const wordRegex = /^(.+?)\s+\((n|v|adj|adv)\)\s+(\/.+?\/)\s*(.*)$/i;
  const stopRegex = /^(Cách ghi nhớ|Bài tập|Đáp Án|Phần \d)/i;

  for (const rawLine of lines) {
    let line = cleanLine(rawLine);
    if (!line || /^\d+$/.test(line)) continue;
    if (stopRegex.test(line) && words.length > 0) break;
    const topicMatch = line.match(topicRegex);
    if (topicMatch) {
      topic = { number: Number(topicMatch[1]), name: topicMatch[2].replace(/\.+\s*\d*$/, "").trim() };
      pendingMeaning = [];
      inVocabulary = true;
      continue;
    }
    if (!inVocabulary || /^(Từ vựng|Phát âm|Nghĩa từ|Mở đầu|Danh sách|Chú thích)/i.test(line)) continue;
    const match = line.match(wordRegex);
    if (match && topic) {
      const word = match[1].trim().replace(/\s+/g, " ");
      const pos = match[2].toLowerCase();
      const ipa = match[3].trim();
      const meaning = [...pendingMeaning, match[4]].join(" ").replace(/\s+/g, " ").trim();
      pendingMeaning = [];
      if (isValidWord(word, meaning)) {
        words.push(makeWord(words.length + 1, topic, word, pos, ipa, meaning));
      }
      continue;
    }
    if (topic && looksLikeMeaning(line)) {
      pendingMeaning.push(line);
      if (pendingMeaning.length > 3) pendingMeaning.shift();
    }
  }
  return dedupeWords(words);
}

function cleanLine(line) {
  return line
    .replace(/[•●]/g, "")
    .replace(/\s+/g, " ")
    .replace(/Topic\s+(\d+)\s*\.\s*/i, "Topic $1. ")
    .trim();
}

function looksLikeMeaning(line) {
  return !/[()/]/.test(line) && line.length > 2 && !/^Topic/i.test(line);
}

function isValidWord(word, meaning) {
  return /^[A-Za-z][A-Za-z\s'-]*$/.test(word) && meaning.length > 1 && !/\.\.+/.test(word);
}

function makeWord(index, topic, word, pos, ipa, meaning) {
  const cleanMeaning = meaning || "Đang cập nhật nghĩa từ PDF";
  return {
    id: `${topic.number}-${word.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${pos}`,
    index,
    topicNumber: topic.number,
    topic: topic.name,
    word,
    pos,
    ipa,
    meaning: cleanMeaning,
    example: createExample(word, pos),
    exampleVi: createExampleVi(word, cleanMeaning),
    note: `Topic ${topic.number}: ${topic.name}`
  };
}

function createExample(word, pos) {
  const templates = {
    n: `The ${word} is important in daily business communication.`,
    v: `The team will ${word} the task before the deadline.`,
    adj: `This is a ${word} choice for the project.`,
    adv: `The manager handled the request ${word}.`
  };
  return templates[pos] || `I need to remember the word ${word}.`;
}

function createExampleVi(word, meaning) {
  return `Ví dụ minh họa cách dùng "${word}" với nghĩa: ${meaning}.`;
}

function dedupeWords(words) {
  const seen = new Set();
  return words.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function bootstrapLibrary() {
  state.words.forEach(word => ensureCard(word.id));
  state.filtered = [...state.words];
  populateFilters();
  applyFilters();
  renderAll();
  els.libraryStatus.textContent = `${state.words.length} từ - ${new Set(state.words.map(w => w.topic)).size} chủ đề`;
}

function ensureCard(id) {
  if (!state.data.cards[id]) {
    state.data.cards[id] = {
      viewed: 0,
      correct: 0,
      wrong: 0,
      favorite: false,
      learned: false,
      interval: 0,
      ease: 2.5,
      due: Date.now(),
      lastSeen: 0
    };
  }
  return state.data.cards[id];
}

function populateFilters() {
  const topics = [...new Map(state.words.map(w => [w.topicNumber, w])).values()].sort((a, b) => a.topicNumber - b.topicNumber);
  const topicOptions = [`<option value="all">Tất cả chủ đề</option>`]
    .concat(topics.map(w => `<option value="${escapeHtml(w.topic)}">Topic ${w.topicNumber}. ${escapeHtml(w.topic)}</option>`))
    .join("");
  els.topicFilter.innerHTML = topicOptions;
  els.homeTopicSelect.innerHTML = topicOptions;
  const parts = [...new Set(state.words.map(w => w.pos))].sort();
  els.posFilter.innerHTML = `<option value="all">Tất cả loại từ</option>${parts.map(pos => `<option value="${pos}">${posLabel(pos)}</option>`).join("")}`;
}

function applyFilters() {
  const query = els.searchInput.value.trim().toLowerCase();
  const topic = els.topicFilter.value;
  const pos = els.posFilter.value;
  const status = els.statusFilter.value;
  const now = Date.now();
  state.filtered = state.words.filter(word => {
    const card = ensureCard(word.id);
    const haystack = `${word.word} ${word.meaning} ${word.ipa} ${word.topic}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (topic !== "all" && word.topic !== topic) return false;
    if (pos !== "all" && word.pos !== pos) return false;
    if (status === "new" && card.viewed > 0) return false;
    if (status === "learning" && (!card.viewed || card.learned)) return false;
    if (status === "known" && !card.learned) return false;
    if (status === "due" && card.due > now) return false;
    if (status === "favorite" && !card.favorite) return false;
    return true;
  });
  if (els.modeFilter.value === "random") shuffle(state.filtered);
  if (els.modeFilter.value === "hard") {
    state.filtered.sort((a, b) => difficultyScore(ensureCard(b.id)) - difficultyScore(ensureCard(a.id)));
  }
  state.index = Math.min(state.index, Math.max(0, state.filtered.length - 1));
  renderCard();
  renderDashboard();
}

function difficultyScore(card) {
  return (card.wrong * 2 + Math.max(0, 3 - card.interval)) - card.correct;
}

function switchView(view) {
  state.view = view;
  $$(".view").forEach(section => section.classList.toggle("active", section.id === `${view}View`));
  $$(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
  const titles = { home: "Dashboard", cards: "Flashcards", quiz: "Quiz", stats: "Thống kê", settings: "Cài đặt" };
  els.viewTitle.textContent = titles[view] || "Dashboard";
  if (view === "stats") renderStats();
}

function renderAll() {
  renderDashboard();
  renderCard();
  renderStats();
  renderSettings();
}

function renderDashboard() {
  const total = state.words.length;
  const cards = state.words.map(w => ensureCard(w.id));
  const learned = cards.filter(c => c.learned).length;
  const due = cards.filter(c => c.due <= Date.now()).length;
  const correct = cards.reduce((sum, c) => sum + c.correct, 0);
  const wrong = cards.reduce((sum, c) => sum + c.wrong, 0);
  const memory = correct + wrong ? Math.round(correct / (correct + wrong) * 100) : 0;
  els.totalWords.textContent = total;
  els.learnedWords.textContent = learned;
  els.dueWords.textContent = due;
  els.streakDays.textContent = getStreak();
  els.memoryRate.textContent = `${memory}% nhớ`;
  els.globalProgress.style.width = total ? `${learned / total * 100}%` : "0%";
  els.todayTitle.textContent = due ? `${due} từ cần ôn` : "Học thêm từ mới";
  els.todayText.textContent = due
    ? "SRS đã xếp lịch các từ đến hạn. Hãy ôn ngắn, đều, và đánh giá thật tay."
    : "Bạn đã xử lý xong phần đến hạn. Chọn một chủ đề hoặc random để mở rộng vốn từ.";
  renderTopics();
}

function renderTopics() {
  const grouped = groupBy(state.words, "topic");
  els.topicGrid.innerHTML = Object.entries(grouped).map(([topic, words]) => {
    const learned = words.filter(word => ensureCard(word.id).learned).length;
    const number = words[0].topicNumber;
    return `<button class="topic-card" data-topic="${escapeHtml(topic)}">
      <strong>Topic ${number}. ${escapeHtml(topic)}</strong>
      <span>${learned}/${words.length} từ đã thuộc</span>
    </button>`;
  }).join("");
  $$(".topic-card", els.topicGrid).forEach(card => card.addEventListener("click", () => {
    els.topicFilter.value = card.dataset.topic;
    switchView("cards");
    applyFilters();
  }));
}

function renderCard() {
  const word = currentWord();
  els.flashcard.classList.toggle("flipped", state.flipped);
  if (!word) {
    els.cardTopic.textContent = "Không có thẻ";
    els.cardWord.textContent = "No cards";
    els.cardPos.textContent = "";
    els.cardIpa.textContent = "";
    els.cardMeaning.textContent = "Hãy đổi bộ lọc hoặc upload PDF.";
    els.cardExample.textContent = "";
    els.cardExampleVi.textContent = "";
    els.cardNote.textContent = "";
    els.cardCounter.textContent = "0 / 0";
    return;
  }
  const card = ensureCard(word.id);
  els.cardTopic.textContent = `Topic ${word.topicNumber}. ${word.topic}`;
  els.cardWord.textContent = word.word;
  els.cardPos.textContent = posLabel(word.pos);
  els.cardIpa.textContent = word.ipa;
  els.cardMeaning.textContent = word.meaning;
  els.cardExample.textContent = word.example;
  els.cardExampleVi.textContent = word.exampleVi;
  els.cardNote.textContent = `${word.note} - đã xem ${card.viewed} lần`;
  els.cardCounter.textContent = `${state.index + 1} / ${state.filtered.length}`;
  els.favoriteBtn.textContent = card.favorite ? "★" : "☆";
}

function currentWord() {
  return state.filtered[state.index] || null;
}

function flipCard(force) {
  state.flipped = typeof force === "boolean" ? force : !state.flipped;
  els.flashcard.classList.toggle("flipped", state.flipped);
}

function moveCard(step) {
  if (!state.filtered.length) return;
  state.index = (state.index + step + state.filtered.length) % state.filtered.length;
  state.flipped = false;
  markViewed(currentWord());
  renderCard();
}

function markViewed(word) {
  if (!word) return;
  const card = ensureCard(word.id);
  card.viewed += 1;
  card.lastSeen = Date.now();
  touchToday("viewed", 1);
  saveStore();
}

function toggleFavorite() {
  const word = currentWord();
  if (!word) return;
  const card = ensureCard(word.id);
  card.favorite = !card.favorite;
  saveStore();
  renderCard();
}

function gradeCard(grade) {
  const word = currentWord();
  if (!word) return;
  const card = ensureCard(word.id);
  const now = Date.now();
  const quality = { again: 1, hard: 3, good: 4, easy: 5 }[grade];
  card.viewed += 1;
  card.lastSeen = now;
  if (quality < 3) {
    card.wrong += 1;
    card.interval = 0;
    card.ease = Math.max(1.3, card.ease - 0.2);
    card.due = now + 10 * 60 * 1000;
    card.learned = false;
  } else {
    card.correct += 1;
    card.ease = Math.max(1.3, card.ease + (quality === 5 ? 0.15 : quality === 3 ? -0.08 : 0));
    card.interval = card.interval ? Math.ceil(card.interval * card.ease) : (quality === 5 ? 4 : quality === 3 ? 1 : 2);
    card.due = now + card.interval * DAY;
    card.learned = card.correct >= 2 && card.correct >= card.wrong;
  }
  touchToday("reviewed", 1);
  saveStore();
  renderDashboard();
  moveCard(1);
}

function bindSwipe() {
  let startX = 0;
  let startY = 0;
  els.flashcard.addEventListener("pointerdown", e => {
    startX = e.clientX;
    startY = e.clientY;
  });
  els.flashcard.addEventListener("pointerup", e => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 54 && Math.abs(dx) > Math.abs(dy)) moveCard(dx < 0 ? 1 : -1);
  });
}

function startQuiz() {
  if (state.words.length < 4) return toast("Cần đọc xong PDF trước khi quiz.");
  clearInterval(state.timer);
  state.quiz = {
    score: 0,
    count: 0,
    total: 10,
    start: Date.now(),
    answered: false,
    current: null,
    answer: "",
    type: ""
  };
  state.timer = setInterval(renderQuizTimer, 1000);
  nextQuizQuestion();
}

function nextQuizQuestion() {
  const quiz = state.quiz;
  if (!quiz) return;
  if (quiz.count >= quiz.total) return finishQuiz();
  quiz.count += 1;
  quiz.answered = false;
  quiz.current = pickQuizWord();
  quiz.type = ["meaning", "word", "fill", "listen", "match"][Math.floor(Math.random() * 5)];
  renderQuizQuestion();
}

function pickQuizWord() {
  const due = state.words.filter(w => ensureCard(w.id).due <= Date.now());
  const pool = due.length >= 4 ? due : state.words;
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderQuizQuestion() {
  const { current, type } = state.quiz;
  els.quizFeedback.textContent = "";
  els.quizScore.textContent = state.quiz.score;
  els.quizCount.textContent = `${state.quiz.count} / ${state.quiz.total}`;
  els.quizOptions.innerHTML = "";
  els.quizTextAnswer.classList.toggle("hidden", type !== "fill");
  els.submitQuiz.classList.toggle("hidden", type !== "fill");
  els.listenQuiz.classList.toggle("hidden", type !== "listen");
  const types = {
    meaning: ["Chọn nghĩa", `Nghĩa đúng của "${current.word}" là gì?`, current.meaning, w => w.meaning],
    word: ["Chọn từ", `Từ nào phù hợp với nghĩa: ${current.meaning}`, current.word, w => w.word],
    listen: ["Nghe và chọn", "Nghe phát âm rồi chọn từ đúng.", current.word, w => w.word],
    match: ["Ghép từ với nghĩa", `Ghép "${current.word}" với nghĩa đúng.`, current.meaning, w => w.meaning]
  };
  if (type === "fill") {
    els.quizType.textContent = "Điền từ";
    els.quizPrompt.textContent = `Điền từ có nghĩa: ${current.meaning}`;
    els.quizTextAnswer.value = "";
    els.quizTextAnswer.focus();
    state.quiz.answer = current.word;
    return;
  }
  const [label, prompt, answer, mapper] = types[type];
  els.quizType.textContent = label;
  els.quizPrompt.textContent = prompt;
  state.quiz.answer = answer;
  makeOptions(current, mapper).forEach(option => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.addEventListener("click", () => submitQuiz(option, btn));
    els.quizOptions.appendChild(btn);
  });
  if (type === "listen") setTimeout(() => speak(current.word), 250);
}

function makeOptions(current, mapper) {
  const set = new Set([mapper(current)]);
  while (set.size < 4) {
    set.add(mapper(state.words[Math.floor(Math.random() * state.words.length)]));
  }
  return shuffle([...set]);
}

function submitQuiz(value, button) {
  const quiz = state.quiz;
  if (!quiz || quiz.answered) return;
  const answer = quiz.type === "fill" ? els.quizTextAnswer.value.trim() : value;
  if (!answer) return;
  const correct = normalizeAnswer(answer) === normalizeAnswer(quiz.answer);
  quiz.answered = true;
  if (correct) quiz.score += 10;
  const card = ensureCard(quiz.current.id);
  correct ? card.correct += 1 : card.wrong += 1;
  touchToday(correct ? "correct" : "wrong", 1);
  if (button) {
    button.classList.add(correct ? "correct" : "wrong");
    $$("#quizOptions button").forEach(btn => {
      if (normalizeAnswer(btn.textContent) === normalizeAnswer(quiz.answer)) btn.classList.add("correct");
    });
  }
  els.quizFeedback.textContent = correct ? "Chính xác." : `Đáp án: ${quiz.answer}`;
  els.quizScore.textContent = quiz.score;
  saveStore();
  setTimeout(nextQuizQuestion, 900);
}

function finishQuiz() {
  clearInterval(state.timer);
  const elapsed = Date.now() - state.quiz.start;
  state.data.quizHistory.unshift({
    date: new Date().toISOString(),
    score: state.quiz.score,
    total: state.quiz.total * 10,
    seconds: Math.round(elapsed / 1000)
  });
  state.data.quizHistory = state.data.quizHistory.slice(0, 20);
  saveStore();
  els.quizPrompt.textContent = `Hoàn thành: ${state.quiz.score}/${state.quiz.total * 10}`;
  els.quizOptions.innerHTML = "";
  els.quizTextAnswer.classList.add("hidden");
  els.submitQuiz.classList.add("hidden");
  els.listenQuiz.classList.add("hidden");
  renderStats();
}

function renderQuizTimer() {
  if (!state.quiz) return;
  els.quizTimer.textContent = formatClock(Math.round((Date.now() - state.quiz.start) / 1000));
}

function renderStats() {
  const cards = state.words.map(w => ensureCard(w.id));
  els.totalViews.textContent = cards.reduce((s, c) => s + c.viewed, 0);
  els.totalCorrect.textContent = cards.reduce((s, c) => s + c.correct, 0);
  els.totalWrong.textContent = cards.reduce((s, c) => s + c.wrong, 0);
  const minutes = Math.round(Object.values(state.data.sessions).reduce((s, d) => s + (d.seconds || 0), 0) / 60);
  els.studyTime.textContent = `${minutes}m`;
  renderChart();
  renderHistory();
}

function renderChart() {
  const canvas = els.progressChart;
  const ctx = canvas.getContext("2d");
  const labels = lastDays(7);
  const values = labels.map(day => state.data.sessions[day]?.reviewed || 0);
  const max = Math.max(1, ...values);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = getCss("--line");
  ctx.fillStyle = getCss("--muted");
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = 36 + i * 52;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(canvas.width - 24, y);
    ctx.stroke();
  }
  const barWidth = (canvas.width - 90) / labels.length;
  values.forEach((value, i) => {
    const h = (value / max) * 210;
    const x = 52 + i * barWidth;
    const y = 266 - h;
    ctx.fillStyle = getCss("--accent");
    roundRect(ctx, x, y, Math.max(24, barWidth - 18), h, 7);
    ctx.fill();
    ctx.fillStyle = getCss("--muted");
    ctx.fillText(labels[i].slice(5), x, 296);
    ctx.fillText(value, x + 4, y - 8);
  });
}

function renderHistory() {
  els.historyCount.textContent = `${state.data.quizHistory.length} lượt`;
  els.quizHistory.innerHTML = state.data.quizHistory.length
    ? state.data.quizHistory.map(item => `<div class="history-row"><span>${new Date(item.date).toLocaleString("vi-VN")}</span><strong>${item.score}/${item.total} - ${formatClock(item.seconds)}</strong></div>`).join("")
    : `<p class="note">Chưa có lịch sử quiz.</p>`;
}

function renderSettings() {
  els.accentSelect.value = state.data.settings.accent;
  els.rateInput.value = state.data.settings.rate;
  els.pitchInput.value = state.data.settings.pitch;
  els.rateValue.textContent = Number(els.rateInput.value).toFixed(2);
  els.pitchValue.textContent = Number(els.pitchInput.value).toFixed(2);
}

function setupSpeech() {
  if (!("speechSynthesis" in window)) return;
  const loadVoices = () => {
    state.voices = speechSynthesis.getVoices();
    const preferredLang = state.data.settings.accent;
    const options = state.voices
      .filter(v => v.lang?.startsWith("en"))
      .map(v => `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)} - ${v.lang}</option>`)
      .join("");
    els.voiceSelect.innerHTML = `<option value="">Tự chọn theo accent</option>${options}`;
    els.voiceSelect.value = state.data.settings.voice;
    if (!state.data.settings.voice) {
      const voice = state.voices.find(v => v.lang === preferredLang);
      if (voice) els.voiceSelect.value = "";
    }
  };
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {
  if (!text || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const settings = state.data.settings;
  utterance.lang = settings.accent;
  utterance.rate = Number(settings.rate);
  utterance.pitch = Number(settings.pitch);
  utterance.voice = state.voices.find(v => v.name === settings.voice) || state.voices.find(v => v.lang === settings.accent) || null;
  speechSynthesis.speak(utterance);
}

function updateSettings() {
  state.data.settings.voice = els.voiceSelect.value;
  state.data.settings.accent = els.accentSelect.value;
  state.data.settings.rate = Number(els.rateInput.value);
  state.data.settings.pitch = Number(els.pitchInput.value);
  els.rateValue.textContent = state.data.settings.rate.toFixed(2);
  els.pitchValue.textContent = state.data.settings.pitch.toFixed(2);
  saveStore();
}

async function handlePdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  await loadPdf(buffer);
}

function resetProgress() {
  if (!confirm("Xóa toàn bộ tiến trình học và lịch sử quiz?")) return;
  state.data.cards = {};
  state.data.sessions = {};
  state.data.quizHistory = [];
  state.words.forEach(word => ensureCard(word.id));
  saveStore();
  renderAll();
  toast("Đã xóa tiến trình.");
}

function toggleTheme() {
  state.data.settings.theme = state.data.settings.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveStore();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.data.settings.theme;
}

function loadStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) state.data = { ...state.data, ...saved, settings: { ...state.data.settings, ...saved.settings } };
  } catch {
    localStorage.removeItem(STORE_KEY);
  }
}

function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state.data));
}

function recordStudyTime() {
  const seconds = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
  touchToday("seconds", seconds);
  saveStore();
}

function touchToday(key, amount) {
  const today = isoDay();
  state.data.sessions[today] ||= { viewed: 0, reviewed: 0, correct: 0, wrong: 0, seconds: 0 };
  state.data.sessions[today][key] = (state.data.sessions[today][key] || 0) + amount;
}

function getStreak() {
  let streak = 0;
  const sessions = state.data.sessions;
  for (let offset = 0; offset < 365; offset += 1) {
    const day = isoDay(Date.now() - offset * DAY);
    if (sessions[day] && ((sessions[day].viewed || 0) + (sessions[day].reviewed || 0) > 0)) streak += 1;
    else if (offset > 0) break;
  }
  return streak;
}

function lastDays(count) {
  return Array.from({ length: count }, (_, i) => isoDay(Date.now() - (count - i - 1) * DAY));
}

function isoDay(time = Date.now()) {
  return new Date(time).toISOString().slice(0, 10);
}

function posLabel(pos) {
  return { n: "noun", v: "verb", adj: "adjective", adv: "adverb" }[pos] || pos;
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const value = item[key];
    groups[value] ||= [];
    groups[value].push(item);
    return groups;
  }, {});
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function normalizeAnswer(value) {
  return value.toLowerCase().replace(/[^a-z0-9\u00C0-\u1EF9]+/gi, " ").trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function formatClock(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getCss(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}
