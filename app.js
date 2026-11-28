// Обраний фреймворк: React — декларативне керування станом через useState/useEffect та компонентна архітектура без ручного маніпулювання DOM.
// Технологія анімації (Крок 1, Варіант 8): Canvas 2D API — дуга зворотного відліку, що зменшується щокадру через ctx.arc() у циклі requestAnimationFrame.

const { useState, useEffect, useRef } = React;

const API_URL = 'https://opentdb.com/api.php?amount=10&type=multiple';
const DEFAULT_QUESTION_TIME_SEC = 20;

const STORAGE_KEY = 'quiz_results_backup';
const MIGRATION_FLAG_KEY = 'quiz_results_migrated_to_idb';
const DB_NAME = 'QuizResultsDB';
const DB_VERSION = 1;
const STORE_NAME = 'results';

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

// ============================================================================
// Робота з localStorage
// ============================================================================

function saveToLocalStorage(items) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Помилка збереження даних у localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Помилка розбору даних із localStorage:', error);
        return [];
    }
}

// ============================================================================
// Робота з IndexedDB: відкриття бази та CRUD-операції
// ============================================================================

function openDB() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB не підтримується у цьому браузері або режимі перегляду.'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error || new Error('Не вдалося відкрити базу даних IndexedDB.'));
        };
    });
}

async function addItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const recordToSave = { ...item };
        if (recordToSave.id === undefined || recordToSave.id === null) {
            delete recordToSave.id;
        }

        const request = store.add(recordToSave);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Помилка додавання запису в IndexedDB.'));
    });
}

async function updateItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(item);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Помилка оновлення запису в IndexedDB.'));
    });
}

async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error('Помилка зчитування даних із IndexedDB.'));
    });
}

async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error('Помилка видалення запису з IndexedDB.'));
    });
}

function sortResultsByBest(items) {
    return [...items].sort((a, b) => {
        const ratioA = a.total > 0 ? a.score / a.total : 0;
        const ratioB = b.total > 0 ? b.score / b.total : 0;
        if (ratioB !== ratioA) {
            return ratioB - ratioA;
        }
        return b.score - a.score;
    });
}


