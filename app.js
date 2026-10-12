console.log('script.js підключено');

const quizData = [
    { question: "Який тег використовується для створення головного заголовоку?", answer: "h1" },
    { question: "Яка CSS-властивість відповідає за внутрішні відступи?", answer: "padding" },
    { question: "Яке значення display використовується для створення Grid-сітки?", answer: "grid" }
];

// Обробляє масив питань, виводить їх у консоль та підраховує загальну кількість
function printQuizInfo(questions) {
    console.log(`Загальна кількість питань у квізі: ${questions.length}`);
    for (const item of questions) {
        console.log(`Питання: ${item.question} | Відповідь: ${item.answer}`);
    }
}

// Виклик функції обробки даних
printQuizInfo(quizData);

// Порівнює жорстко задану відповідь користувача з правильною та виводить результат
function checkUserAnswer(userAnswer, correctAnswer) {
    if (userAnswer === correctAnswer) {
        console.log("правильно");
    } else {
        console.log("неправильно");
    }
}

checkUserAnswer("padding", "padding"); // Виведе "правильно"
checkUserAnswer("margin", "padding");  // Виведе "неправильно"

// Приймає кількість правильних відповідей і загальну кількість, повертає заокруглений відсоток
const calcScorePercent = (correctCount, total) => Math.round((correctCount / total) * 100);

// Виклик стрілкової функції з реальними даними та вивід через console.log
const scoreResult = calcScorePercent(8, 10);
console.log(`Відсоток успішності спроби: ${scoreResult}%`);
