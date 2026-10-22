console.log('script.js підключено');

const quizData = [
    { question: "Який тег використовується для створення головного заголовоку?", answer: "h1" },
    { question: "Яка CSS-властивість відповідає за внутрішні відступи?", answer: "padding" },
    { question: "Яке значення display використовується для створення Grid-сітки?", answer: "grid" }
];

const listContainer = document.querySelector('#questions-list');

const staticItem = listContainer.querySelector('.static-item');
if (staticItem) {
    staticItem.remove();
}

function renderQuestions(questions) {
    for (const item of questions) {
        const li = document.createElement('li');

        li.textContent = item.question;

        li.setAttribute('data-answer', item.answer);
        li.classList.add('answered');

        listContainer.append(li);
    }
}

renderQuestions(quizData);

const questionsCountEl = document.querySelector('#questions-count');
if (questionsCountEl) {
    questionsCountEl.textContent = `Загальна кількість питань: ${quizData.length}`;
}