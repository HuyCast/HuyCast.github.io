// ===== STATE MANAGEMENT =====
const state = {
    screen: 'home', // 'home', 'quiz', 'result'
    questionCount: null,
    questions: [],
    answers: {}, // { questionIndex: 'a'|'b'|'c'|'d' }
    timeRemaining: 60 * 60, // 60 minutes in seconds
    timerInterval: null,
    startTime: null,
    endTime: null,
    timerSettingMinutes: 60,
    isRandomized: true,
    isRandomizedOptions: true,
    customQuestions: null,
    theme: 'light',
    isTestActive: false,
    isCheat: false,
    flags: new Set(),
    personalBests: {}, // { [quizTitle: string]: { score: number, time: number } }
    currentQuizTitle: 'Unnamed Quiz',
    history: [], // [{ score: number, time: number, date: number, quizTitle: string }]
    quizLibrary: [] // [{ id: string, title: string, content: string, date: number }]
};

// ===== DOM ELEMENTS =====
const DOM = {
    screens: {
        home: document.getElementById('home-screen'),
        quiz: document.getElementById('quiz-screen'),
        result: document.getElementById('result-screen')
    },
    home: {
        pbDisplay: document.getElementById('pb-display'),
        pbScoreText: document.getElementById('pb-score-text'),
        pbTimeText: document.getElementById('pb-time-text'),
        startBtn: document.getElementById('start-btn'),
        timerMinus: document.getElementById('timer-minus'),
        timerPlus: document.getElementById('timer-plus'),
        timerSetting: document.getElementById('timer-setting'),
        randomizeToggle: document.getElementById('randomize-toggle'),
        randomizeOptionsToggle: document.getElementById('randomize-options-toggle'),
        importText: document.getElementById('import-text'),
        previewBtn: document.getElementById('preview-btn'),
        importStatus: document.getElementById('import-status'),
        quizTitleInput: document.getElementById('quiz-title-input'),
        saveQuizBtn: document.getElementById('save-quiz-btn'),
        savedQuizzesContainer: document.getElementById('saved-quizzes-container'),
        quizEditorSection: document.getElementById('quiz-editor-section'),
        quizEditorContainer: document.getElementById('quiz-editor-container'),
        closeEditorBtn: document.getElementById('close-editor-btn'),
        historySortSelect: document.getElementById('history-sort-select'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        historyTableBody: document.getElementById('history-table-body')
    },
    quiz: {
        timerDisplay: document.getElementById('timer-display'),
        progressText: document.getElementById('progress-text'),
        progressPercentage: document.getElementById('progress-percentage'),
        progressBar: document.getElementById('progress-bar'),
        questionsContainer: document.getElementById('questions-container'),
        submitBtn: document.getElementById('submit-early-btn'),
        reviewPanelBtn: document.getElementById('review-panel-btn'),
        reviewPanelOverlay: document.getElementById('review-panel-overlay'),
        reviewPanel: document.getElementById('review-panel'),
        closeReviewBtn: document.getElementById('close-review-btn'),
        reviewGrid: document.getElementById('review-grid'),
        reviewSubmitBtn: document.getElementById('review-submit-btn')
    },
    result: {
        scoreCircle: document.getElementById('score-circle'),
        scoreText: document.getElementById('score-text'),
        correctCount: document.getElementById('correct-count'),
        incorrectCount: document.getElementById('incorrect-count'),
        timeTaken: document.getElementById('time-taken'),
        avgTime: document.getElementById('avg-time'),
        scaledScore: document.getElementById('scaled-score'),
        newPbBadge: document.getElementById('new-pb-badge'),
        motivationalFeedback: document.getElementById('motivational-feedback'),
        reviewContainer: document.getElementById('review-container'),
        tryAgainBtn: document.getElementById('try-again-btn')
    },
    modal: {
        overlay: document.getElementById('confirm-modal'),
        unansweredCount: document.getElementById('unanswered-count'),
        flaggedCountContainer: document.getElementById('flagged-count-container'),
        flaggedCount: document.getElementById('flagged-count'),
        cancelBtn: document.getElementById('cancel-submit-btn'),
        confirmBtn: document.getElementById('confirm-submit-btn')
    },
    theme: {
        toggleBtn: document.getElementById('theme-toggle'),
        icon: document.getElementById('theme-toggle-icon')
    }
};

// ===== INITIALIZATION & EVENTS =====
function init() {
    // Home Screen Events
    DOM.home.startBtn.addEventListener('click', startTest);
    DOM.home.timerMinus.addEventListener('click', () => adjustTimer(-5));
    DOM.home.timerPlus.addEventListener('click', () => adjustTimer(5));

    // Timer setting manual input
    DOM.home.timerSetting.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 1) val = 1; // min positive value
        state.timerSettingMinutes = val;
        DOM.home.timerSetting.value = val;
    });

    DOM.home.randomizeToggle.addEventListener('change', (e) => state.isRandomized = e.target.checked);
    DOM.home.randomizeOptionsToggle.addEventListener('change', (e) => state.isRandomizedOptions = e.target.checked);
    DOM.home.previewBtn.addEventListener('click', openQuizEditor);
    DOM.home.importText.addEventListener('input', () => {
        if (state.currentQuizTitle !== 'Unnamed Quiz') {
            state.currentQuizTitle = 'Unnamed Quiz';
            displayPersonalBestOnHome();
            renderHistory();
        }
    });
    DOM.home.closeEditorBtn.addEventListener('click', closeQuizEditor);
    DOM.home.saveQuizBtn.addEventListener('click', saveCurrentQuiz);
    DOM.home.savedQuizzesContainer.addEventListener('click', handleQuizLibraryAction);
    DOM.home.quizEditorContainer.addEventListener('input', handleQuestionEdit);

    // Quiz Screen Events
    DOM.quiz.submitBtn.addEventListener('click', showConfirmModal);

    // Review Panel Events
    DOM.quiz.reviewPanelBtn.addEventListener('click', openReviewPanel);
    DOM.quiz.closeReviewBtn.addEventListener('click', closeReviewPanel);
    DOM.quiz.reviewPanelOverlay.addEventListener('click', closeReviewPanel);
    DOM.quiz.reviewSubmitBtn.addEventListener('click', () => {
        closeReviewPanel();
        showConfirmModal();
    });

    // Modal Events
    DOM.modal.cancelBtn.addEventListener('click', hideConfirmModal);
    DOM.modal.confirmBtn.addEventListener('click', () => {
        hideConfirmModal();
        submitTest();
    });

    // Result Screen Events
    DOM.result.tryAgainBtn.addEventListener('click', resetToHome);

    // Anti-cheat events
    document.addEventListener('fullscreenchange', handleAntiCheat);
    document.addEventListener('visibilitychange', handleAntiCheat);
    window.addEventListener('blur', handleAntiCheat);



    // Theme setup
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
        state.theme = 'dark';
    } else {
        state.theme = 'light';
    }
    updateThemeIcon();

    if (DOM.theme.toggleBtn) {
        DOM.theme.toggleBtn.addEventListener('click', toggleTheme);
    }

    // Load PB, History, and Quiz Library
    loadPersonalBest();
    loadHistory();
    loadQuizLibrary();

    // Setup History Events
    DOM.home.historySortSelect.addEventListener('change', renderHistory);
    DOM.home.clearHistoryBtn.addEventListener('click', clearHistory);

    renderHistory();
}

