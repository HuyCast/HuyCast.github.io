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
    isLearningMode: false,
    customQuestions: null,

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
        learningModeToggle: document.getElementById('learning-mode-toggle'),
        importText: document.getElementById('import-text'),

        loadSampleBtn: document.getElementById('load-sample-btn'),
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
    if(DOM.home.learningModeToggle) DOM.home.learningModeToggle.addEventListener('change', (e) => state.isLearningMode = e.target.checked);
    DOM.home.previewBtn.addEventListener('click', openQuizEditor);

    if (DOM.home.loadSampleBtn) DOM.home.loadSampleBtn.addEventListener('click', loadSampleQuestions);
    DOM.home.importText.addEventListener('input', () => {
        if (state.currentQuizTitle !== 'Unnamed Quiz') {
            state.currentQuizTitle = 'Unnamed Quiz';
            displayPersonalBestOnHome();
            renderHistory();
        }
        validateImportArea();
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



    // Load PB, History, and Quiz Library
    loadPersonalBest();
    loadHistory();
    loadQuizLibrary();

    // Setup History Events
    DOM.home.historySortSelect.addEventListener('change', renderHistory);
    DOM.home.clearHistoryBtn.addEventListener('click', clearHistory);

    renderHistory();
    validateImportArea(); // Initial validation check
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

function loadQuizLibrary() {
    try {
        const stored = localStorage.getItem('quizLibrary');
        if (stored) {
            state.quizLibrary = JSON.parse(stored);
        } else {
            state.quizLibrary = [];
        }
        
        const DEFAULT_QUIZ_PAYLOAD = "NG\u00c2N H\u00c0NG \u0110\u1ec0 THI L\u1eacP TR\u00ccNH C\u0102N B\u1ea2N (THAM KH\u1ea2O)\n\nN\u1ed9i dung 1: C\u00e1c th\u00e0nh ph\u1ea7n c\u01a1 b\u1ea3n, ki\u1ec3u d\u1eef li\u1ec7u c\u01a1 b\u1ea3n, c\u00e2u l\u1ec7nh\n\nC\u00e2u 1. C\u00e1c khai b\u00e1o sau \u0111\u00e2y, khai b\u00e1o n\u00e0o sai quy c\u00e1ch?\n/a. #include<io.h> b. #include<stdlib.h> c. #include<stdio.h> d. #include<conio.h> [cite: 3, 4, 5, 6]\n\nC\u00e2u 2. \u0110\u1ec3 ti\u1ebfp t\u1ee5c v\u00f2ng l\u1eb7p m\u00e0 kh\u00f4ng c\u1ea7n th\u1ef1c hi\u1ec7n \u0111\u1ebfn cu\u1ed1i, ta s\u1eed d\u1ee5ng c\u00e2u l\u1ec7nh:\na. break b. switch /c. continue d. if [cite: 7, 8, 9, 46]\n\nC\u00e2u 3. S\u1eed d\u1ee5ng \u00e9p ki\u1ec3u n\u00e0o l\u00e0 \u0111\u00fang v\u1edbi x l\u00e0 ki\u1ec3u float v\u00e0 n l\u00e0 ki\u1ec3u int?\n/a. x = (float)n + 2; b. x = tast)n + 2; c. x = float(n + 2) d. x = n + (float) 2; [cite: 10, 11, 12, 13]\n\nC\u00e2u 4. Ch\u01b0\u01a1ng tr\u00ecnh n\u00e0y s\u1ebd k\u1ebft xu\u1ea5t ra k\u1ebft qu\u1ea3 n\u00e0o?\nvoid main ()\n{\n    int x = 15, y = 28;\n    printf (\"\\n%d\", x, y);\n}\n/a. 15 b. 28 c. 15 28 d. Kh\u00f4ng c\u00f3 k\u1ebft qu\u1ea3 n\u00e0o tr\u00ean \u0111\u00e2y l\u00e0 \u0111\u00fang. [cite: 15, 16, 17, 18, 19, 21, 22, 23, 24]\n\nC\u00e2u 5. K\u1ebft qu\u1ea3 xu\u1ea5t ra c\u1ee7a ch\u01b0\u01a1ng tr\u00ecnh n\u00e0y l\u00e0 g\u00ec?\nvoid main()\n{\n    int a=b=c=10;\n    a=b=c=50;\n    printf(\"\\n%d %d %d\", a, b, c);\n}\na. 50 50 50 b. 10 10 10 c. Bi\u00ean d\u1ecbch \u0111\u01b0\u1ee3c, l\u1ed7i khi th\u1ef1c thi /d. B\u1ecb l\u1ed7i khi bi\u00ean d\u1ecbch [cite: 25, 26, 27, 28, 29, 31, 32, 33, 34]\n\nC\u00e2u 6. Khai b\u00e1o sau \u0111\u00e2y chi\u1ebfm bao nhi\u00eau byte trong b\u1ed9 nh\u1edb?\nfloat a, b;\na. 1 /b. 8 c. 4 d. 16 [cite: 35, 36, 37, 38, 39]\n\nC\u00e2u 7. C\u00e1c t\u00ean do ng\u01b0\u1eddi d\u00f9ng \u0111\u1eb7t sau \u0111\u00e2y, t\u00ean n\u00e0o \u0111\u1eb7t sai quy c\u00e1ch?\na. index b. big /c. 123abc d. ijk [cite: 40, 41, 42, 43]\n\nC\u00e2u 8. \u0110\u1ec3 tho\u00e1t kh\u1ecfi v\u00f2ng l\u1eb7p gi\u1eefa ch\u1eebng, ta s\u1eed d\u1ee5ng c\u00e2u l\u1ec7nh:\na. continue b. exit /c. break d. stop [cite: 44, 46, 47, 8, 48]\n\nC\u00e2u 9. C quy \u0111\u1ecbnh k\u00edch th\u01b0\u1edbc c\u1ee7a ki\u1ec3u char l\u00e0 bao nhi\u00eau byte?\n/a. 1 b. 2 c. 4 d. T\u1ea5t c\u1ea3 \u0111\u1ec1u sai [cite: 49, 50, 51, 52, 80]\n\nC\u00e2u 10. Cho bi\u1ebft k\u1ebft qu\u1ea3 tr\u00ean m\u00e0n h\u00ecnh c\u1ee7a ch\u01b0\u01a1ng tr\u00ecnh sau:\n#include<stdio.h>\nint main() {\n    int s, i, j;\n    s = 0;\n    for (i=1; i<=5; i++)\n        for (j=1; j<=6; j++)\n            s = s + 2;\n    printf(\"%d\", s);\n    return 0;\n}\na. 13 b. 26 c. 32 /d. 60 [cite: 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 64, 65, 66]\n\nC\u00e2u 11. Cho bi\u1ebft k\u1ebft qu\u1ea3 tr\u00ean m\u00e0n h\u00ecnh c\u1ee7a \u0111o\u1ea1n ch\u01b0\u01a1ng tr\u00ecnh:\n#include<stdio.h>\nint main() {\n    int n = 10;\n    while (n >= n) n--;\n    printf(\"%d\", n);\n    return 0;\n}\na. -1 b. 1 c. 10 /d. L\u1eb7p v\u00f4 t\u1eadn [cite: 67, 68, 69, 70, 71, 72, 75, 76, 77, 78]\n\nC\u00e2u 12. C quy \u0111\u1ecbnh k\u00edch th\u01b0\u1edbc c\u1ee7a ki\u1ec3u char l\u00e0 bao nhi\u00eau?\n/a. 1 b. 2 c. 4 d. T\u1ea5t c\u1ea3 \u0111\u1ec1u sai [cite: 78, 79, 80, 81, 82]\n\nC\u00e2u 13. Cho c\u00e1c khai b\u00e1o bi\u1ebfn nh\u01b0 d\u01b0\u1edbi \u0111\u00e2y, nh\u1eefng d\u00f2ng n\u00e0o c\u00f3 t\u00ean bi\u1ebfn \u0111\u1eb7t \u0111\u00fang quy c\u00e1ch?\n(1) int count;\n(2) int Count;\n(3) char 12A1;\n(4) char While;\n(5) char email@;\n(6) float _max;\n(7) float a+b;\n(8) float struct;\na. (4) (6)-(8) b. (1)-(2)-(5)-(6)-(8) c. (1)-(3)-(5)-(7) /d. (1)-(2)-(6) [cite: 83, 84, 85, 86, 88, 89, 91, 92, 94, 95, 97, 98, 100, 101, 103, 104, 106, 107, 109, 110, 111]\n\nC\u00e2u 14. Cho ch\u01b0\u01a1ng tr\u00ecnh sau, c\u1ea5u tr\u00fac l\u1ef1a ch\u1ecdn (switch t\u1eeb d\u00f2ng 6 \u0111\u1ebfn d\u00f2ng 12) \u0111\u00e3 \u0111\u01b0\u1ee3c vi\u1ebft t\u1ed1t ch\u01b0a?\n#include <stdio.h>\nint main () {\n    float num1, num2;\n    char op;\n    printf (\"Nhap vao mot bieu thuc: \");\n    scanf (\"%f %c %f\", &num1, &op, &num2);\n    switch (op) {\n        case '+': printf (\"%.2f\\n\", num1+num2); break;\n        case '-': printf (\"%.2f\\n\", num1-num2); break;\n        case '*': printf (\"%.2f\\n\", num1*num2); break;\n        case '/': printf (\"%.2f\\n\", num1/num2); break;\n    }\n    return 0;\n}\na. R\u1ea5t ho\u00e0n h\u1ea3o /b. Ch\u01b0a t\u1ed1t v\u00ec thi\u1ebfu tr\u01b0\u1eddng h\u1ee3p default c. Ch\u01b0a t\u1ed1t v\u00ec thi\u1ebfu c\u00e2u l\u1ec7nh break d. Ch\u01b0a t\u1ed1t v\u00ec thi\u1ebfu tr\u01b0\u1eddng h\u1ee3p default v\u00e0 ki\u1ec3m tra chia cho 0 [cite: 112, 113, 114, 115, 117]\n\nC\u00e2u 15. \u0110\u1ecbnh d\u1ea1ng n\u00e0o sau \u0111\u00e2y d\u00f9ng \u0111\u1ec3 hi\u1ec3n th\u1ecb s\u1ed1 nguy\u00ean h\u1ec7 16?\na. %d b. %i /c. %x d. %u [cite: 118, 121, 123, 124, 126]\n\nC\u00e2u 16. Gi\u00e1 tr\u1ecb cho bi\u1ec3u th\u1ee9c 5 > 1 l\u00e0 bao nhi\u00eau?\n/a. 1 b. -1 c. 0 d. T\u1ea5t c\u1ea3 \u0111\u1ec1u sai [cite: 125, 127, 128, 129]\n\nC\u00e2u 17. Trong C, bi\u1ec3u th\u1ee9c 5/10*10 c\u00f3 gi\u00e1 tr\u1ecb b\u1eb1ng bao nhi\u00eau?\n/a. 0 b. 5 c. 10 d. m\u1ed9t gi\u00e1 tr\u1ecb kh\u00e1c [cite: 130, 131, 132, 133, 134]\n\nC\u00e2u 18. V\u00f2ng l\u1eb7p n\u00e0o trong C s\u1ebd k\u1ebft th\u00fac khi \u0111i\u1ec1u ki\u1ec7n l\u1eb7p l\u00e0 sai?\n/a. for b. do...while c. while d. T\u1ea5t c\u1ea3 \u0111\u1ec1u sai [cite: 135, 136, 137, 141, 142]\n\nC\u00e2u 19. K\u1ebft qu\u1ea3 c\u1ee7a ch\u01b0\u01a1ng tr\u00ecnh sau l\u00e0 g\u00ec?\n#include <stdio.h>\nint main () {\n    char c = 95;\n    c += 10;\n    printf(\"%d\", c);\n    return 0;\n}\n/a. 105 b. B\u00e1o l\u1ed7i khi bi\u00ean d\u1ecbch c. i d. T\u1ea5t c\u1ea3 c\u00e1c c\u00e2u tr\u00ean \u0111\u1ec1u sai [cite: 138, 139, 140, 143, 144, 145, 146, 147, 148, 149, 152]\n\nC\u00e2u 20. \u0110\u1ecbnh d\u1ea1ng n\u00e0o sau \u0111\u00e2y d\u00f9ng \u0111\u1ec3 in ra m\u1ed9t chu\u1ed7i k\u00fd t\u1ef1?\n/a. \"%s\" b. \"%f\" c. \"%c\" d. \"%x\" [cite: 150, 151, 153, 154, 155]\n\nC\u00e2u 21. Cho bi\u1ebft th\u1ee9 t\u1ef1 th\u1ef1c hi\u1ec7n c\u00e1c ph\u00e9p to\u00e1n trong C:\na. + - * / b. * - / + /c. * / + - d. / + * - [cite: 156, 157, 158, 159, 160]\n\nN\u1ed9i dung 2: Ki\u1ec3u m\u1ea3ng\n\nC\u00e2u 22. K\u1ebft xu\u1ea5t c\u1ee7a ch\u01b0\u01a1ng tr\u00ecnh n\u00e0y?\nvoid main()\n{\n    int x[] = {10, 20, 30, 40, 50};\n    printf (\"\\n%d %d %d %d %d\", x[4], 3[x], x[2], 1[x], x[0]);\n}\na. X\u1ea3y ra l\u1ed7i /b. 50 40 30 20 10 c. 10 20 30 40 50 d. Kh\u00f4ng c\u00f3 k\u1ebft qu\u1ea3 n\u00e0o tr\u00ean \u0111\u00e2y l\u00e0 \u0111\u00fang [cite: 162, 163, 164, 166, 167, 168, 169, 170, 173]\n\nC\u00e2u 23. Trong C khi truy\u1ec1n m\u1ed9t m\u1ea3ng nh\u01b0 l\u00e0 m\u1ed9t tham s\u1ed1 \u0111\u1ea7u v\u00e0o c\u1ee7a m\u1ed9t h\u00e0m th\u00ec tham s\u1ed1 \u0111\u01b0\u1ee3c truy\u1ec1n th\u1ef1c s\u1ef1 l\u00e0 g\u00ec?\na. Gi\u00e1 tr\u1ecb c\u1ee7a c\u00e1c ph\u1ea7n t\u1eed trong m\u1ea3ng b. Ph\u1ea7n t\u1eed \u0111\u1ea7u ti\u00ean c\u1ee7a m\u1ea3ng /c. \u0110\u1ecba ch\u1ec9 c\u01a1 s\u1edf c\u1ee7a m\u1ea3ng d. \u0110\u1ecba ch\u1ec9 c\u1ee7a ph\u1ea7n t\u1eed cu\u1ed1i c\u00f9ng c\u1ee7a m\u1ea3ng [cite: 171, 172, 173, 174, 176]\n\nC\u00e2u 24. \u0110i\u1ec1u g\u00ec s\u1ebd x\u1ea3y ra trong m\u1ed9t ch\u01b0\u01a1ng tr\u00ecnh C n\u1ebfu g\u00e1n m\u1ed9t gi\u00e1 tr\u1ecb cho m\u1ed9t ph\u1ea7n t\u1eed c\u1ee7a m\u1ea3ng m\u00e0 ch\u1ec9 s\u1ed1 v\u01b0\u1ee3t qu\u00e1 k\u00edch th\u01b0\u1edbc c\u1ee7a m\u1ea3ng?\na. Ph\u1ea7n t\u1eed s\u1ebd \u0111\u01b0\u1ee3c \u0111\u1eb7t gi\u00e1 tr\u1ecb l\u00e0 0 b. Tr\u00ecnh bi\u00ean d\u1ecbch s\u1ebd t\u1ea1o ra m\u1ed9t th\u00f4ng b\u00e1o l\u1ed7i /c. Ch\u01b0\u01a1ng tr\u00ecnh c\u00f3 th\u1ec3 b\u1ecb l\u1ed7i th\u1ef1c thi ho\u1eb7c ghi \u0111\u00e8 d\u1eef li\u1ec7u quan tr\u1ecdng d. K\u00edch th\u01b0\u1edbc c\u1ee7a m\u1ea3ng ph\u1ea3i \u0111\u01b0\u1ee3c ph\u00e1t tri\u1ec3n ph\u00f9 h\u1ee3p [cite: 175, 177, 178, 179, 180, 182]\n\nC\u00e2u 25. Gi\u1ea3 s\u1eed ma tr\u1eadn A = {{11, -12, 45, 27}, {39, 10, 7, 6}, {21, -23, 0, 84}, {56, -98, 100, 73}}. X\u00e1c \u0111\u1ecbnh ma tr\u1eadn A sau khi ch\u1ea1y \u0111o\u1ea1n ch\u01b0\u01a1ng tr\u00ecnh sau:\nint t;\nfor (int i=0; i<N; i++) {\n    t = a[i][i];\n    a[i][i] = a[i][N-i-1];\n    a[i][N-i-1] = t;\n}\na. A = {{11, -12, 45, 27}, {39, 10, 7, 6}, {21, 23, 0, 84}, {56, -98, 100, 73}}\n/b. A = {{27, -12, 45, 11}, {39, 7, 10, 6}, {21, 0, -23, 84}, {73, -98, 100, 56}}\nc. A = {{11, 39, 21, 56}, {-12, 10, -23, -98}, {45, 7, 0, 100}, {27, 6, 84, 56}}\nd. A = {{27, 39, 21, 73}, {-12, 7, 0, -98}, {45, 10, -23, 100}, {11, 6, 84, 56}} [cite: 181, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195]\n\nC\u00e2u 26. X\u00e1c \u0111\u1ecbnh nh\u1eefng ph\u00e1t bi\u1ec3u \u0111\u00fang v\u1ec1 m\u1ea3ng m\u1ed9t chi\u1ec1u:\n1. M\u1ea3ng l\u00e0 t\u1eadp h\u1ee3p c\u00e1c ph\u1ea7n t\u1eed c\u00f3 c\u00f9ng m\u1ed9t ki\u1ec3u d\u1eef li\u1ec7u.\n2. M\u1ea3ng l\u00e0 t\u1eadp h\u1ee3p c\u00e1c ph\u1ea7n t\u1eed c\u00f3 c\u00e1c ki\u1ec3u d\u1eef li\u1ec7u kh\u00e1c nhau.\n3. C\u00e1c ph\u1ea7n t\u1eed trong m\u1ea3ng \u0111\u01b0\u1ee3c l\u01b0u tr\u1eef n\u1ed1i ti\u1ebfp nhau trong b\u1ed9 nh\u1edb (ch\u1ec9 s\u1ed1 t\u1eeb 1 \u0111\u1ebfn N).\n4. C\u00e1c ph\u1ea7n t\u1eed trong m\u1ea3ng \u0111\u01b0\u1ee3c l\u01b0u tr\u1eef n\u1ed1i ti\u1ebfp nhau trong b\u1ed9 nh\u1edb (ch\u1ec9 s\u1ed1 t\u1eeb 0 \u0111\u1ebfn N-1).\n5. K\u00edch th\u01b0\u1edbc v\u00f9ng nh\u1edb \u0111\u01b0\u1ee3c c\u1ea5p ph\u00e1t cho m\u1ea3ng c\u00f3 N ph\u1ea7n t\u1eed l\u00e0: N.\n6. K\u00edch th\u01b0\u1edbc v\u00f9ng nh\u1edb \u0111\u01b0\u1ee3c c\u1ea5p ph\u00e1t cho m\u1ea3ng c\u00f3 N ph\u1ea7n t\u1eed l\u00e0: N * sizeof(ki\u1ec3u ph\u1ea7n t\u1eed).\na. 1, 3, 5 b. 2, 3, 6 c. 2, 4, 5 /d. 1, 4, 6 [cite: 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 210]\n\nC\u00e2u 27. X\u00e9t \u0111o\u1ea1n ch\u01b0\u01a1ng tr\u00ecnh sau:\n#include<stdio.h>\nint main() {\n    int a[10], i, M=0, K=0;\n    for(i=0; i<10; i++) scanf(\"%d\", &a[i]);\n    for(i=0; i<10; i++)\n        if(a[i] > 0) {\n            K++;\n            M = M + a[i];\n        }\n    if(K > 0) M = M / K;\n    return 0;\n}\nBi\u1ebfn M mang \u00fd ngh\u0129a g\u00ec?\na. Trung b\u00ecnh c\u1ed9ng c\u00e1c ph\u1ea7n t\u1eed trong m\u1ea3ng /b. Trung b\u00ecnh c\u1ed9ng c\u00e1c ph\u1ea7n t\u1eed d\u01b0\u01a1ng trong m\u1ea3ng c. T\u1ed5ng c\u00e1c ph\u1ea7n t\u1eed d\u01b0\u01a1ng trong m\u1ea3ng d. C\u1ea3 a, b, c \u0111\u1ec1u sai [cite: 209, 211, 212, 213, 214, 215, 216, 217, 218, 219, 221, 222, 224, 225, 226, 230, 231]\n\nC\u00e2u 28. K\u1ebft qu\u1ea3 n\u00e0o \u0111\u00fang khi th\u1ef1c hi\u1ec7n h\u00e0m FindX b\u00ean d\u01b0\u1edbi v\u1edbi a[] = {-3, 15, 15, -3}, n = 4, x = 15?\nint FindX(int a[], int n, int x)\n{\n    int i;\n    for (i = n - 1; i >= 0; i--) if (a[i] == x) return (i);\n    return (-1);\n}\na. -1 b. 1 /c. 2 d. 3 [cite: 232, 233, 234, 235, 236, 237, 239, 249, 250]\n\nC\u00e2u 29. K\u1ebft qu\u1ea3 \u0111o\u1ea1n ch\u01b0\u01a1ng tr\u00ecnh sau l\u00e0 g\u00ec?\n#include<stdio.h>\nint main() {\n    int i, a[] = {12, 10, 7, 8};\n    int max = a[0], vt = 0;\n    for (i = 0; i < 4; i++)\n        if (max < a[i]) {\n            max = a[i];\n            vt = i;\n        }\n    printf(\"%d\", vt);\n}\n/a. 0 b. 1 c. 2 d. m\u1ed9t k\u1ebft qu\u1ea3 kh\u00e1c [cite: 240, 241, 242, 243, 244, 245, 246, 247, 248, 251, 252, 253, 254]\n\nC\u00e2u 30. K\u1ebft qu\u1ea3 xu\u1ea5t hi\u1ec7n tr\u00ean m\u00e0n h\u00ecnh c\u1ee7a \u0111o\u1ea1n ch\u01b0\u01a1ng tr\u00ecnh sau l\u00e0 g\u00ec?\n#include <stdio.h>\nint main()\n{\n    int a[] = {10, 15, 5, 12, 18, 20};\n    int n = 5;\n    for (int i = n; i >= 0; i--) if (a[i] % 2 != 0)\n        printf(\"%5d\", a[i]);\n    return 0;\n}\na. 10 15 5 12 18 20 b. 10 12 18 20 c. 20 18 12 10 /d. 5 15 [cite: 255, 256, 258, 261, 263, 264, 265, 267, 268, 269, 270, 272]\n\nC\u00e2u 31. Cho \u0111o\u1ea1n ch\u01b0\u01a1ng tr\u00ecnh sau:\nint j = n - 1;\nfor(int i = 0; i < n; i++)\n    if (a[i] < a[j]) {\n        int Tam = a[i];\n        a[i] = a[j];\n        a[j] = Tam;\n    }\nCho bi\u1ebft ngay sau khi th\u1ef1c hi\u1ec7n \u0111o\u1ea1n ch\u01b0\u01a1ng tr\u00ecnh tr\u00ean th\u00ec:\n/a. M\u1ea3ng a c\u00f3 a[n-1] l\u00e0 ph\u1ea7n t\u1eed nh\u1ecf nh\u1ea5t b. M\u1ea3ng a c\u00f3 th\u1ee9 t\u1ef1 gi\u1ea3m d\u1ea7n c. M\u1ea3ng a c\u00f3 a[n-1] l\u00e0 ph\u1ea7n t\u1eed l\u1edbn nh\u1ea5t d. M\u1ea3ng a c\u00f3 th\u1ee9 t\u1ef1 t\u0103ng d\u1ea7n [cite: 271, 273, 274, 275, 277, 278, 279, 281, 282, 283, 286]\n\nN\u1ed9i dung 3: Ki\u1ec3u chu\u1ed7i k\u00fd t\u1ef1\n\nC\u00e2u 32. C\u00e1c h\u00e0m c\u1ee7a ki\u1ec3u chu\u1ed7i n\u00e0o sau \u0111\u00e2y l\u00e0 kh\u00f4ng h\u1ee3p l\u1ec7?\na. strcat /b. strcut c. strnset d. strlen [cite: 287, 288, 289, 290, 291]\n\nC\u00e2u 33. H\u00e0m strcpy (s1, s2) c\u00f3 ngh\u0129a l\u00e0 g\u00ec?\na. Ch\u00e9p s1 v\u00e0o s2 /b. Ch\u00e9p s2 v\u00e0o s1 c. Gh\u00e9p s2 v\u00e0o s1 d. Kh\u00f4ng c\u00f3 k\u1ebft qu\u1ea3 n\u00e0o tr\u00ean \u0111\u00e2y l\u00e0 \u0111\u00fang [cite: 292, 293, 294, 295, 296]\n\nC\u00e2u 34. K\u1ebft qu\u1ea3 xu\u1ea5t ra l\u00e0 g\u00ec?\nvoid main ()\n{\n    char a[] = \"CANTHO\";\n    a++;\n    printf(\"\\n %s\", a);\n}\n/a. C\u00f3 l\u1ed7i x\u1ea3y ra. b. CANTHO c. ANTHO d. Kh\u00f4ng c\u00f3 k\u1ebft qu\u1ea3 n\u00e0o tr\u00ean \u0111\u00e2y l\u00e0 \u0111\u00fang [cite: 297, 298, 299, 300, 301, 303, 304, 306, 307]\n\nC\u00e2u 35. K\u00fd t\u1ef1 n\u00e0o sau \u0111\u00e2y \u0111\u01b0\u1ee3c s\u1eed d\u1ee5ng nh\u01b0 l\u00e0 k\u00fd t\u1ef1 k\u1ebft th\u00fac chu\u1ed7i?\na. 0 /b. '\\0' c. /0 d. Kh\u00f4ng c\u00f3 k\u1ebft qu\u1ea3 n\u00e0o tr\u00ean \u0111\u00e2y l\u00e0 \u0111\u00fang [cite: 308, 309, 310, 407]\n\nC\u00e2u 36. T\u1eadp tin ti\u00eau \u0111\u1ec1 (header file) c\u1ea7n thi\u1ebft cho h\u00e0m strcpy()?\n/a. string.h b. strings.h c. files.h d. stdio.h [cite: 312, 313, 314, 315, 316, 324]\n\nC\u00e2u 37. H\u00e0m n\u00e0o d\u01b0\u1edbi \u0111\u00e2y \u0111\u01b0\u1ee3c s\u1eed d\u1ee5ng \u0111\u1ec3 t\u00ecm xu\u1ea5t hi\u1ec7n \u0111\u1ea7u ti\u00ean c\u1ee7a m\u1ed9t chu\u1ed7i trong m\u1ed9t chu\u1ed7i kh\u00e1c?\na. strchr() b. strrchr() /c. strstr() d. strnset() [cite: 317, 318, 320, 321, 322]\n\nC\u00e2u 38. \u0110\u1ec3 s\u1eed d\u1ee5ng \u0111\u01b0\u1ee3c h\u00e0m toupper(char c) ta ph\u1ea3i khai b\u00e1o s\u1eed d\u1ee5ng th\u01b0 vi\u1ec7n n\u00e0o?\na. string.h b. stdio.h /c. ctype.h d. conio.h [cite: 323, 324, 326, 327, 328]\n\nC\u00e2u 39. K\u1ebft qu\u1ea3 tr\u1ea3 v\u1ec1 c\u1ee7a h\u00e0m stricmp(\"abc\",\"ABC\") b\u1eb1ng bao nhi\u00eau?\n/a. 0 b. 32 c. -1 d. 1 [cite: 329, 330, 331, 332]\n\nC\u00e2u 40. \u0110\u1ec3 khai b\u00e1o m\u1ed9t bi\u1ebfn ki\u1ec3u chu\u1ed7i ch\u1ee9a gi\u00e1 tr\u1ecb l\u00e0 \u201chello\u201d, ta c\u00f3 th\u1ec3 th\u1ef1c hi\u1ec7n khai b\u00e1o n\u00e0o?\na. char s[6] = {'h','e','l','l','o','\\0'}; b. char s[6] = \"hello\"; c. char s[] = \"hello\"; /d. C\u1ea3 a, b, c \u0111\u1ec1u \u0111\u00fang [cite: 333, 335, 336, 337]\n\nC\u00e2u 41. Cho \u0111o\u1ea1n ch\u01b0\u01a1ng tr\u00ecnh:\nchar *s1 = strdup(\"Hello\");\nchar *s2 = strdup(\"World\");\ns1 = s2;\nprintf(\"s1=%s\\n\", s1);\nstrcpy(s2, \"Hi\");\nprintf(\"s1=%s\\n\", s1);\nK\u1ebft qu\u1ea3 tr\u00ean m\u00e0n h\u00ecnh l\u00e0:\na. s1=Hello, s1=World b. s1=World, s1=World /c. s1=World, s1=Hi d. s1=Hello, s1=Hi [cite: 338, 340, 341, 342, 343, 344, 345, 346, 347, 351, 352, 353]\n\nC\u00e2u 42. Gi\u00e1 tr\u1ecb h\u1eb1ng chu\u1ed7i D:\\Data \u0111\u01b0\u1ee3c vi\u1ebft trong C:\na. \"D:\\Data\" b. \"D:\\Data\" /c. \"D:\\\\Data\" d. T\u1ea5t c\u1ea3 \u0111\u1ec1u sai [cite: 348, 349, 350, 355]\n\nC\u00e2u 43. K\u1ebft qu\u1ea3 tr\u00ean m\u00e0n h\u00ecnh c\u1ee7a ch\u01b0\u01a1ng tr\u00ecnh sau l\u00e0 g\u00ec?\n#include<stdio.h>\n#include<string.h>\nint main() {\n    char s[30] = \"ABCDEF\";\n    int n = strlen(s), i;\n    for(i=0; i<n/2; i++) s[i] = s[n-i-1];\n    puts(s);\n    return 0;\n}\na. ABCDEF /b. FEDDEF c. FEDCBA d. DEFABC [cite: 355, 356, 357, 358, 359, 360, 361, 362, 363, 366, 367, 368]\n\nC\u00e2u 44. Cho bi\u1ebft k\u1ebft qu\u1ea3 tr\u00ean m\u00e0n h\u00ecnh c\u1ee7a ch\u01b0\u01a1ng tr\u00ecnh sau:\n#include<stdio.h>\n#include<ctype.h>\n#include<string.h>\nint main() {\n    char S[30] = \"abCDe\";\n    for(int i=0; i<strlen(S); i++) S[i] = tolower(S[i]);\n    puts(S);\n    return 0;\n}\n/a. abcde b. ABCDE c. abCDe d. AbcdE [cite: 369, 370, 371, 372, 373, 374, 375, 377, 380, 381, 382]\n\nC\u00e2u 45. H\u00e3y x\u00e1c \u0111\u1ecbnh k\u1ebft qu\u1ea3 c\u1ee7a ch\u01b0\u01a1ng tr\u00ecnh sau:\n#include <stdio.h>\n#include <string.h>\nint main () {\n    char str1[] = \"Hoc sinh hoc mon Sinh\";\n    char str2[20];\n    strncpy(str2, strstr(strlwr(str1), \"hoc\"), 8);\n    str2[8] = '\\0';\n    printf (\"str2: %s\\n\", str2);\n    return 0;\n}\na. str2: Hoc sinh b. str2: hoc sinh /c. str2: hoc sinh d. str2: hoc mon Sinh [cite: 383, 384, 385, 386, 387, 388, 390, 391, 392, 393, 394]\n\nC\u00e2u 46. \u0110\u1ec3 nh\u1eadp t\u1eeb b\u00e0n ph\u00edm chu\u1ed7i \u201cDai hoc Can Tho\u201d v\u00e0o bi\u1ebfn chu\u1ed7i str, ta c\u00f3 th\u1ec3 d\u00f9ng h\u00e0m:\na. puts(str) b. scanf(\"%s\", str) c. scanf(\"%c\", str) /d. gets(str) [cite: 395, 396, 397, 398, 399, 403]\n\nC\u00e2u 47. Trong C, chu\u1ed7i k\u00fd t\u1ef1 k\u1ebft th\u00fac b\u1eb1ng k\u00fd t\u1ef1 n\u00e0o?\na. '\\n' b. '\\t' /c. '\\0' d. '\\b' [cite: 400, 401, 402, 404, 405, 407]\n\nC\u00e2u 48. H\u00e0m n\u00e0o sau \u0111\u00e2y d\u00f9ng \u0111\u1ec3 in m\u1ed9t chu\u1ed7i k\u00fd t\u1ef1 ra m\u00e0n h\u00ecnh?\na. get() b. fputs() /c. puts() d. putc() [cite: 406, 408, 409, 410, 412]\n\nC\u00e2u 49. Ch\u01b0\u01a1ng tr\u00ecnh sau s\u1ebd in ra k\u1ebft qu\u1ea3 g\u00ec?\nvoid main() {\n    char arr[11] = \"Lap trinh can ban\";\n    printf(\"%s\", arr);\n}\n/a. Lap trinh b. Lap trinh can ban c. L\u1ed7i th\u1ef1c thi d. T\u1ea5t c\u1ea3 \u0111\u1ec1u sai [cite: 411, 413, 414, 415, 417, 419, 420]\n\nC\u00e2u 50. Cho bi\u1ebft k\u1ebft qu\u1ea3 th\u1ef1c hi\u1ec7n c\u1ee7a ch\u01b0\u01a1ng tr\u00ecnh: printf(\"%d\\n\", strlen(\"123456\"));\n/a. 6 b. 7 c. L\u1ed7i bi\u00ean d\u1ecbch d. T\u1ea5t c\u1ea3 \u0111\u1ec1u sai [cite: 421, 422, 423, 424, 426, 430, 431, 432]\n\nN\u1ed9i dung 4: Ki\u1ec3u c\u1ea5u tr\u00fac\n\nC\u00e2u 51. \u00dd ngh\u0129a c\u1ee7a to\u00e1n t\u1eed m\u0169i t\u00ean trong a->b l\u00e0?\n/a. (*a).b b. a.(*b) c. a.b d. Kh\u00f4ng c\u00f3 k\u1ebft qu\u1ea3 n\u00e0o tr\u00ean \u0111\u00e2y l\u00e0 \u0111\u00fang [cite: 434, 435, 436, 437, 438]\n\nC\u00e2u 52. K\u00edch th\u01b0\u1edbc c\u1ee7a ki\u1ec3u c\u1ea5u tr\u00fac sau \u0111\u00e2y l\u00e0 bao nhi\u00eau byte?\nstruct point { int x; int y, z; };\n/a. 6 (v\u1edbi int 2 byte) b. 2 c. 4 d. Kh\u00f4ng c\u00f3 k\u1ebft qu\u1ea3 n\u00e0o \u0111\u00fang [cite: 440, 441, 442, 443, 444]\n\nC\u00e2u 53. Cho nhanvien nv; \u0111\u1ec3 truy xu\u1ea5t th\u00e0nh ph\u1ea7n hoten ta d\u00f9ng:\na. nhanvien.hoten /b. nv.hoten c. nv->hoten d. Kh\u00f4ng c\u00f3 k\u1ebft qu\u1ea3 \u0111\u00fang [cite: 445, 452, 453, 454, 457]\n\nC\u00e2u 54. Gi\u1ea3 s\u1eed struct Diem2D *Diem1; c\u00e1ch vi\u1ebft n\u00e0o sau \u0111\u00e2y l\u00e0 t\u01b0\u01a1ng \u0111\u01b0\u01a1ng?\na. Diem1.X v\u00e0 Diem1->X b. (*Diem1).X v\u00e0 Diem1.X c. *Diem1.X v\u00e0 Diem1->X /d. (*Diem1).X v\u00e0 Diem1->X [cite: 455, 456, 458, 459, 460, 465, 466]\n\nC\u00e2u 55. \u0110o\u1ea1n l\u1ec7nh khai b\u00e1o ki\u1ec3u c\u1ea5u tr\u00fac d\u00f9ng t\u1eeb kh\u00f3a typedef th\u01b0\u1eddng \u0111\u1eb7t \u1edf \u0111\u00e2u?\n/a. \u0110\u1eb7t ngo\u00e0i h\u00e0m main() b. \u0110\u1eb7t trong h\u00e0m main() c. \u0110\u1eb7t \u1edf v\u1ecb tr\u00ed b\u1ea5t k\u1ef3 d. \u0110\u1eb7t trong ch\u01b0\u01a1ng tr\u00ecnh con [cite: 461, 462, 463, 464, 467, 468, 469]\n\nC\u00e2u 56. \u0110\u1ec3 khai b\u00e1o m\u1ed9t bi\u1ebfn c\u00f3 ki\u1ec3u ph\u00e2n s\u1ed1 (t\u1eed v\u00e0 m\u1eabu), ta d\u00f9ng khai b\u00e1o n\u00e0o?\na. C\u00e1ch 1 b. C\u00e1ch 2 v\u00e0 3 c. C\u00e1ch 1 v\u00e0 2 /d. C\u1ea3 3 c\u00e1ch [cite: 470, 471, 472, 473, 474, 480, 484, 485, 486]\n\nC\u00e2u 57. \u0110\u1ec3 truy xu\u1ea5t DiemTB c\u1ee7a h\u1ecdc vi\u00ean th\u1ee9 2 (ds[1]):\na. ds[1]->DiemTB b. &(ds[1]->DiemTB) c. (ds+2).DiemTB /d. ds[1].DiemTB [cite: 487, 489, 492, 493, 494, 495, 497, 498, 502]\n\nN\u1ed9i dung 5: Ki\u1ec3u con tr\u1ecf\n\nC\u00e2u 58. Cho c\u00e2u l\u1ec7nh int **x; c\u00f3 ngh\u0129a l\u00e0:\na. x l\u00e0 m\u1ed9t s\u1ed1 nguy\u00ean /b. x l\u00e0 m\u1ed9t con tr\u1ecf ch\u1ec9 \u0111\u1ebfn m\u1ed9t con tr\u1ecf kh\u00e1c c. x kh\u00f4ng ph\u1ea3i con tr\u1ecf d. Kh\u00f4ng c\u00f3 k\u1ebft qu\u1ea3 \u0111\u00fang [cite: 500, 501, 512, 513]\n\nC\u00e2u 59. H\u00e0m n\u00e0o s\u1ebd c\u1ea5p ph\u00e1t l\u1ea1i kh\u00f4ng gian b\u1ed9 nh\u1edb?\n/a. realloc() b. alloc() c. malloc() d. calloc() [cite: 503, 504, 514]\n\nC\u00e2u 60. Khai b\u00e1o sau \u0111\u00e2y c\u00f3 \u00fd ngh\u0129a l\u00e0 g\u00ec: int (*p)[20];\na. p l\u00e0 m\u1ed9t m\u1ea3ng con tr\u1ecf b. p l\u00e0 m\u1ed9t m\u1ea3ng c\u00f3 20 s\u1ed1 nguy\u00ean /c. p l\u00e0 m\u1ed9t con tr\u1ecf tr\u1ecf \u0111\u1ebfn m\u1ea3ng 20 s\u1ed1 nguy\u00ean d. p l\u00e0 m\u1ed9t h\u00e0m [cite: 505, 506, 508, 516]\n\nC\u00e2u 61. K\u1ebft h\u1ee3p hai l\u1ec7nh sau: char *p; p=(char*)malloc(200);\na. char p = *malloc(200); /b. char *p = (char*)malloc(200); c. char *p = (char)malloc(200); d. T\u1ea5t c\u1ea3 \u0111\u1ec1u sai [cite: 509, 510, 511, 517, 519]\n\nC\u00e2u 62. N\u1ebfu m\u1ed9t bi\u1ebfn l\u00e0 con tr\u1ecf tr\u1ecf \u0111\u1ebfn c\u1ea5u tr\u00fac, to\u00e1n t\u1eed n\u00e0o d\u00f9ng \u0111\u1ec3 truy xu\u1ea5t th\u00e0nh vi\u00ean?\na. . b. & c. * /d. -> [cite: 520, 521, 522, 523, 535]\n\nC\u00e2u 63. K\u1ebft qu\u1ea3 ch\u01b0\u01a1ng tr\u00ecnh: int *p; *p=10; printf(\"%d\",*p);\na. 10 b. 0 /c. L\u1ed7i th\u1ef1c thi do ch\u01b0a c\u1ea5p ph\u00e1t b\u1ed9 nh\u1edb d. C\u1ea3 3 \u0111\u1ec1u sai [cite: 524, 527, 528, 529, 530, 533, 537, 538, 539]\n\nC\u00e2u 64. K\u1ebft qu\u1ea3 ch\u01b0\u01a1ng tr\u00ecnh: int *p; p=(int*)malloc(2); *p=10; printf(\"%d\",*p);\n/a. 10 b. 0 c. B\u00e1o l\u1ed7i d. C\u1ea3 3 c\u00e2u \u0111\u1ec1u sai [cite: 540, 547, 548, 549, 550, 553, 554, 555]\n\nC\u00e2u 65. Nh\u1eadn x\u00e9t v\u1ec1 ch\u01b0\u01a1ng tr\u00ecnh s\u1eed d\u1ee5ng gets(str) v\u1edbi char *str ch\u01b0a c\u1ea5p ph\u00e1t:\na. Ho\u00e0n h\u1ea3o b. Thi\u1ebfu free(str) /c. L\u1ed7i nghi\u00eam tr\u1ecdng do ch\u01b0a c\u1ea5p ph\u00e1t b\u1ed9 nh\u1edb d. Sai c\u00fa ph\u00e1p [cite: 556, 559, 561, 567, 572]\n\nC\u00e2u 66. C\u00f3 th\u1ec3 truy xu\u1ea5t ph\u1ea7n t\u1eed th\u1ee9 i c\u1ee7a m\u1ea3ng a qua con tr\u1ecf p=a b\u1edfi:\na. &(p+i) /b. *(p+i) c. p+i d. p+&i [cite: 568, 569, 570, 573, 574, 575, 578]\n\nN\u1ed9i dung 6: Ki\u1ec3u t\u1eadp tin\n\nC\u00e2u 67. N\u1ebfu t\u1eadp tin ch\u1ee9a \u201cThanh pho Can Tho\\r\\n\" th\u00ec h\u00e0m fgets(s,...) s\u1ebd \u0111\u1ecdc v\u00e0o s:\na. Thanh pho Can Tho b. Thanh pho Can Tho\\r /c. Thanh pho Can Tho\\n\\0 d. T\u1ea5t c\u1ea3 \u0111\u1ec1u sai [cite: 580, 581, 583, 584, 586]\n\nC\u00e2u 68. \u0110\u1ecdc m\u1ed9t k\u00fd t\u1ef1 duy nh\u1ea5t t\u1eeb b\u00e0n ph\u00edm v\u1edbi h\u00e0m n\u00e0o?\na. printf() b. scanf() c. puts() /d. getchar() [cite: 585, 586, 590, 592]\n\nC\u00e2u 69. Trong l\u1ec7nh f = fopen(\"vanban.txt\", \"r\"); f ch\u1ec9 \u0111\u1ebfn g\u00ec?\na. K\u00fd t\u1ef1 \u0111\u1ea7u ti\u00ean b. T\u00ean t\u1eadp tin /c. M\u1ed9t c\u1ea5u tr\u00fac ch\u1ee9a th\u00f4ng tin qu\u1ea3n l\u00fd t\u1eadp tin d. N\u1ed9i dung t\u1eadp tin [cite: 587, 594, 596, 598, 599, 600]\n\nC\u00e2u 70. T\u1eeb kh\u00f3a quay v\u1ec1 t\u1eeb h\u00e0m \u0111\u01b0\u1ee3c g\u1ecdi l\u00e0?\na. switch b. goto c. go back /d. return [cite: 602, 603, 604, 605]\n\nC\u00e2u 71. Ch\u01b0\u01a1ng tr\u00ecnh g\u1ecdi main() \u0111\u1ec7 quy s\u1ebd in ra \"Hau Giang\" bao nhi\u00eau l\u1ea7n?\n/a. Kh\u00f4ng x\u00e1c \u0111\u1ecbnh (\u0111\u1ebfn khi tr\u00e0n stack) b. 32767 l\u1ea7n c. 65535 l\u1ea7n d. 1 l\u1ea7n [cite: 605, 606, 607, 609, 610, 612, 613, 615]\n\nC\u00e2u 72. Ch\u1ebf \u0111\u1ed9 n\u00e0o m\u1edf t\u1eadp tin v\u0103n b\u1ea3n \u0111\u1ec3 ghi v\u00e0 x\u00f3a n\u1ed9i dung c\u0169 n\u1ebfu \u0111\u00e3 t\u1ed3n t\u1ea1i?\na. wb /b. w c. a d. ab [cite: 614, 615, 616, 619, 635]\n\nC\u00e2u 73. \u00dd ngh\u0129a \u0111o\u1ea1n code m\u1edf f1(\"BaiHat.txt\",\"rt\") v\u00e0 f2(\"BaiCa.txt\",\"wt\") r\u1ed3i sao ch\u00e9p:\na. T\u1ea1o m\u1edbi f2 v\u00e0 ghi d\u1eef li\u1ec7u r\u00e1c b. X\u00f3a n\u1ed9i dung f1 /c. T\u1ea1o m\u1edbi f2 c\u00f3 n\u1ed9i dung gi\u1ed1ng f1 d. C\u1ea3 a, b \u0111\u1ec1u \u0111\u00fang [cite: 617, 621, 622, 623, 624, 625, 626, 627, 636, 637, 638, 640]\n\nC\u00e2u 74. Khi x\u00e2y d\u1ef1ng m\u1ed9t h\u00e0m th\u00ec lu\u00f4n lu\u00f4n ph\u1ea3i c\u00f3:\na. T\u00ean h\u00e0m b. Ki\u1ec3u tr\u1ea3 v\u1ec1 c. Tham s\u1ed1 /d. C\u1ea3 a v\u00e0 b \u0111\u1ec1u \u0111\u00fang [cite: 641, 642, 643, 644, 645]";
        const existingDeOnIndex = state.quizLibrary.findIndex(q => q.title === "Đề ôn lập trình CB.");
        if (existingDeOnIndex === -1) {
            state.quizLibrary.push({
                id: 'default-de-on-cb',
                title: 'Đề ôn lập trình CB.',
                content: DEFAULT_QUIZ_PAYLOAD,
                date: Date.now()
            });
        } else {
            state.quizLibrary[existingDeOnIndex].content = DEFAULT_QUIZ_PAYLOAD;
        }
        localStorage.setItem('quizLibrary', JSON.stringify(state.quizLibrary));

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
        validateImportArea(true);
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
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Question ${index + 1} (${q.type === 'matching' ? 'Matching' : 'Multiple Choice'})</label>
                    <textarea class="edit-q-text w-full rounded border border-slate-300 dark:border-slate-600 p-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500" rows="2">${q.text}</textarea>
                </div>
        `;
        
        if (q.type === 'matching') {
            html += `<div class="space-y-3 mt-2">`;
            q.pairs.forEach((p, pIndex) => {
                html += `
                    <div class="flex flex-col sm:flex-row items-center gap-2">
                        <input type="text" class="edit-q-match-left flex-1 w-full rounded border border-slate-300 dark:border-slate-600 p-1.5 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500" data-pair-idx="${pIndex}" value="${p.leftText}">
                        <span class="text-slate-400 font-bold hidden sm:block">::</span>
                        <input type="text" class="edit-q-match-right flex-1 w-full rounded border border-slate-300 dark:border-slate-600 p-1.5 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500" data-pair-idx="${pIndex}" value="${p.rightText}">
                    </div>
                `;
            });
            html += `</div>`;
        } else {
            html += `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    ${q.options.map((opt, oIndex) => `
                        <div class="flex items-center gap-2">
                            <input type="radio" name="edit-correct-${index}" value="${opt.id}" class="edit-q-correct cursor-pointer w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 dark:bg-slate-900" ${q.correct === opt.id ? 'checked' : ''}>
                            <div class="flex-grow flex items-center">
                                <span class="text-sm font-semibold text-slate-600 dark:text-slate-400 w-6">${opt.id.toUpperCase()}.</span>
                                <input type="text" class="edit-q-opt flex-grow rounded border border-slate-300 dark:border-slate-600 p-1.5 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500" data-opt-id="${opt.id}" value="${opt.text}">
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        html += `</div>`;
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

    // Update Option Text (MCQ)
    if (e.target.classList.contains('edit-q-opt')) {
        const optId = e.target.dataset.optId;
        const opt = q.options.find(o => o.id === optId);
        if (opt) opt.text = e.target.value;
    }

    // Update Correct Answer (MCQ)
    if (e.target.classList.contains('edit-q-correct')) {
        q.correct = e.target.value;
    }
    
    // Update Matching Pairs
    if (e.target.classList.contains('edit-q-match-left')) {
        const pairIdx = parseInt(e.target.dataset.pairIdx);
        if (q.pairs && q.pairs[pairIdx]) q.pairs[pairIdx].leftText = e.target.value;
    }
    if (e.target.classList.contains('edit-q-match-right')) {
        const pairIdx = parseInt(e.target.dataset.pairIdx);
        if (q.pairs && q.pairs[pairIdx]) q.pairs[pairIdx].rightText = e.target.value;
    }

    reconstructTextarea();
}

function reconstructTextarea() {
    let rawText = '';
    state.customQuestions.forEach((q, index) => {
        rawText += `Câu ${index + 1}: ${q.text}\n`;

        if (q.type === 'matching') {
            const pairStrings = q.pairs.map(p => {
                return `${p.leftText} :: ${p.rightText}`;
            });
            rawText += pairStrings.join('\n') + '\n\n';
        } else {
            const optionStrings = q.options.map(opt => {
                const isCorrect = q.correct === opt.id ? '/' : '';
                return `${isCorrect}${opt.id.toUpperCase()}. ${opt.text}`;
            });
            rawText += optionStrings.join('\n') + '\n\n';
        }
    });

    DOM.home.importText.value = rawText.trim();
    // Validate to update the ready state count if format becomes invalid
    validateImportArea(true);
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
    // Escape HTML first to prevent code snippets like <stdio.h> from being rendered as invisible tags
    text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
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
    const qBlocks = text.split(/(?=(?:Question|C[aâ]u)\s+\d+[:\.])/i);
    const parsedQuestions = [];

    for (let i = 0; i < qBlocks.length; i++) {
        let block = qBlocks[i].trim();
        if (!/^(?:Question|C[aâ]u)\s+\d+[:\.]/i.test(block)) continue;

        // Check if it's a matching question (contains ::)
        if (block.includes('::')) {
            const headerMatch = block.match(/^(?:Question|C[aâ]u)\s+\d+[:\.]\s*(.*)/is);
            if (!headerMatch) continue;
            
            const lines = block.split('\n');
            let qTextLines = [];
            let pairs = [];
            
            lines.forEach((line, idx) => {
                if (idx === 0) {
                    const match = line.match(/^(?:Question|C[aâ]u)\s+\d+[:\.]\s*(.*)/i);
                    if (match) qTextLines.push(match[1].trim());
                } else if (line.includes('::')) {
                    const parts = line.split('::');
                    if (parts.length >= 2) {
                        pairs.push({
                            leftId: `l${pairs.length}`,
                            leftText: parts[0].trim(),
                            rightId: `r${pairs.length}`,
                            rightText: parts[1].trim()
                        });
                    }
                } else if (line.trim() !== '' && pairs.length === 0) {
                    qTextLines.push(line.trim());
                }
            });
            
            if (pairs.length > 0) {
                parsedQuestions.push({
                    id: i,
                    type: 'matching',
                    text: qTextLines.join(' '),
                    pairs: pairs
                });
                continue;
            }
        }

        // Find where options start loosely by looking for A., /A., B., /B. etc.
        // Require a word/space boundary before, and \s after the dot to avoid matching inside URLs (e.g. 'd.w' in 'upload.wikimedia')
        const matchStart = block.match(/(?:^|\s)\/?(?:[A-Z])\.\s/i);
        if (!matchStart) continue;
        const splitIndex = matchStart.index + (matchStart[0].match(/^\s/) ? 1 : 0);

        const qHeader = block.substring(0, splitIndex).trim();
        // Remove 'Question/Câu X: ' from header
        const headerMatch = qHeader.match(/^(?:Question|C[aâ]u)\s+\d+[:\.]\s*(.*)/is);
        if (!headerMatch) continue;

        let qText = headerMatch[1].trim();
        let optionsHtml = block.substring(splitIndex);

        // Find all options A, B, C, etc., capturing the optional '/' prefix
        // Use lookbehind for space/start, and lookahead for space/end to ensure we don't match inside URLs
        const optMatches = [...optionsHtml.matchAll(/(?<=^|\s)(\/?)([A-Z])\.\s+(.*?)(?=\s+\/?(?:[A-Z])\.\s+|$)/gis)];

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
                type: 'multiple_choice',
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



function loadSampleQuestions() {
    const sampleData = `Câu 1: Các khai báo sau đây, khai báo nào sai quy cách?
/A. #include<io.h>
B. #include<stdlib.h>
C. #include<conio.h>
D. #include<stdio.h>

Câu 2: Hình ảnh dưới đây là con vật gì?
https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Cat_August_2010-4.jpg/181px-Cat_August_2010-4.jpg
/A. Con mèo
B. Con chó
C. Con chim
D. Con cá

Câu 3: Công thức hóa học của nước là gì?
A. CO2
B. O2
C. NaCl
/D. H2O

Câu 4: Nối các từ tiếng Anh với nghĩa tiếng Việt tương ứng:
Apple :: Quả táo
Banana :: Quả chuối
Watermelon :: Dưa hấu
Strawberry :: Quả dâu tây`;
    
    DOM.home.importText.value = sampleData;
    validateImportArea();
    showToast("Sample questions loaded!");
}

function validateImportArea(skipStatusUpdate = false) {
    const rawText = DOM.home.importText.value.trim();
    if (!rawText) {
        DOM.home.startBtn.disabled = true;
        DOM.home.startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        DOM.home.startBtn.classList.remove('hover:bg-blue-700', 'dark:hover:bg-blue-600', 'group');
        if (!skipStatusUpdate) {
            DOM.home.importStatus.innerText = "Format: '/X.' for correct answers";
            DOM.home.importStatus.className = "text-xs font-medium text-slate-500 dark:text-slate-400";
        }
        return;
    }

    const qBlocks = rawText.split(/(?=(?:Question|C[aâ]u)\s+\d+[:\.])/i);
    let allValid = true;
    let questionCount = 0;

    for (let i = 0; i < qBlocks.length; i++) {
        let block = qBlocks[i].trim();
        if (!/^(?:Question|C[aâ]u)\s+\d+[:\.]/i.test(block)) continue;
        
        questionCount++;
        
        // Match matching question
        if (block.includes('::')) {
            const pairs = block.split('\n').filter(l => l.includes('::'));
            if (pairs.length === 0) {
                allValid = false;
                break;
            }
            continue;
        }

        const matchStart = block.match(/(?:^|\s)\/?(?:[A-Z])\.\s/i);
        if (!matchStart) {
            allValid = false;
            break;
        }
        const splitIndex = matchStart.index + (matchStart[0].match(/^\s/) ? 1 : 0);

        let optionsHtml = block.substring(splitIndex);
        const optMatches = [...optionsHtml.matchAll(/(?<=^|\s)(\/?)([A-Z])\.\s+(.*?)(?=\s+\/?(?:[A-Z])\.\s+|$)/gis)];
        
        // Validation: must have at least one correct answer
        let hasCorrect = optMatches.some(m => m[1] === '/');
        if (!hasCorrect) {
            allValid = false;
            break;
        }
    }

    if (questionCount > 0 && allValid) {
        DOM.home.startBtn.disabled = false;
        DOM.home.startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        DOM.home.startBtn.classList.add('hover:bg-blue-700', 'dark:hover:bg-blue-600', 'group');
        if (!skipStatusUpdate) {
            DOM.home.importStatus.innerText = `${questionCount} valid question(s). Ready to start!`;
            DOM.home.importStatus.className = "text-xs font-medium text-green-600 dark:text-green-400";
        }
    } else {
        DOM.home.startBtn.disabled = true;
        DOM.home.startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        DOM.home.startBtn.classList.remove('hover:bg-blue-700', 'dark:hover:bg-blue-600', 'group');
        if (!skipStatusUpdate) {
            if (questionCount === 0) {
                 DOM.home.importStatus.innerText = "No questions found. Check format.";
                 DOM.home.importStatus.className = "text-xs font-medium text-amber-500 dark:text-amber-400";
            } else {
                 DOM.home.importStatus.innerText = "Error: Invalid question format (check A/B/C/D or :: pairs).";
                 DOM.home.importStatus.className = "text-xs font-medium text-red-500 dark:text-red-400";
            }
        }
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
    let activeQuestions = state.customQuestions.map(q => {
        if (q.type === 'matching') {
            return {
                ...q,
                pairs: [...q.pairs],
                rightOptions: [...q.pairs].map(p => ({ id: p.rightId, text: p.rightText }))
            };
        } else {
            return {
                ...q,
                options: [...q.options]
            };
        }
    });

    state.questionCount = activeQuestions.length;

    if (state.isRandomized) {
        state.questions = shuffleArray(activeQuestions);
    } else {
        state.questions = activeQuestions; // Sequential
    }

    if (state.isRandomizedOptions) {
        state.questions.forEach(q => {
            if (q.type === 'matching') {
                shuffleArray(q.rightOptions);
            } else {
                shuffleArray(q.options);
            }
        });
    } else {
        // Even if options are not globally randomized, matching right side MUST be randomized 
        // to prevent trivial line-by-line solving.
        state.questions.forEach(q => {
            if (q.type === 'matching') {
                shuffleArray(q.rightOptions);
            }
        });
    }

    state.answers = {};
    state.matchingActiveLeft = {};
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
            `;
        // Options branching
        if (q.type === 'matching') {
            html += `<div class="mt-4 grid grid-cols-2 gap-3 sm:gap-4 matching-container relative" id="matching-q${index}">`;
            
            // Left Column (A)
            html += `<div class="flex flex-col gap-3">`; 
            q.pairs.forEach(p => {
                const textWithImages = replaceLinksToImages(p.leftText);
                html += `
                    <button onclick="handleMatchingSelection(${index}, 'left', '${p.leftId}')" id="matching-${index}-left-${p.leftId}" class="matching-left-btn flex items-center p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 w-full text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-700 relative h-full">
                        <span class="text-slate-700 dark:text-slate-200 font-medium break-words w-full pr-2">${textWithImages}</span>
                    </button>
                `;
            });
            html += `</div>`;
            
            // Right Column (B)
            html += `<div class="flex flex-col gap-3">`; 
            q.rightOptions.forEach(opt => {
                const textWithImages = replaceLinksToImages(opt.text);
                html += `
                    <button onclick="handleMatchingSelection(${index}, 'right', '${opt.id}')" id="matching-${index}-right-${opt.id}" class="matching-right-btn flex items-center justify-between p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 w-full text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-700 h-full">
                        <span class="text-slate-700 dark:text-slate-200 font-medium break-words w-full">${textWithImages}</span>
                    </button>
                `;
            });
            html += `</div>`;
            
            html += `</div>`;
            html += `<p class="mt-4 mb-2 text-xs text-slate-500 italic text-center col-span-2 hidden sm:block"><i class="ph ph-hand-pointing"></i> Click an item on the left, then click an item on the right to pair.</p>`;
        } else {
            html += `<div class="space-y-3 pl-0 md:pl-14">`;
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
        }
        card.innerHTML = html;
        DOM.quiz.questionsContainer.appendChild(card);
    });
}

// Global handler attached to window for inline onclick
window.handleAnswer = function(questionIndex, optionId) {
    if (state.isLearningMode && state.answers[questionIndex] !== undefined) {
        // If learning mode is on and already answered, do not allow changes
        return;
    }

    state.answers[questionIndex] = optionId;
    const q = state.questions[questionIndex];

    // Visual update logic: Update the parent label classes
    const card = document.getElementById(`q-card-${questionIndex}`);
    const labels = card.querySelectorAll('.option-label');

    if (state.isLearningMode) {
        labels.forEach(label => {
            const input = label.querySelector('input');
            input.disabled = true; // Lock all inputs for this question
            label.classList.add('opacity-70', 'cursor-not-allowed'); // Visual locking

            const isSelected = input.checked;
            const isCorrect = input.value === q.correct;

            if (isCorrect) {
                // Highlight correct answer in green
                label.classList.remove('border-slate-200', 'dark:border-slate-700', 'bg-white/50', 'dark:bg-slate-800/50', 'hover:bg-slate-50', 'dark:hover:bg-slate-700');
                label.classList.add('border-green-500', 'bg-green-50', 'dark:bg-green-900/30');
                
                // Add check icon if not exists
                if (!label.querySelector('.ph-check-circle')) {
                   const icon = document.createElement('i');
                   icon.className = 'ph-fill ph-check-circle text-green-500 text-xl ml-auto';
                   label.appendChild(icon);
                }
            } else if (isSelected && !isCorrect) {
                // Highlight incorrect selected answer in red
                label.classList.remove('border-slate-200', 'dark:border-slate-700', 'bg-white/50', 'dark:bg-slate-800/50', 'hover:bg-slate-50', 'dark:hover:bg-slate-700');
                label.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900/30');
                
                // Add X icon if not exists
                if (!label.querySelector('.ph-x-circle')) {
                   const icon = document.createElement('i');
                   icon.className = 'ph-fill ph-x-circle text-red-500 text-xl ml-auto';
                   label.appendChild(icon);
                }
            }
        });
    } else {
        // Standard Mode Visuals
        labels.forEach(label => {
            label.classList.remove('option-selected');
            const input = label.querySelector('input');
            if (input.checked) {
                label.classList.add('option-selected');
            }
        });
    }

    updateProgressIndicator();
    updateReviewPanel();
};

const matchColors = [
    { border: 'border-blue-400 dark:border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/40', text: 'text-blue-600 dark:text-blue-400' },
    { border: 'border-emerald-400 dark:border-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400' },
    { border: 'border-amber-400 dark:border-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400' },
    { border: 'border-purple-400 dark:border-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/40', text: 'text-purple-600 dark:text-purple-400' },
    { border: 'border-pink-400 dark:border-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/40', text: 'text-pink-600 dark:text-pink-400' },
    { border: 'border-cyan-400 dark:border-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/40', text: 'text-cyan-600 dark:text-cyan-400' },
];

window.updateMatchingVisuals = function(questionIndex) {
    const q = state.questions[questionIndex];
    if (!q || q.type !== 'matching') return;
    
    const ans = state.answers[questionIndex] || {};
    const activeLeft = state.matchingActiveLeft[questionIndex];
    
    // Reset all buttons
    const container = document.getElementById(`matching-q${questionIndex}`);
    if (!container) return;
    
    const allBtns = container.querySelectorAll('button');
    allBtns.forEach(btn => {
        // Find specific match color classes and remove them explicitly to avoid bleeding
        matchColors.forEach(color => {
            color.border.split(' ').forEach(c => btn.classList.remove(c));
            color.bg.split(' ').forEach(c => btn.classList.remove(c));
        });
        btn.classList.remove('ring-2', 'ring-blue-400', 'ring-emerald-400', 'ring-amber-400', 'ring-purple-400', 'ring-pink-400', 'ring-cyan-400');
        
        // Add back standard borders if missing
        if (!btn.className.includes('border-slate-200')) {
            btn.classList.add('border-slate-200', 'dark:border-slate-700', 'bg-white/50', 'dark:bg-slate-800/50');
        }
        
        // Remove badge
        const badge = btn.querySelector('.match-badge');
        if (badge) badge.remove();
    });

    // Reapply paired visuals
    q.pairs.forEach((p, idx) => {
        const leftId = p.leftId;
        const rightId = ans[leftId];
        
        const leftBtn = document.getElementById(`matching-${questionIndex}-left-${leftId}`);
        const color = matchColors[idx % matchColors.length];
        const ringColor = `ring-${color.border.split('-')[1]}-400`;
        
        if (leftBtn) {
            if (activeLeft === leftId) {
                // Highlight as active
                leftBtn.classList.remove('border-slate-200', 'dark:border-slate-700', 'bg-white/50', 'dark:bg-slate-800/50');
                leftBtn.classList.add('ring-2', ringColor, ...color.border.split(' '), ...color.bg.split(' '));
            } else if (rightId) {
                // Paired
                leftBtn.classList.remove('border-slate-200', 'dark:border-slate-700', 'bg-white/50', 'dark:bg-slate-800/50');
                
                let isCorrectMatch = false;
                if (state.isLearningMode) {
                    leftBtn.disabled = true;
                    leftBtn.classList.remove('hover:bg-slate-50', 'dark:hover:bg-slate-700');
                    leftBtn.classList.add('opacity-80', 'cursor-not-allowed');
                    
                    const correctPair = q.pairs.find(pair => pair.leftId === leftId);
                    isCorrectMatch = correctPair && correctPair.rightId === rightId;
                    
                    if (isCorrectMatch) {
                        leftBtn.classList.add('border-green-500', 'dark:border-green-500', 'bg-green-50', 'dark:bg-green-900/30', 'text-green-700', 'dark:text-green-400');
                        leftBtn.innerHTML += `<div class="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center bg-green-500 text-white shadow-sm z-10"><i class="ph-fill ph-check"></i></div>`;
                    } else {
                        leftBtn.classList.add('border-red-500', 'dark:border-red-500', 'bg-red-50', 'dark:bg-red-900/30', 'text-red-700', 'dark:text-red-400');
                        leftBtn.innerHTML += `<div class="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white shadow-sm z-10"><i class="ph-fill ph-x"></i></div>`;
                    }
                } else {
                    leftBtn.classList.add(...color.border.split(' '), ...color.bg.split(' '));
                    // Add badge (standard mode)
                    leftBtn.innerHTML += `<div class="match-badge absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${color.bg.split(' ')[0]} ${color.text} border border-current bg-white dark:bg-slate-900 shadow-sm z-10">${idx + 1}</div>`;
                }
            }
        }
        
        if (rightId) {
            const rightBtn = document.getElementById(`matching-${questionIndex}-right-${rightId}`);
            if (rightBtn) {
                rightBtn.classList.remove('border-slate-200', 'dark:border-slate-700', 'bg-white/50', 'dark:bg-slate-800/50');
                
                let isCorrectMatch = false;
                if (state.isLearningMode) {
                    rightBtn.disabled = true;
                    rightBtn.classList.remove('hover:bg-slate-50', 'dark:hover:bg-slate-700');
                    rightBtn.classList.add('opacity-80', 'cursor-not-allowed');
                    
                    const correctPair = q.pairs.find(pair => pair.leftId === leftId);
                    isCorrectMatch = correctPair && correctPair.rightId === rightId;
                    
                    if (isCorrectMatch) {
                        rightBtn.classList.add('border-green-500', 'dark:border-green-500', 'bg-green-50', 'dark:bg-green-900/30', 'text-green-700', 'dark:text-green-400');
                        rightBtn.innerHTML += `<div class="shrink-0 ml-2 w-6 h-6 rounded-full flex items-center justify-center bg-green-500 text-white shadow-sm z-10"><i class="ph-fill ph-check"></i></div>`;
                    } else {
                        rightBtn.classList.add('border-red-500', 'dark:border-red-500', 'bg-red-50', 'dark:bg-red-900/30', 'text-red-700', 'dark:text-red-400');
                        rightBtn.innerHTML += `<div class="shrink-0 ml-2 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white shadow-sm z-10"><i class="ph-fill ph-x"></i></div>`;
                    }
                } else {
                    rightBtn.classList.add(...color.border.split(' '), ...color.bg.split(' '));
                    // Add badge (standard mode)
                    rightBtn.innerHTML += `<div class="match-badge w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${color.bg.split(' ')[0]} ${color.text} border border-current bg-white dark:bg-slate-900 shadow-sm shrink-0 ml-2 z-10">${idx + 1}</div>`;
                }
            }
        }
    });
}

window.handleMatchingSelection = function(questionIndex, side, id) {
    if (!state.answers[questionIndex]) {
        state.answers[questionIndex] = {};
    }
    
    // In learning mode, if this specific left/right ID is already locked as a pair, do nothing.
    // For left side, check if it exists in answers.
    if (state.isLearningMode && side === 'left' && state.answers[questionIndex][id]) {
        return;
    }
    // For right side, check if any left side maps to it
    if (state.isLearningMode && side === 'right' && Object.values(state.answers[questionIndex]).includes(id)) {
        return;
    }
    
    if (side === 'left') {
        // Toggle or set active left
        if (state.matchingActiveLeft[questionIndex] === id) {
            state.matchingActiveLeft[questionIndex] = null; // deselect
        } else {
            state.matchingActiveLeft[questionIndex] = id;
        }
    } else if (side === 'right') {
        const activeLeft = state.matchingActiveLeft[questionIndex];
        if (activeLeft) {
            // Pair is formed
            
            if (state.isLearningMode) {
                // If learning mode is ON, we evaluate immediately but ONLY this pair.
                // We keep it in state.answers regardless of correct/incorrect so it counts as answered.
                 state.answers[questionIndex][activeLeft] = id;
                 state.matchingActiveLeft[questionIndex] = null; // reset active
                 
                 // Note: Visual updates for learning mode matching are handled inside updateMatchingVisuals
            } else {
                 // Check if right is already paired to something else, if so unpair that
                for (const [l, r] of Object.entries(state.answers[questionIndex])) {
                    if (r === id) {
                        delete state.answers[questionIndex][l];
                    }
                }
                state.answers[questionIndex][activeLeft] = id;
                state.matchingActiveLeft[questionIndex] = null; // reset active
            }
        } else {
            if (!state.isLearningMode) {
                 // If they click right without active left, check if it's paired and unpair it
                for (const [l, r] of Object.entries(state.answers[questionIndex])) {
                    if (r === id) {
                        delete state.answers[questionIndex][l];
                        state.matchingActiveLeft[questionIndex] = l; // Optional: make left active
                    }
                }
            }
        }
    }
    
    // Check if empty object, remove it so isQuestionAnswered works correctly
    if (Object.keys(state.answers[questionIndex]).length === 0) {
        delete state.answers[questionIndex];
    }
    
    updateMatchingVisuals(questionIndex);
    updateProgressIndicator();
    updateReviewPanel();
}

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

function isQuestionAnswered(index) {
    const q = state.questions[index];
    if (!q) return false;
    const ans = state.answers[index];
    if (q.type === 'matching') {
        return ans && Object.keys(ans).length === q.pairs.length;
    }
    return ans !== undefined;
}

function updateProgressIndicator() {
    let answeredCount = 0;
    if (state.questions && state.questions.length > 0) {
        for (let i = 0; i < state.questionCount; i++) {
            if (isQuestionAnswered(i)) answeredCount++;
        }
    }
    
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
        let isCorrect = false;
        let points = 0;
        let qReviewHtml = '';
        
        if (q.type === 'matching') {
            const userPairs = userAnswer || {};
            let pairsCorrect = 0;
            const totalPairs = q.pairs.length;
            
            let pairsReviewHtml = `<div class="mt-3 space-y-2">`;
            
            q.pairs.forEach(p => {
                const rightId = userPairs[p.leftId];
                const rightOptText = rightId ? q.rightOptions.find(o => o.id === rightId).text : "Not paired";
                
                const isPairCorrect = rightId === p.rightId;
                if (isPairCorrect) pairsCorrect++;
                
                pairsReviewHtml += `
                    <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm bg-white/60 dark:bg-slate-800/60 p-2 rounded border border-slate-100 dark:border-slate-700/50">
                        <div class="flex items-center gap-2 flex-grow min-w-0">
                            <i class="ph-fill ${isPairCorrect ? 'ph-check-circle text-green-500' : 'ph-x-circle text-red-500'} shrink-0 text-base"></i>
                            <span class="font-medium text-slate-700 dark:text-slate-200 truncate flex-1" title="${p.leftText}">${p.leftText}</span>
                            <i class="ph ph-arrow-right text-slate-400 shrink-0 hidden sm:block"></i>
                            <span class="${isPairCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} truncate flex-1 ${!rightId ? 'italic' : ''}" title="${rightOptText}">${rightOptText}</span>
                        </div>
                        ${!isPairCorrect ? `<div class="text-xs text-slate-500 dark:text-slate-400 italic sm:border-l sm:border-slate-300 dark:sm:border-slate-600 sm:pl-2 shrink-0">Correct: <span class="text-green-600 dark:text-green-400 font-medium">${p.rightText}</span></div>` : ''}
                    </div>
                `;
            });
            pairsReviewHtml += `</div>`;
            
            points = pairsCorrect / totalPairs;
            isCorrect = points === 1;
            correct += points;
            
            const statusColor = isCorrect ? 'text-green-500 dark:text-green-400' : (points > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400');
            const icon = isCorrect ? 'ph-check-circle' : (points > 0 ? 'ph-warning-circle' : 'ph-x-circle');
            const border = isCorrect ? 'border-green-100 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/10' : (points > 0 ? 'border-amber-100 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/10' : 'border-red-100 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10');
            
            qReviewHtml = `
                <div class="p-4 md:p-5 rounded-xl border ${border} mb-4 shadow-sm transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <div class="flex gap-4">
                        <div class="mt-1 ${statusColor}">
                            <i class="ph fill ${icon} text-2xl"></i>
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 flex justify-between">
                                <span>Question ${index + 1}</span>
                                <span class="${statusColor} font-bold">${points === 1 || points === 0 ? points : points.toFixed(2)} pts</span>
                            </div>
                            <div class="font-medium text-slate-800 dark:text-slate-100 mb-2">${replaceLinksToImages(q.text)}</div>
                            ${pairsReviewHtml}
                        </div>
                    </div>
                </div>
            `;
        } else {
            isCorrect = userAnswer === q.correct;
            if (isCorrect) correct++;

            const userOpt = userAnswer ? q.options.find(o => o.id === userAnswer).text : "No answer";
            const correctOpt = q.options.find(o => o.id === q.correct).text;

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
                                Your choice "${replaceLinksToImages(userOpt)}" is incorrect because it violates this rule.
                            </div>
                        ` : ''}
                    </div>
                `;
            }

            qReviewHtml = `
                <div class="p-4 md:p-5 rounded-xl border ${border} mb-4 shadow-sm transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <div class="flex gap-4">
                        <div class="mt-1 ${statusColor}">
                            <i class="ph fill ${icon} text-2xl"></i>
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Question ${index + 1}</div>
                            <div class="font-medium text-slate-800 dark:text-slate-100 mb-3">${replaceLinksToImages(q.text)}</div>
                            <div class="text-sm grid grid-cols-1 md:grid-cols-2 gap-3 bg-white/60 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <div class="${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-slate-600 dark:text-slate-300'} flex items-start gap-2 min-w-0">
                                    <span class="font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">Your Answer:</span> 
                                    <span class="font-medium break-words ${!userAnswer ? 'italic opacity-60 text-slate-400 dark:text-slate-500' : ''}">${userAnswer ? replaceLinksToImages(userOpt) : 'Skipped'}</span>
                                </div>
                                ${!isCorrect ? `
                                    <div class="text-green-600 dark:text-green-400 flex items-start gap-2 min-w-0">
                                        <span class="font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">Correct:</span> 
                                        <span class="font-medium break-words">${replaceLinksToImages(correctOpt)}</span>
                                    </div>
                                ` : ''}
                            </div>
                            ${explanationHtml}
                        </div>
                    </div>
                </div>
            `;
        }
        
        reviewHtml += qReviewHtml;
    });

    // Set Default UI states
    const scorePct = Math.round((correct / state.questionCount) * 100);
    DOM.result.newPbBadge.classList.add('hidden');
    DOM.result.scoreText.innerText = `${scorePct}%`;
    DOM.result.correctCount.innerText = correct % 1 === 0 ? correct : correct.toFixed(2);
    DOM.result.incorrectCount.innerText = (state.questionCount - correct) % 1 === 0 ? (state.questionCount - correct) : (state.questionCount - correct).toFixed(2);

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
