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
    customQuestions: null
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
        reviewContainer: document.getElementById('review-container'),
        tryAgainBtn: document.getElementById('try-again-btn')
    },
    modal: {
        overlay: document.getElementById('confirm-modal'),
        unansweredCount: document.getElementById('unanswered-count'),
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
}

// ===== CORE LOGIC =====

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
                correct: correctId,
                theory: "Custom Question",
                explanation: "No explanation available for imported custom questions."
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

    let activeQuestions = [...state.customQuestions];

    state.questionCount = activeQuestions.length;

    if (state.isRandomized) {
        state.questions = shuffleArray(activeQuestions);
    } else {
        state.questions = activeQuestions; // Sequential
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
        card.className = `glass-card p-6 md:p-8 rounded-2xl bg-white/70 border-slate-100 shadow-sm question-card hover:shadow-md transition-shadow duration-300`;
        card.style.animationDelay = `${d}s`;
        card.id = `q-card-${index}`;

        // Question Header
        let html = `
            <div class="flex gap-4 mb-6">
                <div class="w-10 h-10 shrink-0 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                    ${index + 1}
                </div>
                <h3 class="text-lg font-medium text-slate-800 leading-relaxed pt-1 flex-grow">
                    ${q.text}
                </h3>
            </div>
            <div class="space-y-3 pl-0 md:pl-14">
        `;

        // Options
        q.options.forEach(opt => {
            const inputId = `q${index}-opt-${opt.id}`;
            html += `
                <label for="${inputId}" class="option-label flex items-center p-4 rounded-xl border border-slate-200 bg-white/50 w-full group">
                    <input type="radio" id="${inputId}" name="q${index}" value="${opt.id}" class="custom-radio mr-4" onchange="handleAnswer(${index}, '${opt.id}')">
                    <span class="text-slate-700 font-medium group-hover:text-slate-900">${opt.text}</span>
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
        DOM.quiz.timerDisplay.parentElement.classList.remove('text-blue-600', 'border-blue-100', 'bg-white/80');
        DOM.quiz.timerDisplay.parentElement.classList.add('text-red-600', 'border-red-200', 'bg-red-50', 'animate-pulse');
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

// ===== SUBMISSION & RESULTS =====
function submitTest() {
    clearInterval(state.timerInterval);
    state.endTime = new Date();

    evaluateResults();
    switchScreen('result');
}

function evaluateResults() {
    let correct = 0;
    let reviewHtml = '';

    state.questions.forEach((q, index) => {
        const userAnswer = state.answers[index];
        const isCorrect = userAnswer === q.correct;

        if (isCorrect) correct++;

        // Find option texts
        const userOpt = userAnswer ? q.options.find(o => o.id === userAnswer).text : "No answer";
        const correctOpt = q.options.find(o => o.id === q.correct).text;

        // Build review UI
        const statusColor = isCorrect ? 'text-green-500' : 'text-red-500';
        const icon = isCorrect ? 'ph-check-circle' : 'ph-x-circle';
        const border = isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30';

        let explanationHtml = '';
        if (q.explanation && q.theory) {
            explanationHtml = `
                <div class="mt-4 pt-4 border-t border-slate-200/60">
                    <div class="flex items-start gap-2 mb-2">
                        <div class="mt-0.5 text-blue-500"><i class="ph fill ph-info"></i></div>
                        <div>
                            <div class="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">${q.theory}</div>
                            <div class="text-sm text-slate-600 leading-relaxed">${q.explanation}</div>
                        </div>
                    </div>
                    ${!isCorrect && userAnswer ? `
                        <div class="mt-2 text-sm text-slate-500 italic pl-6 border-l-2 border-red-200 ml-1">
                            Your choice "${userOpt}" is incorrect because it violates this rule.
                        </div>
                    ` : ''}
                </div>
            `;
        }

        reviewHtml += `
            <div class="p-4 md:p-5 rounded-xl border ${border} mb-4 shadow-sm transition-all hover:bg-slate-50/50">
                <div class="flex gap-4">
                    <div class="mt-1 ${statusColor}">
                        <i class="ph fill ${icon} text-2xl"></i>
                    </div>
                    <div class="flex-grow">
                        <div class="text-sm font-semibold text-slate-500 mb-1">Question ${index + 1}</div>
                        <div class="font-medium text-slate-800 mb-3">${q.text}</div>
                        <div class="text-sm grid grid-cols-1 md:grid-cols-2 gap-3 bg-white/60 p-3 rounded-lg border border-slate-100">
                            <div class="${isCorrect ? 'text-green-700' : 'text-slate-600'} flex items-start gap-2">
                                <span class="font-semibold text-slate-400">Your Answer:</span> 
                                <span class="font-medium ${!userAnswer ? 'italic opacity-60 text-slate-400' : ''}">${userAnswer ? userOpt : 'Skipped'}</span>
                            </div>
                            ${!isCorrect ? `
                                <div class="text-green-600 flex items-start gap-2">
                                    <span class="font-semibold text-slate-400">Correct:</span> 
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
    const scaled = state.questionCount > 0 ? ((correct / state.questionCount) * 10).toFixed(1) : "0.0";
    DOM.result.scaledScore.innerHTML = `${scaled}<span class="text-lg text-slate-500">/10</span>`;

    DOM.result.reviewContainer.innerHTML = reviewHtml;

    // Animate Circle
    // stroke-dasharray is 289. offset = 289 - (289 * scorePct / 100)
    setTimeout(() => {
        const offset = 289 - (289 * scorePct / 100);
        DOM.result.scoreCircle.style.strokeDashoffset = offset;
    }, 500); // Wait for screen transition
}

function resetToHome() {
    // Reset Timer Display style
    DOM.quiz.timerDisplay.parentElement.classList.add('text-blue-600', 'border-blue-100', 'bg-white/80');
    DOM.quiz.timerDisplay.parentElement.classList.remove('text-red-600', 'border-red-200', 'bg-red-50', 'animate-pulse');
    const svg = DOM.quiz.timerDisplay.parentElement.querySelector('svg');
    svg.classList.add('text-blue-500');
    svg.classList.remove('text-red-500');

    // Reset Score Circle
    DOM.result.scoreCircle.style.strokeDashoffset = 289;

    // Reset Submit Button
    DOM.quiz.submitBtn.disabled = false;

    // Ensure Modal is hidden completely
    hideConfirmModal();

    // Reset state
    state.questionCount = null;
    DOM.quiz.progressBar.style.width = `0%`; // Reset progress bar

    switchScreen('home');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