// ===== THEME LOGIC =====
function toggleTheme() {
    if (state.theme === 'light') {
        document.documentElement.classList.add('dark');
        state.theme = 'dark';
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        state.theme = 'light';
        localStorage.setItem('theme', 'light');
    }
    updateThemeIcon();
}

function updateThemeIcon() {
    if (!DOM.theme.icon) return;
    if (state.theme === 'dark') {
        DOM.theme.icon.className = 'ph ph-sun text-xl md:text-2xl text-amber-400';
    } else {
        DOM.theme.icon.className = 'ph ph-moon text-xl md:text-2xl text-slate-600';
    }
}

// ===== CORE LOGIC =====

function loadPersonalBest() {
    try {
        const stored = localStorage.getItem('personalBests');
        if (stored) {
            state.personalBests = JSON.parse(stored);
        }
        displayPersonalBestOnHome();
    } catch (e) {
        console.error("Failed to load Personal Bests.", e);
    }
}

function displayPersonalBestOnHome() {
    const pb = state.personalBests[state.currentQuizTitle];
    if (pb) {
        DOM.home.pbScoreText.innerText = `${pb.score.toFixed(1)}/10`;
        DOM.home.pbTimeText.innerText = formatTimeToken(pb.time);
        DOM.home.pbDisplay.classList.remove('hidden');
    } else {
        DOM.home.pbDisplay.classList.add('hidden');
    }
}

function loadHistory() {
    try {
        const stored = localStorage.getItem('speedrunHistory');
        if (stored) {
            state.history = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load history.", e);
    }
}

function saveToHistory(score, time) {
    const entry = {
        score: score,
        time: time,
        date: Date.now(),
        quizTitle: state.currentQuizTitle
    };
    state.history.push(entry);
    localStorage.setItem('speedrunHistory', JSON.stringify(state.history));
}

function renderHistory() {
    const filteredHistory = state.history.filter(h => h.quizTitle === state.currentQuizTitle);

    if (!filteredHistory || filteredHistory.length === 0) {
        DOM.home.historyTableBody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-500 dark:text-slate-400 italic">No history yet for "${state.currentQuizTitle}". Start a test to record your first score!</td></tr>`;
        return;
    }

    const sortType = DOM.home.historySortSelect.value;
    let sortedHistory = [...filteredHistory];
    if (sortType === 'newest') {
        sortedHistory.sort((a, b) => b.date - a.date);
    } else if (sortType === 'best') {
        sortedHistory.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.time - b.time;
        });
    }

    let html = '';
    sortedHistory.forEach(entry => {
        const dateObj = new Date(entry.date);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let scoreColor = 'text-slate-700 dark:text-slate-200';
        if (entry.score >= 8) scoreColor = 'text-green-600 dark:text-green-400';
        else if (entry.score >= 5) scoreColor = 'text-blue-600 dark:text-blue-400';

        html += `
            <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                <td class="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">${dateStr}</td>
                <td class="py-3 px-4 text-slate-600 dark:text-slate-300 truncate max-w-[120px] sm:max-w-xs" title="${entry.quizTitle || 'Unnamed Quiz'}">${entry.quizTitle || 'Unnamed Quiz'}</td>
                <td class="py-3 px-4 font-bold ${scoreColor}">${entry.score.toFixed(1)}/10</td>
                <td class="py-3 px-4 text-slate-600 dark:text-slate-300 text-right tabular-nums">${formatTimeToken(entry.time)}</td>
            </tr>
        `;
    });

    DOM.home.historyTableBody.innerHTML = html;
}

function clearHistory() {
    if (confirm(`Are you sure you want to clear your speedrun history for "${state.currentQuizTitle}"?`)) {
        state.history = state.history.filter(h => h.quizTitle !== state.currentQuizTitle);
        localStorage.setItem('speedrunHistory', JSON.stringify(state.history));
        renderHistory();
    }
}

// ===== QUIZ LIBRARY LOGIC =====
function loadQuizLibrary() {
    try {
        const stored = localStorage.getItem('quizLibrary');
        if (stored) {
            state.quizLibrary = JSON.parse(stored);
        }
        renderQuizLibrary();
    } catch (e) {
        console.error("Failed to load quiz library.", e);
    }
}

function saveCurrentQuiz() {
    const content = DOM.home.importText.value.trim();
    if (!content) {
        alert("Please paste some questions to save first.");
        return;
    }

    const titleInput = DOM.home.quizTitleInput.value.trim();
    const title = titleInput ? titleInput : `Quiz Flow ${new Date().toLocaleDateString()}`;

    const newQuiz = {
        id: 'quiz-' + Date.now().toString(36) + Math.random().toString(36).substr(2),
        title: title,
        content: content,
        date: Date.now()
    };

    state.quizLibrary.push(newQuiz);
    localStorage.setItem('quizLibrary', JSON.stringify(state.quizLibrary));

    state.currentQuizTitle = title;
    DOM.home.quizTitleInput.value = ''; // clear input
    renderQuizLibrary();
    displayPersonalBestOnHome();
    renderHistory();
    showToast(`Saved as "${title}"`);
}

