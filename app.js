console.log('app.js підключено');

const quizData = [
    {
        question: "Який тег використовується для створення головного заголовка?",
        options: ["h1", "header", "heading", "h6"],
        correctIndex: 0
    },
    {
        question: "Яка CSS-властивість відповідає за внутрішні відступи?",
        options: ["margin", "padding", "spacing", "border"],
        correctIndex: 1
    },
    {
        question: "Яке значення display використовується для створення Grid-сітки?",
        options: ["flex", "block", "grid", "inline"],
        correctIndex: 2
    }
];

let currentIndex = 0;
let score = 0;

// Вибір елементів DOM
const form = document.querySelector('#quiz-form'); // Крок 2: Вибрати форму
const questionText = document.querySelector('#question-text');
const optionsContainer = document.querySelector('#options-container');
const submitBtn = document.querySelector('#submit-btn');
const nextBtn = document.querySelector('#next-btn');
const resultFeedback = document.querySelector('#result-feedback');
const currentNumEl = document.querySelector('#current-question-num');
const totalNumEl = document.querySelector('#total-questions-num');
const progressBar = document.querySelector('#quiz-progress');

totalNumEl.textContent = quizData.length;

// Функція рендерингу поточного питання
function loadQuestion(index) {
    const currentQ = quizData[index];
    questionText.textContent = currentQ.question;
    currentNumEl.textContent = index + 1;
    progressBar.value = index + 1;

    // Очищення попередніх варіантів
    optionsContainer.innerHTML = '';

    // Створення radio-кнопок для кожного варіанту
    currentQ.options.forEach((optionText, idx) => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('option-item');

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'answer';
        input.id = `option-${idx}`;
        input.value = idx;
        input.required = true; // Крок 1: обов'язкове поле (вимога Варіанта 8)

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

// Завантажити перше питання при старті
loadQuestion(currentIndex);

// Додавання обробника submit із скасуванням перезавантаження
form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Зчитування значення обраного radio-поля
    const selectedRadio = form.querySelector('input[name="answer"]:checked');

    if (!selectedRadio) {
        return;
    }

    const chosenIndex = Number(selectedRadio.value); // Приведення до Number
    const currentQ = quizData[currentIndex];

    // Перевірка chosenIndex === correctIndex
    if (chosenIndex === currentQ.correctIndex) {
        resultFeedback.textContent = "Правильно!";
        resultFeedback.style.color = "#34a853";
        score++;
    } else {
        resultFeedback.textContent = `Неправильно! Правильна відповідь: ${currentQ.options[currentQ.correctIndex]}`;
        resultFeedback.style.color = "#ea4335";
    }

    // Блокування сабміту й показ кнопки наступного питання
    submitBtn.style.display = 'none';
    nextBtn.style.display = 'inline-block';
});

// Реалізація другої події — клік по кнопці «Наступне питання»
nextBtn.addEventListener('click', () => {
    currentIndex++;

    if (currentIndex < quizData.length) {
        loadQuestion(currentIndex);
        form.reset(); // Скидання стану форми через form.reset()
    } else {
        // Завершення квізу
        questionText.textContent = "Квіз завершено!";
        optionsContainer.innerHTML = `<p>Ваш результат: <strong>${score} з ${quizData.length}</strong></p>`;
        form.querySelector('fieldset').style.border = 'none';
        submitBtn.remove();
        nextBtn.remove();
        resultFeedback.textContent = '';
    }
});