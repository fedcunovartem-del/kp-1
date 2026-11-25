console.log('script.js підключено');

const API_URL = 'https://opentdb.com/api.php?amount=10&type=multiple';

let quizData = [];
let currentIndex = 0;
let score = 0;

// Вибір елементів DOM
const form = document.querySelector('#quiz-form');
const questionText = document.querySelector('#question-text');
const optionsContainer = document.querySelector('#options-container');
const submitBtn = document.querySelector('#submit-btn');
const nextBtn = document.querySelector('#next-btn');
const refreshBtn = document.querySelector('#refresh-btn');
const loadingStatus = document.querySelector('#loading-status');
const errorMessage = document.querySelector('#error-message');
const resultFeedback = document.querySelector('#result-feedback');
const currentNumEl = document.querySelector('#current-question-num');
const totalNumEl = document.querySelector('#total-questions-num');
const progressBar = document.querySelector('#quiz-progress');
const listContainer = document.querySelector('#questions-list');
const questionsCountEl = document.querySelector('#questions-count');

// Розкодовує HTML-сутності (наприклад, &quot;, &#039;, &amp;) у звичайний текст
function decodeHtmlEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

// Перемішує масив варіантів відповіді та повертає варіанти й індекс правильної відповіді
function buildShuffledOptions(correctAnswer, incorrectAnswers) {
    const decodedCorrect = decodeHtmlEntities(correctAnswer);
    const allOptions = [
        ...incorrectAnswers.map((item) => decodeHtmlEntities(item)),
        decodedCorrect
    ];

    for (let i = allOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }

    return {
        options: allOptions,
        correctIndex: allOptions.indexOf(decodedCorrect)
    };
}

// Рендерить список питань у #questions-list та оновлює лічильник #questions-count
function renderQuestionsList(questions) {
    if (!listContainer) return;

    listContainer.innerHTML = '';

    for (const item of questions) {
        const li = document.createElement('li');
        li.textContent = item.question;
        li.setAttribute('data-answer', item.options[item.correctIndex]);
        listContainer.append(li);
    }

    if (questionsCountEl) {
        questionsCountEl.textContent = `Кількість питань: ${questions.length}`;
    }
}

// Рендерить поточне питання у форму
function loadQuestion(index) {
    if (!quizData.length) return;

    const currentQ = quizData[index];
    questionText.textContent = currentQ.question;
    currentNumEl.textContent = index + 1;
    progressBar.max = quizData.length;
    progressBar.value = index + 1;
    totalNumEl.textContent = quizData.length;

    optionsContainer.innerHTML = '';

    currentQ.options.forEach((optionText, idx) => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('option-item');

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'answer';
        input.id = `option-${idx}`;
        input.value = idx;
        input.required = true;

        const label = document.createElement('label');
        label.htmlFor = `option-${idx}`;
        label.textContent = optionText;

        wrapper.append(input, label);
        optionsContainer.append(wrapper);
    });

    resultFeedback.textContent = '';
    submitBtn.style.display = 'inline-block';
    nextBtn.style.display = 'none';
}

// Асинхронно завантажує питання з Open Trivia Database API (https://opentdb.com/api.php?amount=10&type=multiple)
async function loadData() {
    // Увімкнути ознаку завантаження перед запитом
    if (loadingStatus) loadingStatus.style.display = 'block';
    if (errorMessage) {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }
    if (submitBtn) submitBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;

    try {
        // Виконати fetch і дочекатися відповіді
        const response = await fetch(API_URL);

        // Перевірити HTTP-статус
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Розібрати JSON
        const data = await response.json();
        console.log('Отримані дані з API:', data);

        if (!Array.isArray(data.results) || data.results.length === 0) {
            throw new Error('API повернуло порожній список питань');
        }

        // Адаптувати поля API до структури об'єкта квізу та розкодувати HTML-сутності
        quizData = data.results.map((item) => {
            const shuffled = buildShuffledOptions(item.correct_answer, item.incorrect_answers);
            return {
                question: decodeHtmlEntities(item.question),
                options: shuffled.options,
                correctIndex: shuffled.correctIndex
            };
        });

        currentIndex = 0;
        score = 0;

        renderQuestionsList(quizData);
        loadQuestion(currentIndex);
    } catch (error) {
        // Зрозуміле повідомлення користувачу та деталі в console.error
        console.error('Помилка під час завантаження питань з Open Trivia Database:', error);
        if (errorMessage) {
            errorMessage.textContent = 'Не вдалося завантажити питання. Перевірте з’єднання з інтернетом і спробуйте ще раз.';
            errorMessage.style.display = 'block';
        }
    } finally {
        // Вимкнути індикатори завантаження незалежно від результату
        if (loadingStatus) loadingStatus.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

// Повторний виклик loadData() по кнопці «Оновити» без перезавантаження сторінки
if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        loadData();
    });
}

// Обробник сабміту форми
form.addEventListener('submit', (event) => {
    event.preventDefault();

    const selectedRadio = form.querySelector('input[name="answer"]:checked');
    if (!selectedRadio) {
        return;
    }

    const chosenIndex = Number(selectedRadio.value);
    const currentQ = quizData[currentIndex];

    if (chosenIndex === currentQ.correctIndex) {
        resultFeedback.textContent = 'Правильно!';
        resultFeedback.style.color = '#137333';
        score++;
    } else {
        resultFeedback.textContent = `Неправильно! Правильна відповідь: ${currentQ.options[currentQ.correctIndex]}`;
        resultFeedback.style.color = '#c5221f';
    }

    submitBtn.style.display = 'none';
    nextBtn.style.display = 'inline-block';
});

// Перемикання на наступне питання та скидання стану форми
nextBtn.addEventListener('click', () => {
    currentIndex++;

    if (currentIndex < quizData.length) {
        loadQuestion(currentIndex);
        form.reset();
    } else {
        questionText.textContent = 'Квіз завершено!';
        optionsContainer.innerHTML = `<p>Ваш результат: <strong>${score} з ${quizData.length}</strong></p>`;
        form.querySelector('fieldset').style.border = 'none';
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        resultFeedback.textContent = '';
    }
});

// Перший запуск завантаження даних при відкритті сторінки
loadData();