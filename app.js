// Обраний фреймворк: React — обрано через зручну декларативну модель стану (useState) та передачу подій через props без ручного маніпулювання DOM.

const { useState, useEffect } = React;

const API_URL = 'https://opentdb.com/api.php?amount=10&type=multiple';

function decodeHtmlEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

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

/*
 * Ручний DOM-рендер (querySelector / createElement / innerHTML) замінено
 * реактивними компонентами React та рендером через .map().
 */

// Компонент QuizQuestion приймає question, options, correctIndex через props
// і при кліку по варіанту відповіді передає selectedIndex у батьківський компонент через answer(selectedIndex).
function QuizQuestion({ question, options, correctIndex, answer }) {
    return (
        <div className="question-card">
            <h3>{question}</h3>
            <div className="options-container">
                {options.map((optionText, index) => (
                    <button
                        key={`${question}-${index}`}
                        type="button"
                        className="option-item"
                        onClick={() => answer(index)}
                    >
                        {optionText}
                    </button>
                ))}
            </div>
        </div>
    );
}

// Батьківський компонент застосунку з реактивним станом (useState)
function App() {
    // Дані в реактивному стані useState
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isAnswered, setIsAnswered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function loadData() {
        setLoading(true);
        setError('');
        setFeedback('');
        setIsAnswered(false);
        setCurrentIndex(0);
        setScore(0);

        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            const formatted = (data.results || []).map((item, idx) => {
                const shuffled = buildShuffledOptions(item.correct_answer, item.incorrect_answers);
                return {
                    id: idx + 1,
                    question: decodeHtmlEntities(item.question),
                    options: shuffled.options,
                    correctIndex: shuffled.correctIndex
                };
            });

            setQuestions(formatted);
        } catch (err) {
            console.error('Помилка завантаження питань:', err);
            setError('Не вдалося завантажити питання. Перевірте з’єднання з інтернетом і натисніть «Оновити».');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    // Обробник відповіді у батьківському компоненті — перевіряє правильність і оновлює лічильник балів
    function handleAnswer(selectedIndex) {
        if (isAnswered || !questions[currentIndex]) return;

        const currentQ = questions[currentIndex];
        setIsAnswered(true);

        if (selectedIndex === currentQ.correctIndex) {
            setScore((prevScore) => prevScore + 1);
            setFeedback('Правильно!');
        } else {
            setFeedback(`Неправильно! Правильна відповідь: ${currentQ.options[currentQ.correctIndex]}`);
        }
    }

    function handleNextQuestion() {
        setCurrentIndex((prevIndex) => prevIndex + 1);
        setFeedback('');
        setIsAnswered(false);
    }

    const currentQuestion = questions[currentIndex];
    const isFinished = questions.length > 0 && currentIndex >= questions.length;

    return (
        <>
            <section id="progress-section">
                <h2>Прогрес</h2>
                <div className="progress-container">
                    <span className="progress-label">
                        Питання{' '}
                        <span className="large-question-num">
                            {questions.length > 0 ? Math.min(currentIndex + 1, questions.length) : 0}
                        </span>{' '}
                        з <span>{questions.length}</span>
                    </span>
                </div>
                <progress
                    value={questions.length > 0 ? Math.min(currentIndex + 1, questions.length) : 0}
                    max={questions.length || 1}
                />
                <p>Бали: <strong>{score}</strong></p>
            </section>

            <section id="question-section">
                <h2>Поточне питання</h2>
                <button type="button" className="submit-btn" onClick={loadData} disabled={loading}>
                    Оновити
                </button>

                {loading && <p>Завантаження питань...</p>}
                {error && <p style={{ color: '#c5221f', fontWeight: 'bold' }}>{error}</p>}

                {!loading && !error && currentQuestion && !isFinished && (
                    <>
                        {/* Рендер поточного компонента QuizQuestion з передачею props та callback */}
                        <QuizQuestion
                            key={currentQuestion.id}
                            question={currentQuestion.question}
                            options={currentQuestion.options}
                            correctIndex={currentQuestion.correctIndex}
                            answer={handleAnswer}
                        />

                        {feedback && <p style={{ fontWeight: 'bold', marginTop: '1rem' }}>{feedback}</p>}

                        {isAnswered && (
                            <button type="button" className="submit-btn" onClick={handleNextQuestion}>
                                Наступне питання
                            </button>
                        )}
                    </>
                )}

                {!loading && !error && isFinished && (
                    <div className="question-card">
                        <h3>Квіз завершено!</h3>
                        <p>Ваш підсумковий результат: <strong>{score} з {questions.length}</strong></p>
                        <button type="button" className="submit-btn" onClick={loadData}>
                            Пройти ще раз
                        </button>
                    </div>
                )}
            </section>

            <section id="history-section">
                <h2>Історія спроб</h2>
                {/* Рендер списку карток через map() з ключем key */}
                <div className="history-cards">
                    {[
                        { id: 'attempt-1', date: '10.09.2026', result: '8/10' },
                        { id: 'attempt-2', date: '11.09.2026', result: '10/10' },
                        { id: 'attempt-3', date: '12.09.2026', result: '9/10' }
                    ].map((attempt) => (
                        <article key={attempt.id} className="history-card">
                            <h3>Спроба від {attempt.date}</h3>
                            <p>Результат: {attempt.result}</p>
                        </article>
                    ))}
                </div>
            </section>
        </>
    );
}

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);