function handleQuizLibraryAction(e) {
    const editBtn = e.target.closest('.edit-quiz-btn');
    const deleteBtn = e.target.closest('.delete-quiz-btn');
    const loadBtn = e.target.closest('.load-quiz-btn');

    if (editBtn) {
        e.stopPropagation();
        editQuizTitle(editBtn.dataset.id);
    } else if (deleteBtn) {
        e.stopPropagation();
        deleteQuiz(deleteBtn.dataset.id);
    } else if (loadBtn) {
        loadQuiz(loadBtn.dataset.id);
    }
}

function loadQuiz(id) {
    const quiz = state.quizLibrary.find(q => q.id === id);
    if (quiz) {
        DOM.home.importText.value = quiz.content;
        DOM.home.importStatus.innerText = `Loaded: "${quiz.title}"`;
        DOM.home.importStatus.className = "text-xs font-medium text-green-600 dark:text-green-400";
        parseQuestions(quiz.content);
        state.currentQuizTitle = quiz.title;
        displayPersonalBestOnHome();
        renderHistory();
        showToast(`Successfully loaded "${quiz.title}"`);
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 z-[200] px-4 py-3 rounded-xl shadow-xl text-white font-medium text-sm flex items-center gap-2 transform transition-all translate-y-full opacity-0 duration-300 bg-green-600';
    toast.innerHTML = `<i class="ph ph-check-circle text-lg"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-full', 'opacity-0');
    }, 50);

    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function deleteQuiz(id) {
    if (confirm("Are you sure you want to delete this saved quiz?")) {
        state.quizLibrary = state.quizLibrary.filter(q => q.id !== id);
        localStorage.setItem('quizLibrary', JSON.stringify(state.quizLibrary));
        renderQuizLibrary();
    }
}

function editQuizTitle(id) {
    const quiz = state.quizLibrary.find(q => q.id === id);
    if (!quiz) return;

    const newTitle = prompt("Enter a new title for this quiz:", quiz.title);
    if (newTitle !== null && newTitle.trim() !== '') {
        quiz.title = newTitle.trim();
        localStorage.setItem('quizLibrary', JSON.stringify(state.quizLibrary));
        renderQuizLibrary();
    }
}

function renderQuizLibrary() {
    if (!state.quizLibrary || state.quizLibrary.length === 0) {
        DOM.home.savedQuizzesContainer.innerHTML = `<div class="text-sm text-slate-500 dark:text-slate-400 italic py-2 text-center">No saved quizzes yet.</div>`;
        return;
    }

    // Sort newest first
    const sortedLibrary = [...state.quizLibrary].sort((a, b) => b.date - a.date);

    let html = '';
    sortedLibrary.forEach(quiz => {
        html += `
            <div class="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700/50 transition-colors group">
                <button class="load-quiz-btn flex-grow text-left font-medium text-sm text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate pr-4" data-id="${quiz.id}">
                    <i class="ph ph-file-text mr-2 text-slate-400"></i>${quiz.title}
                </button>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="edit-quiz-btn p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Edit Title" data-id="${quiz.id}">
                        <i class="ph ph-pencil-simple"></i>
                    </button>
                    <button class="delete-quiz-btn p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete Quiz" data-id="${quiz.id}">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    DOM.home.savedQuizzesContainer.innerHTML = html;
}

// ===== INLINE QUIZ EDITOR LOGIC =====

function openQuizEditor() {
    const rawText = DOM.home.importText.value.trim();
    if (!rawText) {
        alert("Please paste questions into the importer first.");
        return;
    }

    // Parse the current text into state.customQuestions (and reset current state)
    parseQuestions(rawText);
    if (!state.customQuestions || state.customQuestions.length === 0) {
        alert("Could not parse any questions. Check format.");
        return;
    }

    renderQuizEditor();
    DOM.home.quizEditorSection.classList.remove('hidden');
}

function closeQuizEditor() {
    DOM.home.quizEditorSection.classList.add('hidden');
}

function renderQuizEditor() {
    let html = '';
    state.customQuestions.forEach((q, index) => {
        html += `
            <div class="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700" data-index="${index}">
                <div class="mb-3">
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Question ${index + 1}</label>
                    <textarea class="edit-q-text w-full rounded border border-slate-300 dark:border-slate-600 p-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500" rows="2">${q.text}</textarea>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${q.options.map((opt, oIndex) => `
                        <div class="flex items-center gap-2">
                            <input type="radio" name="edit-correct-${index}" value="${opt.id}" class="edit-q-correct cursor-pointer w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 dark:bg-slate-900" ${q.correct === opt.id ? 'checked' : ''}>
                            <div class="flex-grow flex items-center">
                                <span class="text-sm font-semibold text-slate-600 dark:text-slate-400 w-6">${opt.id}.</span>
                                <input type="text" class="edit-q-opt flex-grow rounded border border-slate-300 dark:border-slate-600 p-1.5 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500" data-opt-id="${opt.id}" value="${opt.text}">
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    DOM.home.quizEditorContainer.innerHTML = html;
}

function handleQuestionEdit(e) {
    const editCard = e.target.closest('[data-index]');
    if (!editCard) return;

    const index = parseInt(editCard.dataset.index);
    const q = state.customQuestions[index];

    // Update Question Text
    if (e.target.classList.contains('edit-q-text')) {
        q.text = e.target.value;
    }

    // Update Option Text
    if (e.target.classList.contains('edit-q-opt')) {
        const optId = e.target.dataset.optId;
        const opt = q.options.find(o => o.id === optId);
        if (opt) opt.text = e.target.value;
    }

    // Update Correct Answer
    if (e.target.classList.contains('edit-q-correct')) {
        q.correct = e.target.value;
    }

    reconstructTextarea();
}

function reconstructTextarea() {
    let rawText = '';
    state.customQuestions.forEach((q, index) => {
        rawText += `Câu ${index + 1}: ${q.text}\n`;

        const optionStrings = q.options.map(opt => {
            const isCorrect = q.correct === opt.id ? '/' : '';
            return `${isCorrect}${opt.id}. ${opt.text}`;
        });

        rawText += optionStrings.join(' ') + '\n\n';
    });

    DOM.home.importText.value = rawText.trim();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function replaceLinksToImages(text) {
    if (!text) return text;
    var urlPattern = /(http(s)?:\/\/[^\s]+\.(png|jpg|jp2|gif|webp))/ig;
    var replacedText = text.replace(urlPattern, function (url) {
        return '<img src="' + url + '" class="question-img" />';
    });
    return replacedText;
}

function adjustTimer(change) {
    let newTime = state.timerSettingMinutes + change;
    if (newTime < 1) newTime = 1;
    state.timerSettingMinutes = newTime;
    DOM.home.timerSetting.value = state.timerSettingMinutes;
}

function parseQuestions(text) {
    if (!text) {
        DOM.home.importStatus.innerText = "Please paste some text first.";
        DOM.home.importStatus.className = "text-xs font-medium text-amber-500";
        return;
    }

    // Split into question blocks, looking for "Question <number>:" or "Câu <number>:"
    const qBlocks = text.split(/(?=(?:Question|C[aâ]u)\s+\d+:)/i);
    const parsedQuestions = [];

    for (let i = 0; i < qBlocks.length; i++) {
        let block = qBlocks[i].trim();
        if (!/^(?:Question|C[aâ]u)\s+\d+:/i.test(block)) continue;

        // Find where options start loosely by looking for A., /A., B., /B. etc.
        const splitIndex = block.search(/\/?(?:A|B|C|D)\./i);
        if (splitIndex === -1) continue;

        const qHeader = block.substring(0, splitIndex).trim();
        // Remove 'Question/Câu X: ' from header
        const headerMatch = qHeader.match(/^(?:Question|C[aâ]u)\s+\d+:\s*(.*)/is);
        if (!headerMatch) continue;

        let qText = headerMatch[1].trim();
        let optionsHtml = block.substring(splitIndex);

        // Find all options A, B, C, D (case insensitive), capturing the optional '/' prefix
        const optMatches = [...optionsHtml.matchAll(/(\/?)([A-D])\.\s*(.*?)(?=\/?(?:[A-D])\.\s*|$)/gis)];

        if (optMatches.length > 0) {
            let correctId = null;
            let options = [];

            // Re-map to a,b,c,d standard
            optMatches.forEach((m, idx) => {
                const isCorrect = m[1] === '/';
                const optLetter = m[2].toLowerCase();
                const optText = m[3].trim();

                options.push({ id: optLetter, text: optText });
                if (isCorrect) correctId = optLetter;
            });

            // Default to first option if no '/' was provided
            if (!correctId && options.length > 0) correctId = options[0].id;

            parsedQuestions.push({
                id: i,
                text: qText,
                options: options,
                correct: correctId
            });
        }
    }

    if (parsedQuestions.length > 0) {
        state.customQuestions = parsedQuestions;
        DOM.home.importStatus.innerText = `Success: ${parsedQuestions.length} questions parsed!`;
        DOM.home.importStatus.className = "text-xs font-medium text-green-600";
    } else {
        DOM.home.importStatus.innerText = "Error: Could not parse questions. Check format.";
        DOM.home.importStatus.className = "text-xs font-medium text-red-500";
        state.customQuestions = null;
    }
}

function switchScreen(newScreen) {
    // Hide current
    const current = document.querySelector(`#${state.screen}-screen`);
    if (current) current.style.opacity = '0';

    setTimeout(() => {
        if (current) current.classList.add('hidden');

        // Show new
        state.screen = newScreen;
        const next = document.querySelector(`#${state.screen}-screen`);
        if (next) {
            next.classList.remove('hidden');

            // Slight delay for translation animation mapping
            setTimeout(() => {
                next.style.opacity = '1';
                next.classList.remove('translate-y-4'); // If applied
            }, 50);
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 500);
}

function startTest() {
    const rawText = DOM.home.importText.value.trim();
    if (rawText) {
        parseQuestions(rawText);
    }

    if (!state.customQuestions || state.customQuestions.length === 0) {
        alert("Please paste custom questions to begin the test.");
        return;
    }

    // Request fullscreen
    try {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => console.log("Fullscreen error:", err));
        }
    } catch (e) { }

    // Delay activation to prevent false positives during transition
    setTimeout(() => {
        state.isTestActive = true;
    }, 1000);

    // Deep copy to prevent modifying the original options array if options are shuffled
    let activeQuestions = state.customQuestions.map(q => ({
        ...q,
        options: [...q.options]
    }));

    state.questionCount = activeQuestions.length;

    if (state.isRandomized) {
        state.questions = shuffleArray(activeQuestions);
    } else {
        state.questions = activeQuestions; // Sequential
    }

    if (state.isRandomizedOptions) {
        state.questions.forEach(q => {
            shuffleArray(q.options);
        });
    }

    state.answers = {};
    state.flags.clear();
    state.timeRemaining = state.timerSettingMinutes * 60; // Use configured minutes
    state.startTime = new Date();

    // Ensure submit button is enabled for new session
    DOM.quiz.submitBtn.disabled = false;

    // Render
    renderQuestions();
    updateProgressIndicator();
    updateTimerDisplay();
    updateReviewPanel();

    // Start Timer
    state.timerInterval = setInterval(timerTick, 1000);

    // Switch Screen
    switchScreen('quiz');
}

function renderQuestions() {
    DOM.quiz.questionsContainer.innerHTML = '';

    state.questions.forEach((q, index) => {
        const d = (index * 0.05).toFixed(2); // Staggered animation delay

        const card = document.createElement('div');
        card.className = `glass-card p-6 md:p-8 rounded-2xl bg-white/70 dark:bg-slate-800/70 border-slate-100 dark:border-slate-700/50 shadow-sm question-card hover:shadow-md transition-shadow duration-300`;
        card.style.animationDelay = `${d}s`;
        card.id = `q-card-${index}`;

        // Question Header
        const qTextWithImages = replaceLinksToImages(q.text);
        const isFlagged = state.flags.has(index);
        let html = `
            <div class="flex gap-4 mb-6 relative">
                <div class="w-10 h-10 shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-bold mt-1">
                    ${index + 1}
                </div>
                <h3 class="text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed pt-1 flex-grow pr-10">
                    ${qTextWithImages}
                </h3>
                <button onclick="toggleFlag(${index})" id="flag-btn-${index}" class="absolute top-0 right-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isFlagged ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700'}">
                    <i class="ph ${isFlagged ? 'ph-fill' : ''} ph-flag text-xl transition-transform ${isFlagged ? 'scale-110' : ''}"></i>
                </button>
            </div>
            <div class="space-y-3 pl-0 md:pl-14">
                `;

        // Options
        q.options.forEach(opt => {
            const optTextWithImages = replaceLinksToImages(opt.text);
            const inputId = `q${index}-opt-${opt.id}`;
            html += `
                <label for="${inputId}" class="option-label flex items-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 w-full group">
                    <input type="radio" id="${inputId}" name="q${index}" value="${opt.id}" class="custom-radio mr-4" onchange="handleAnswer(${index}, '${opt.id}')">
                        <span class="text-slate-700 dark:text-slate-200 font-medium group-hover:text-slate-900 dark:group-hover:text-white w-full break-words">${optTextWithImages}</span>
                </label>
                `;
        });

        html += `</div>`;
        card.innerHTML = html;
        DOM.quiz.questionsContainer.appendChild(card);
    });
}

// Global handler attached to window for inline onclick
function handleAnswer(questionIndex, optionId) {
    state.answers[questionIndex] = optionId;

    // Visual update logic: Update the parent label classes
    const card = document.getElementById(`q-card-${questionIndex}`);
    const labels = card.querySelectorAll('.option-label');

    labels.forEach(label => {
        label.classList.remove('option-selected');
        const input = label.querySelector('input');
        if (input.checked) {
            label.classList.add('option-selected');
        }
    });

    updateProgressIndicator();
    updateReviewPanel();
};

window.toggleFlag = function (questionIndex) {
    if (state.flags.has(questionIndex)) {
        state.flags.delete(questionIndex);
    } else {
        state.flags.add(questionIndex);
    }

    const btn = document.getElementById(`flag-btn-${questionIndex}`);
    if (!btn) return;

    const isFlagged = state.flags.has(questionIndex);
    btn.className = `absolute top-0 right-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isFlagged ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`;
    btn.innerHTML = `<i class="ph ${isFlagged ? 'ph-fill' : ''} ph-flag text-xl transition-transform ${isFlagged ? 'scale-110' : ''}"></i>`;

    updateReviewPanel();
};

function updateProgressIndicator() {
    const answeredCount = Object.keys(state.answers).length;
    DOM.quiz.progressText.innerText = `${answeredCount}/${state.questionCount}`;

    // Update progress bar
    if (state.questionCount > 0) {
        const progressPercent = Math.round((answeredCount / state.questionCount) * 100);
        DOM.quiz.progressBar.style.width = `${progressPercent}%`;
        if (DOM.quiz.progressPercentage) {
            DOM.quiz.progressPercentage.innerText = `${progressPercent}%`;
        }
    } else {
        DOM.quiz.progressBar.style.width = `0%`;
        if (DOM.quiz.progressPercentage) {
            DOM.quiz.progressPercentage.innerText = `0%`;
        }
    }
}

// ===== TIMER LOGIC =====
function timerTick() {
    state.timeRemaining--;
    updateTimerDisplay();

    if (state.timeRemaining <= 0) {
        clearInterval(state.timerInterval);
        submitTest();
    }
}

function updateTimerDisplay() {
    const mins = Math.floor(state.timeRemaining / 60);
    const secs = state.timeRemaining % 60;
    DOM.quiz.timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Warning state
    if (state.timeRemaining < 300) { // Under 5 minutes
        DOM.quiz.timerDisplay.parentElement.classList.remove('text-blue-600', 'border-blue-100', 'bg-white/80', 'dark:text-blue-400', 'dark:border-blue-900/50', 'dark:bg-slate-800/80');
        DOM.quiz.timerDisplay.parentElement.classList.add('text-red-600', 'border-red-200', 'bg-red-50', 'dark:text-red-400', 'dark:border-red-900/50', 'dark:bg-red-900/20', 'animate-pulse');
        const svg = DOM.quiz.timerDisplay.parentElement.querySelector('svg');
        svg.classList.remove('text-blue-500');
        svg.classList.add('text-red-500');
    }
}

function formatTimeToken(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ===== MODAL =====
function showConfirmModal() {
    const answered = Object.keys(state.answers).length;
    const unanswered = state.questionCount - answered;
    const flaggedCount = state.flags.size;

    const messageEl = document.getElementById('confirm-modal-message');
    if (unanswered === 0) {
        messageEl.innerHTML = "You have answered all questions" + (flaggedCount > 0 ? `, but you have <span class="font-bold text-amber-500 dark:text-amber-400">${flaggedCount}</span> flagged questions.` : ".");
        messageEl.innerHTML += " Are you sure you want to submit your test early? You cannot change your answers after submission.";
    } else {
        messageEl.innerHTML = `Are you sure you want to submit your test early? You have <span class="font-bold text-slate-700 dark:text-slate-200">${unanswered}</span> unanswered questions${flaggedCount > 0 ? ` and <span class="font-bold text-amber-500 dark:text-amber-400">${flaggedCount}</span> flagged questions` : ''}. You cannot change your answers after submission.`;
    }

    DOM.modal.overlay.classList.remove('hidden');
    // Force reflow
    void DOM.modal.overlay.offsetWidth;

    DOM.modal.overlay.classList.add('flex');
    DOM.modal.overlay.classList.remove('opacity-0');
    DOM.modal.overlay.classList.add('opacity-100');

    // Scale up content gently
    DOM.modal.overlay.querySelector('.modal-content').classList.remove('scale-95');
    DOM.modal.overlay.querySelector('.modal-content').classList.add('scale-100');
}

function hideConfirmModal() {
    DOM.modal.overlay.classList.remove('opacity-100');
    DOM.modal.overlay.classList.add('opacity-0');

    DOM.modal.overlay.querySelector('.modal-content').classList.remove('scale-100');
    DOM.modal.overlay.querySelector('.modal-content').classList.add('scale-95');

    setTimeout(() => {
        DOM.modal.overlay.classList.add('hidden');
        DOM.modal.overlay.classList.remove('flex');
        DOM.quiz.submitBtn.disabled = false; // Safeguard to ensure button functions
    }, 300);
}

// ===== REVIEW PANEL LOGIC =====
function openReviewPanel() {
    updateReviewPanel();
    DOM.quiz.reviewPanelOverlay.classList.remove('hidden');
    // Force reflow
    void DOM.quiz.reviewPanelOverlay.offsetWidth;

    DOM.quiz.reviewPanelOverlay.classList.remove('opacity-0');
    DOM.quiz.reviewPanelOverlay.classList.add('opacity-100');

    DOM.quiz.reviewPanel.classList.remove('translate-x-full');
    DOM.quiz.reviewPanel.classList.add('translate-x-0');
}

function closeReviewPanel() {
    DOM.quiz.reviewPanelOverlay.classList.remove('opacity-100');
    DOM.quiz.reviewPanelOverlay.classList.add('opacity-0');

    DOM.quiz.reviewPanel.classList.remove('translate-x-0');
    DOM.quiz.reviewPanel.classList.add('translate-x-full');

    setTimeout(() => {
        DOM.quiz.reviewPanelOverlay.classList.add('hidden');
    }, 300);
}

function updateReviewPanel() {
    if (!DOM.quiz.reviewGrid) return;
    DOM.quiz.reviewGrid.innerHTML = '';

    for (let i = 0; i < state.questionCount; i++) {
        const isAnswered = state.answers[i] !== undefined;
        const isFlagged = state.flags.has(i);

        let bgClass = isAnswered
            ? 'bg-blue-500 text-white border-blue-600 shadow-sm shadow-blue-500/20'
            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600';

        const btn = document.createElement('button');
        btn.onclick = () => scrollToQuestion(i);
        btn.className = `relative aspect-square rounded-xl font-bold text-sm md:text-base flex items-center justify-center border transition-all transform hover:scale-105 ${bgClass}`;
        btn.innerText = i + 1;

        if (isFlagged) {
            btn.innerHTML += `<div class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm"><i class="ph-fill ph-flag text-[10px] text-amber-500"></i></div>`;
            if (!isAnswered) {
                // If it's flagged and unanswered, maybe give it a slight amber tint border
                btn.classList.add('border-amber-300', 'dark:border-amber-700/50');
            }
        }

        DOM.quiz.reviewGrid.appendChild(btn);
    }
}

window.scrollToQuestion = function (index) {
    closeReviewPanel();
    const card = document.getElementById(`q-card-${index}`);
    if (card) {
        // Smooth scroll to the element slightly minus the sticky header height
        const y = card.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });

        // Highlight animation
        card.classList.add('ring-4', 'ring-blue-400', 'dark:ring-blue-500', 'ring-opacity-50', 'transition-shadow', 'duration-500');
        setTimeout(() => {
            card.classList.remove('ring-4', 'ring-blue-400', 'dark:ring-blue-500', 'ring-opacity-50');
        }, 1500);
    }
}

// ===== ANTI-CHEAT LOGIC =====
function handleAntiCheat(e) {
    if (!state.isTestActive) return;

    // Small delay to verify it wasn't a transient event
    setTimeout(() => {
        if (!state.isTestActive) return;

        let shouldDisqualify = false;

        if (e.type === 'visibilitychange' && document.hidden) {
            shouldDisqualify = true;
        } else if (e.type === 'blur') {
            shouldDisqualify = true;
        } else if (e.type === 'fullscreenchange' && !document.fullscreenElement) {
            shouldDisqualify = true;
        }

        if (shouldDisqualify) {
            disqualifyTest();
        }
    }, 200);
}

function disqualifyTest() {
    if (!state.isTestActive) return;
    state.isTestActive = false;
    state.isCheat = true;

    // Clear all answers to forfeit the test
    state.answers = {};

    submitTest();
}

// ===== SUBMISSION & RESULTS =====
function submitTest() {
    state.isTestActive = false;
    clearInterval(state.timerInterval);
    state.endTime = new Date();

    try {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(err => console.log(err));
        }
    } catch (e) { }

    evaluateResults();
    switchScreen('result');
}

function evaluateResults() {
    let correct = 0;
    let reviewHtml = '';

    if (state.isCheat) {
        DOM.result.scoreText.innerText = `0%`;
        DOM.result.correctCount.innerText = 0;
        DOM.result.incorrectCount.innerText = state.questionCount;

        const timeTakenSecs = Math.floor((state.endTime - state.startTime) / 1000);
        DOM.result.timeTaken.innerText = formatTimeToken(timeTakenSecs);
        DOM.result.avgTime.innerText = `0.0s`;
        DOM.result.scaledScore.innerHTML = `0.0<span class="text-lg text-slate-500 dark:text-slate-400">/10</span>`;

        const feedbackEl = DOM.result.motivationalFeedback;
        feedbackEl.className = `text-left mb-8 md:mb-10 p-4 md:p-5 rounded-xl md:rounded-2xl border shadow-sm flex items-start gap-4 transition-all duration-300 bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300`;
        feedbackEl.innerHTML = `
            <div class="mt-1 shrink-0 bg-white/60 dark:bg-slate-800/60 p-2 rounded-lg border border-white dark:border-slate-700/50 shadow-sm flex items-center justify-center">
                <i class="ph ph-warning-octagon text-2xl md:text-3xl text-red-500 dark:text-red-400"></i>
            </div>
            <div>
                <div class="font-bold text-base md:text-lg mb-1 tracking-tight">Vui lòng trung thực!</div>
                <div class="text-sm md:text-base opacity-90 leading-relaxed italic">Bạn đã gian lận. Kết quả bài thi đã bị hủy và điểm số của bạn là 0.</div>
            </div>
        `;
        feedbackEl.classList.remove('hidden');

        DOM.result.reviewContainer.innerHTML = '<div class="text-center text-slate-500 dark:text-slate-400 py-4 font-medium italic">Kết quả bài thi không được ghi nhận do vi phạm quy chế thi (thoát toàn màn hình, chuyển tab).</div>';

        // disable stroke animation or set it to 0
        setTimeout(() => {
            DOM.result.scoreCircle.style.strokeDashoffset = 289;
        }, 500);

        return; // Skip normal evaluation
    }

    state.questions.forEach((q, index) => {
        const userAnswer = state.answers[index];
        const isCorrect = userAnswer === q.correct;

        if (isCorrect) correct++;

        // Find option texts
        const userOpt = userAnswer ? q.options.find(o => o.id === userAnswer).text : "No answer";
        const correctOpt = q.options.find(o => o.id === q.correct).text;

        // Build review UI
        const statusColor = isCorrect ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
        const icon = isCorrect ? 'ph-check-circle' : 'ph-x-circle';
        const border = isCorrect ? 'border-green-100 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/10' : 'border-red-100 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10';

        let explanationHtml = '';
        if (q.explanation && q.theory) {
            explanationHtml = `
                <div class="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div class="flex items-start gap-2 mb-2">
                        <div class="mt-0.5 text-blue-500 dark:text-blue-400"><i class="ph fill ph-info"></i></div>
                        <div>
                            <div class="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">${q.theory}</div>
                            <div class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${q.explanation}</div>
                        </div>
                    </div>
                    ${!isCorrect && userAnswer ? `
                        <div class="mt-2 text-sm text-slate-500 dark:text-slate-400 italic pl-6 border-l-2 border-red-200 dark:border-red-900/50 ml-1">
                            Your choice "${userOpt}" is incorrect because it violates this rule.
                        </div>
                    ` : ''}
                </div>
            `;
        }

        reviewHtml += `
            <div class="p-4 md:p-5 rounded-xl border ${border} mb-4 shadow-sm transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <div class="flex gap-4">
                    <div class="mt-1 ${statusColor}">
                        <i class="ph fill ${icon} text-2xl"></i>
                    </div>
                    <div class="flex-grow">
                        <div class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Question ${index + 1}</div>
                        <div class="font-medium text-slate-800 dark:text-slate-100 mb-3">${q.text}</div>
                        <div class="text-sm grid grid-cols-1 md:grid-cols-2 gap-3 bg-white/60 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                            <div class="${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-slate-600 dark:text-slate-300'} flex items-start gap-2">
                                <span class="font-semibold text-slate-400 dark:text-slate-500">Your Answer:</span> 
                                <span class="font-medium ${!userAnswer ? 'italic opacity-60 text-slate-400 dark:text-slate-500' : ''}">${userAnswer ? userOpt : 'Skipped'}</span>
                            </div>
                            ${!isCorrect ? `
                                <div class="text-green-600 dark:text-green-400 flex items-start gap-2">
                                    <span class="font-semibold text-slate-400 dark:text-slate-500">Correct:</span> 
                                    <span class="font-medium">${correctOpt}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${explanationHtml}
                    </div>
                </div>
            </div>
        `;
    });

    // Set Default UI states
    const scorePct = Math.round((correct / state.questionCount) * 100);
    DOM.result.newPbBadge.classList.add('hidden');
    DOM.result.scoreText.innerText = `${scorePct}%`;
    DOM.result.correctCount.innerText = correct;
    DOM.result.incorrectCount.innerText = state.questionCount - correct;

    const timeTakenSecs = Math.floor((state.endTime - state.startTime) / 1000);
    DOM.result.timeTaken.innerText = formatTimeToken(timeTakenSecs);

    // Average Time per Question
    const avgSecs = state.questionCount > 0 ? (timeTakenSecs / state.questionCount).toFixed(1) : "0.0";
    DOM.result.avgTime.innerText = `${avgSecs}s`;

    // Scaled Score (10-point scale)
    const scaledScoreNum = state.questionCount > 0 ? (correct / state.questionCount) * 10 : 0;
    const scaled = scaledScoreNum.toFixed(1);
    DOM.result.scaledScore.innerHTML = `${scaled}<span class="text-lg text-slate-500 dark:text-slate-400">/10</span>`;

    // Check Personal Best
    let pb = state.personalBests[state.currentQuizTitle];
    let isNewPb = false;

    if (!pb) {
        isNewPb = true;
    } else {
        if (scaledScoreNum > pb.score) {
            isNewPb = true;
        } else if (scaledScoreNum === pb.score && timeTakenSecs < pb.time) {
            isNewPb = true;
        }
    }

    if (isNewPb && scaledScoreNum > 0) { // Don't save 0 as PB immediately if it's the first run
        state.personalBests[state.currentQuizTitle] = { score: scaledScoreNum, time: timeTakenSecs };
        localStorage.setItem('personalBests', JSON.stringify(state.personalBests));
        DOM.result.newPbBadge.classList.remove('hidden');
    }

    // Save history
    saveToHistory(scaledScoreNum, timeTakenSecs);

    // Show motivational feedback
    showMotivationalFeedback(scaledScoreNum);

    DOM.result.reviewContainer.innerHTML = reviewHtml;

    // Animate Circle
    // stroke-dasharray is 289. offset = 289 - (289 * scorePct / 100)
    setTimeout(() => {
        const offset = 289 - (289 * scorePct / 100);
        DOM.result.scoreCircle.style.strokeDashoffset = offset;
    }, 500); // Wait for screen transition
}

function showMotivationalFeedback(score) {
    const perfectMessages = [
        "Đỉnh cao của sự chỉn chu: 'Điểm 10 này không chỉ là con số, nó là minh chứng cho việc bạn đã kiểm soát hoàn toàn cuộc chơi. Quá xuất sắc!'",
        "Sức mạnh của sự kiên trì: 'Để chạm đến sự hoàn hảo này, chắc chắn bạn đã nỗ lực hơn mọi người rất nhiều. Bạn hoàn toàn xứng đáng với vị trí dẫn đầu.'",
        "Người thiết lập tiêu chuẩn: 'Bạn đang đặt ra một tiêu chuẩn rất cao cho chính mình và mọi người xung quanh. Cứ giữ vững phong độ 'vô đối' này nhé!'",
        "Trí tuệ và kỹ năng: 'Sự thông minh cộng với sự cẩn thận đã tạo nên kết quả tuyệt đối này. Bạn làm tôi thực sự ngưỡng mộ đấy!'",
        "Cột mốc đáng tự hào: 'Hãy ăn mừng đi! Điểm 10 này là lời khẳng định rằng không có giới hạn nào mà bạn không thể vượt qua.'"
    ];

    const excellentMessages = [
        "Sát nút sự hoàn mỹ: 'Một kết quả cực kỳ ấn tượng! Bạn đã nắm rất chắc kiến thức, chỉ cần thêm một chút may mắn hoặc tỉ mỉ nữa là chạm mốc 10 rồi.'",
        "Nỗ lực đáng ghi nhận: 'Điểm số này chứng minh bạn đang đi đúng hướng và có nền tảng cực kỳ vững chắc. Tiếp tục phát huy nhé!'",
        "Sự ổn định đáng tin cậy: 'Bạn luôn duy trì được phong độ ở mức cao như thế này thật sự không dễ dàng chút nào. Bạn là một 'chiến thần' thực thụ đấy!'",
        "Tiềm năng to lớn: 'Kết quả này cho thấy bạn có khả năng bứt phá rất lớn. Tôi tin là lần tới, mục tiêu cao nhất sẽ nằm gọn trong tay bạn.'",
        "Thành quả của sự tập trung: 'Cách bạn xử lý bài thi để đạt mức điểm này thật sự rất thông minh. Một bước đệm hoàn hảo cho những thử thách tiếp theo!'"
    ];

    const goodMessages = [
        "Vượt qua sóng gió: 'Chúc mừng bạn đã vượt qua! Đây là nền tảng quan trọng để bạn nhận ra mình cần tập trung thêm ở đâu để bùng nổ hơn.'",
        "Tinh thần thép: 'Dù bài thi có khó khăn, bạn vẫn kiên trì để đạt được kết quả an toàn. Đó là tố chất của người không bao giờ bỏ cuộc.'",
        "Học hỏi từ thực tế: 'Điểm số này là một 'phép thử' tốt. Bạn đã làm tốt những gì mình biết, giờ là lúc chinh phục những phần còn lại!'",
        "Sự tiến bộ thầm lặng: 'Tôi thấy được sự cố gắng của bạn trong từng câu trả lời. Chỉ cần điều chỉnh phương pháp một chút, điểm số sẽ tỷ lệ thuận với công sức của bạn.'",
        "Giữ vững niềm tin: 'Mức điểm này cho thấy bạn có đủ khả năng để đi tiếp. Đừng dừng lại, vì bạn đang ở rất gần với sự bứt phá rồi!'"
    ];

    const needsImprovementMessages = [
        "Bản lĩnh của người đứng dậy: 'Điểm số hôm nay không định nghĩa con người bạn. Quan trọng là bạn dám đối diện và sẵn sàng làm lại mạnh mẽ hơn!'",
        "Bài học quý giá: 'Đôi khi chúng ta cần một bước lùi để quan sát kỹ hơn con đường phía trước. Đây chính là cơ hội để bạn 'reset' và trở lại lợi hại hơn.'",
        "Sự can đảm tuyệt vời: 'Phải cần rất nhiều can đảm để đi tiếp sau một kết quả không như ý. Và tôi tin bạn có thừa sự can đảm đó!'",
        "Hạt mầm của thành công: 'Mọi thiên tài đều từng có những lúc bắt đầu từ con số 0 hoặc dưới trung bình. Quan trọng là bạn học được gì từ những lỗi sai này.'",
        "Niềm tin không đổi: 'Tôi không nhìn vào con số này, tôi nhìn vào tiềm năng chưa khai phá hết trong bạn. Cố lên, tôi luôn đứng về phía bạn trong hành trình ngược dòng này!'"
    ];

    let messages = [];
    let styleClasses = "";
    let iconHTML = "";

    if (score === 10) {
        messages = perfectMessages;
        styleClasses = "bg-amber-50/80 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300";
        iconHTML = '<i class="ph ph-crown text-2xl md:text-3xl text-amber-500 dark:text-amber-400"></i>';
    } else if (score >= 8) {
        messages = excellentMessages;
        styleClasses = "bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300";
        iconHTML = '<i class="ph ph-hands-clapping text-2xl md:text-3xl text-green-500 dark:text-green-400"></i>';
    } else if (score >= 5) {
        messages = goodMessages;
        styleClasses = "bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300";
        iconHTML = '<i class="ph ph-thumbs-up text-2xl md:text-3xl text-blue-500 dark:text-blue-400"></i>';
    } else {
        messages = needsImprovementMessages;
        styleClasses = "bg-indigo-50/80 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-300";
        iconHTML = '<i class="ph ph-rocket-launch text-2xl md:text-3xl text-indigo-500 dark:text-indigo-400"></i>';
    }

    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    const splitIndex = randomMsg.indexOf(':');
    let title = "";
    let text = randomMsg;

    if (splitIndex !== -1) {
        title = randomMsg.substring(0, splitIndex);
        text = randomMsg.substring(splitIndex + 1).trim();
    }

    const feedbackEl = DOM.result.motivationalFeedback;
    feedbackEl.className = `text-left mb-8 md:mb-10 p-4 md:p-5 rounded-xl md:rounded-2xl border shadow-sm flex items-start gap-4 transition-all duration-300 ${styleClasses}`;
    feedbackEl.innerHTML = `
        <div class="mt-1 shrink-0 bg-white/60 dark:bg-slate-800/60 p-2 rounded-lg border border-white dark:border-slate-700/50 shadow-sm flex items-center justify-center">
            ${iconHTML}
        </div>
        <div>
            ${title ? `<div class="font-bold text-base md:text-lg mb-1 tracking-tight">${title}</div>` : ''}
            <div class="text-sm md:text-base opacity-90 leading-relaxed italic">${text}</div>
        </div>
    `;
    feedbackEl.classList.remove('hidden');
}

function resetToHome() {
    // Reset Timer Display style
    DOM.quiz.timerDisplay.parentElement.classList.add('text-blue-600', 'border-blue-100', 'bg-white/80', 'dark:text-blue-400', 'dark:border-blue-900/50', 'dark:bg-slate-800/80');
    DOM.quiz.timerDisplay.parentElement.classList.remove('text-red-600', 'border-red-200', 'bg-red-50', 'dark:text-red-400', 'dark:border-red-900/50', 'dark:bg-red-900/20', 'animate-pulse');
    const svg = DOM.quiz.timerDisplay.parentElement.querySelector('svg');
    svg.classList.add('text-blue-500');
    svg.classList.remove('text-red-500');

    // Reset Motivational Feedback
    DOM.result.motivationalFeedback.classList.add('hidden');

    // Reset Score Circle
    DOM.result.scoreCircle.style.strokeDashoffset = 289;

    // Reset Submit Button
    DOM.quiz.submitBtn.disabled = false;

    // Ensure Modal is hidden completely
    hideConfirmModal();

    // Reset state
    state.questionCount = null;
    state.isTestActive = false;
    state.isCheat = false;
    DOM.quiz.progressBar.style.width = `0%`; // Reset progress bar

    // Refresh PB and History UI on Home
    displayPersonalBestOnHome();
    renderHistory();

    switchScreen('home');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