// Малює анімовану дугу зворотного відліку на Canvas через ctx.arc() у циклі requestAnimationFrame
function CountdownArcCanvas({ durationSeconds, isPaused, resetKey, onTimeout }) {
    const canvasRef = useRef(null);
    const frameIdRef = useRef(null);
    const remainingMsRef = useRef(durationSeconds * 1000);
    const lastTimestampRef = useRef(null);
    const timedOutRef = useRef(false);
    const onTimeoutRef = useRef(onTimeout);

    useEffect(() => {
        onTimeoutRef.current = onTimeout;
    }, [onTimeout]);

    // Скидає тривалість таймера під поточне питання з даних застосунку
    useEffect(() => {
        const safeDuration = Number.isFinite(durationSeconds) && durationSeconds > 0
            ? durationSeconds
            : DEFAULT_QUESTION_TIME_SEC;
        remainingMsRef.current = safeDuration * 1000;
        lastTimestampRef.current = null;
        timedOutRef.current = false;
    }, [durationSeconds, resetKey]);

    // Цикл анімації через requestAnimationFrame з clearRect, ctx.arc та cancelAnimationFrame
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Отримання 2D-контексту з фіксованими розмірами canvas (140x140)
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const totalMs = (Number.isFinite(durationSeconds) && durationSeconds > 0
            ? durationSeconds
            : DEFAULT_QUESTION_TIME_SEC) * 1000;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 52;
        const startAngle = -Math.PI / 2;

        function drawFrame(now) {
            if (lastTimestampRef.current !== null && !isPaused) {
                const deltaMs = Math.max(0, now - lastTimestampRef.current);
                remainingMsRef.current = Math.max(0, remainingMsRef.current - deltaMs);
            }
            lastTimestampRef.current = now;

            const ratio = totalMs > 0 ? remainingMsRef.current / totalMs : 0;
            const secondsLeft = Math.ceil(remainingMsRef.current / 1000);

            // Очищення попереднього кадру через clearRect
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Фонове кільце таймера
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 10;
            ctx.stroke();

            // Анімована дуга зворотного відліку, що зменшується щокадру через ctx.arc()
            if (ratio > 0) {
                const endAngle = startAngle + Math.PI * 2 * ratio;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
                ctx.strokeStyle = ratio > 0.3 ? '#6b21a8' : '#c5221f';
                ctx.lineWidth = 10;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            // Числовий індикатор секунд у центрі дуги
            ctx.fillStyle = '#1f2937';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${secondsLeft}с`, centerX, centerY);

            if (remainingMsRef.current <= 0 && !isPaused && !timedOutRef.current) {
                timedOutRef.current = true;
                if (typeof onTimeoutRef.current === 'function') {
                    onTimeoutRef.current();
                }
                return;
            }

            frameIdRef.current = requestAnimationFrame(drawFrame);
        }

        frameIdRef.current = requestAnimationFrame(drawFrame);

        // Зупинка анімації через cancelAnimationFrame при виході з екрана або оновленні залежностей
        return () => {
            if (frameIdRef.current !== null) {
                cancelAnimationFrame(frameIdRef.current);
                frameIdRef.current = null;
            }
        };
    }, [durationSeconds, isPaused, resetKey]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            {/* <canvas> з фіксованими width та height */}
            <canvas ref={canvasRef} width={140} height={140} aria-label="Таймер зворотного відліку на відповідь" />
            <span>Час на відповідь: <strong>{durationSeconds} с</strong></span>
        </div>
    );
}

// ============================================================================
// React-компоненти
// ============================================================================

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

function App() {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isAnswered, setIsAnswered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [savedResults, setSavedResults] = useState([]);
    const [storageError, setStorageError] = useState('');

    async function syncResultsFromStorage() {
        try {
            setStorageError('');
            let idbItems = await getAllItems();

            const alreadyMigrated = localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
            if (idbItems.length === 0 && !alreadyMigrated) {
                const legacyItems = loadFromLocalStorage();
                if (legacyItems.length > 0) {
                    for (const legacy of legacyItems) {
                        await addItem({
                            date: legacy.date,
                            score: legacy.score,
                            total: legacy.total
                        });
                    }
                    idbItems = await getAllItems();
                }
                localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
            }

            const sorted = sortResultsByBest(idbItems);
            setSavedResults(sorted);
            saveToLocalStorage(sorted);
        } catch (err) {
            console.error('Помилка роботи з IndexedDB:', err);
            setStorageError('Локальне сховище IndexedDB недоступне (можливо, увімкнено приватний режим браузера). Використовується резервне збереження в localStorage.');
            const fallbackItems = sortResultsByBest(loadFromLocalStorage());
            setSavedResults(fallbackItems);
        }
    }

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
            if (!Array.isArray(data.results) || data.results.length === 0) {
                throw new Error('API повернуло порожній список питань');
            }

            // Формуємо об'єкт питання з динамічною тривалістю відповіді з даних застосунку
            const formatted = data.results.map((item, idx) => {
                const shuffled = buildShuffledOptions(item.correct_answer, item.incorrect_answers);
                const timeLimit = item.difficulty === 'hard' ? 25 : DEFAULT_QUESTION_TIME_SEC;
                return {
                    id: idx + 1,
                    question: decodeHtmlEntities(item.question),
                    options: shuffled.options,
                    correctIndex: shuffled.correctIndex,
                    timeLimit
                };
            });

            setQuestions(formatted);
        } catch (err) {
            console.error('Помилка під час завантаження питань:', err);
            setError('Не вдалося завантажити питання. Перевірте з’єднання з інтернетом і натисніть «Оновити».');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
        syncResultsFromStorage();
    }, []);

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

    // Обробник закінчення часу таймера на поточне питання
    function handleTimerTimeout() {
        if (isAnswered || !questions[currentIndex]) return;

        const currentQ = questions[currentIndex];
        setIsAnswered(true);
        setFeedback(`Час вичерпано! Правильна відповідь: ${currentQ.options[currentQ.correctIndex]}`);
    }

    async function handleNextQuestion() {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setFeedback('');
        setIsAnswered(false);

        if (nextIndex >= questions.length && questions.length > 0) {
            const formattedDate = new Date().toLocaleDateString('uk-UA');
            const newRecord = {
                date: formattedDate,
                score: score,
                total: questions.length
            };

            try {
                await addItem(newRecord);
                const allFromDb = await getAllItems();
                const sorted = sortResultsByBest(allFromDb);
                setSavedResults(sorted);
                saveToLocalStorage(sorted);
            } catch (err) {
                console.error('Не вдалося зберегти результат у IndexedDB:', err);
                const fallbackList = sortResultsByBest([
                    ...savedResults,
                    { id: Date.now(), ...newRecord }
                ]);
                setSavedResults(fallbackList);
                saveToLocalStorage(fallbackList);
            }
        }
    }

    async function handleDeleteResult(id) {
        try {
            await deleteItem(id);
            const allFromDb = await getAllItems();
            const sorted = sortResultsByBest(allFromDb);
            setSavedResults(sorted);
            saveToLocalStorage(sorted);
        } catch (err) {
            console.error('Не вдалося видалити запис із IndexedDB:', err);
            const updatedFallback = savedResults.filter((item) => item.id !== id);
            setSavedResults(updatedFallback);
            saveToLocalStorage(updatedFallback);
        }
    }

    const currentQuestion = questions[currentIndex];
    const isFinished = questions.length > 0 && currentIndex >= questions.length;
    const displayQuestionNumber = questions.length > 0 ? Math.min(currentIndex + 1, questions.length) : 0;

    return (
        <>
            <section id="progress-section">
                <h2>Прогрес</h2>
                <div className="progress-container">
                    <span className="progress-label">
                        Питання{' '}
                        <span className="large-question-num">{displayQuestionNumber}</span>{' '}
                        з <span>{questions.length}</span>
                    </span>
                </div>
                <progress
                    value={displayQuestionNumber}
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
                        {/* Анімований Canvas-таймер, прив'язаний до поточного питання та стану відповіді */}
                        <CountdownArcCanvas
                            durationSeconds={currentQuestion.timeLimit}
                            isPaused={isAnswered}
                            resetKey={`${currentQuestion.id}-${currentIndex}`}
                            onTimeout={handleTimerTimeout}
                        />

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
                <h2>Найкращі результати спроб</h2>

                {storageError && (
                    <p style={{ color: '#c5221f', fontWeight: 'bold' }}>{storageError}</p>
                )}

                {savedResults.length === 0 ? (
                    <p>Збережених результатів поки немає. Пройдіть вікторину, щоб зберегти свій перший результат!</p>
                ) : (
                    <div className="history-cards">
                        {savedResults.map((attempt) => (
                            <article key={attempt.id} className="history-card">
                                <h3>Спроба #{attempt.id} від {attempt.date}</h3>
                                <p>Результат: <strong>{attempt.score}/{attempt.total}</strong></p>
                                <button
                                    type="button"
                                    className="submit-btn"
                                    style={{ marginTop: '0.75rem', padding: '8px 14px', fontSize: '0.875rem' }}
                                    onClick={() => handleDeleteResult(attempt.id)}
                                >
                                    Видалити
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);