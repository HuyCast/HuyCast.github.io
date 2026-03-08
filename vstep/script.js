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
    isCheat: false
};

// ===== DOM ELEMENTS =====
const DOM = {
    screens: {
        home: document.getElementById('home-screen'),
        quiz: document.getElementById('quiz-screen'),
        result: document.getElementById('result-screen')
    },
    home: {
        startBtn: document.getElementById('start-btn'),
        timerMinus: document.getElementById('timer-minus'),
        timerPlus: document.getElementById('timer-plus'),
        timerSetting: document.getElementById('timer-setting'),
        randomizeToggle: document.getElementById('randomize-toggle'),
        randomizeOptionsToggle: document.getElementById('randomize-options-toggle'),
        importText: document.getElementById('import-text'),
        importBtn: document.getElementById('import-btn'),
        importStatus: document.getElementById('import-status')
    },
    quiz: {
        timerDisplay: document.getElementById('timer-display'),
        progressText: document.getElementById('progress-text'),
        progressPercentage: document.getElementById('progress-percentage'),
        progressBar: document.getElementById('progress-bar'),
        questionsContainer: document.getElementById('questions-container'),
        submitBtn: document.getElementById('submit-early-btn')
    },
    result: {
        scoreCircle: document.getElementById('score-circle'),
        scoreText: document.getElementById('score-text'),
        correctCount: document.getElementById('correct-count'),
        incorrectCount: document.getElementById('incorrect-count'),
        timeTaken: document.getElementById('time-taken'),
        avgTime: document.getElementById('avg-time'),
        scaledScore: document.getElementById('scaled-score'),
        motivationalFeedback: document.getElementById('motivational-feedback'),
        reviewContainer: document.getElementById('review-container'),
        tryAgainBtn: document.getElementById('try-again-btn')
    },
    modal: {
        overlay: document.getElementById('confirm-modal'),
        unansweredCount: document.getElementById('unanswered-count'),
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
    DOM.home.importBtn.addEventListener('click', handleImport);

    // Quiz Screen Events
    DOM.quiz.submitBtn.addEventListener('click', showConfirmModal);

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

function handleImport() {
    const text = DOM.home.importText.value.trim();
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
        DOM.home.importStatus.innerText = `Success: ${parsedQuestions.length} questions imported & set as default!`;
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
    current.style.opacity = '0';

    setTimeout(() => {
        current.classList.add('hidden');

        // Show new
        state.screen = newScreen;
        const next = document.querySelector(`#${state.screen}-screen`);
        next.classList.remove('hidden');

        // Slight delay for translation animation mapping
        setTimeout(() => {
            next.style.opacity = '1';
            next.classList.remove('translate-y-4'); // If applied
        }, 50);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 500);
}

function startTest() {
    if (!state.customQuestions || state.customQuestions.length === 0) {
        alert("Please import custom questions to begin the test.");
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
    state.timeRemaining = state.timerSettingMinutes * 60; // Use configured minutes
    state.startTime = new Date();

    // Ensure submit button is enabled for new session
    DOM.quiz.submitBtn.disabled = false;

    // Render
    renderQuestions();
    updateProgressIndicator();
    updateTimerDisplay();

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
        let html = `
            <div class="flex gap-4 mb-6">
                <div class="w-10 h-10 shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-bold mt-1">
                    ${index + 1}
                </div>
                <h3 class="text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed pt-1 flex-grow">
                    ${qTextWithImages}
                </h3>
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
window.handleAnswer = function (questionIndex, optionId) {
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

    DOM.modal.unansweredCount.innerText = unanswered;
    if (unanswered === 0) {
        DOM.modal.unansweredCount.parentElement.innerHTML = "You have answered all questions.";
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

    // Update Result UI
    const scorePct = Math.round((correct / state.questionCount) * 100);

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
    DOM.result.scaledScore.innerHTML = `${scaled}<span class="text-lg text-slate-500">/10</span>`;

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

    switchScreen('home');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
