const { useEffect, useMemo, useRef, useState } = React;
const { createRoot } = ReactDOM;
const QUESTION_POOL = window.QUESTION_POOL;
const DIFFICULTY_LABELS = window.DIFFICULTY_LABELS;
const APP_CONFIG = window.APP_CONFIG;
const LS_KEY = 'astronomia-eduar-jimenez-highscores-v1';
function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function makeQuiz() {
    const easy = shuffle(QUESTION_POOL.filter((q) => q.difficulty === 'easy')).slice(0, 7);
    const medium = shuffle(QUESTION_POOL.filter((q) => q.difficulty === 'medium')).slice(0, 2);
    const hard = shuffle(QUESTION_POOL.filter((q) => q.difficulty === 'hard')).slice(0, 1);
    return shuffle([...easy, ...medium, ...hard]).map((q) => ({
        ...q,
        choices: shuffle(q.choices),
    }));
}
function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}
function calculateScore(correct, elapsedSeconds) {
    const accuracyPoints = Math.round((correct / 10) * APP_CONFIG.maxAccuracyPoints);
    const speedRatio = Math.max(0, 1 - elapsedSeconds / APP_CONFIG.maxQuizSecondsForBonus);
    const timeBonus = Math.round(speedRatio * (correct / 10) * APP_CONFIG.maxTimeBonus);
    return { accuracyPoints, timeBonus, total: accuracyPoints + timeBonus };
}
function getLocalScores() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    }
    catch {
        return [];
    }
}
function saveLocalScore(result) {
    const current = getLocalScores();
    const next = [...current, result]
        .sort((a, b) => b.score - a.score || a.durationSeconds - b.durationSeconds)
        .slice(0, 25);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    return next;
}
async function syncResult(result) {
    const endpoint = APP_CONFIG.googleAppsScriptUrl?.trim();
    if (!endpoint)
        return { ok: false, reason: 'not-configured' };
    const payload = { action: 'submit', ...result };
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        return { ok: Boolean(data?.ok), data };
    }
    catch (error) {
        try {
            await fetch(endpoint, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
            });
            return { ok: true, opaque: true };
        }
        catch {
            return { ok: false, reason: error?.message || 'sync-failed' };
        }
    }
}
async function fetchGlobalScores() {
    const endpoint = APP_CONFIG.googleAppsScriptUrl?.trim();
    if (!endpoint)
        return null;
    try {
        const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}action=leaderboard&limit=10&t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok)
            throw new Error('No se pudo consultar el ranking');
        const data = await response.json();
        return Array.isArray(data?.scores) ? data.scores : null;
    }
    catch {
        return null;
    }
}
function StarField() {
    const stars = useMemo(() => Array.from({ length: 90 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        duration: `${2.5 + Math.random() * 4}s`,
        size: `${1 + Math.random() * 2.6}px`,
    })), []);
    return React.createElement("div", { className: "star-field", "aria-hidden": "true" }, stars.map((s) => React.createElement("i", { key: s.id, style: { left: s.left, top: s.top, animationDelay: s.delay, animationDuration: s.duration, width: s.size, height: s.size } })));
}
function SolarExplorer() {
    const planets = [
        ['Mercurio', 'El más cercano al Sol y el planeta más pequeño.'],
        ['Venus', 'Atmósfera muy densa y el planeta con mayor temperatura superficial media.'],
        ['Tierra', 'Nuestro planeta, con agua líquida abundante y vida conocida.'],
        ['Marte', 'Planeta rocoso rojizo con volcanes gigantes y casquetes polares.'],
        ['Júpiter', 'El planeta más grande; posee la Gran Mancha Roja.'],
        ['Saturno', 'Gigante gaseoso famoso por su extenso sistema de anillos.'],
        ['Urano', 'Gigante helado con una inclinación axial extrema.'],
        ['Neptuno', 'El planeta más lejano, con vientos atmosféricos muy rápidos.'],
    ];

}
function OrbitChallenge() {
    const correctOrder = ['Mercurio', 'Venus', 'Tierra', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Neptuno'];
    const [remaining, setRemaining] = useState(() => shuffle(correctOrder));
    const [placed, setPlaced] = useState([]);
    const [status, setStatus] = useState('Selecciona los planetas desde el más cercano al Sol hasta el más lejano.');
    const choose = (planet) => {
        const expected = correctOrder[placed.length];
        if (planet === expected) {
            const nextPlaced = [...placed, planet];
            setPlaced(nextPlaced);
            setRemaining(remaining.filter((p) => p !== planet));
            setStatus(nextPlaced.length === 8 ? 'Secuencia completa. Sistema Solar ordenado correctamente.' : `Correcto. Sigue con la posición ${nextPlaced.length + 1}.`);
        }
        else {
            setStatus(`Todavía no. En la posición ${placed.length + 1} va otro planeta.`);
        }
    };
}
function Leaderboard({ scores, source }) {
    return (React.createElement("section", { className: "panel leaderboard", id: "ranking" },
        React.createElement("div", { className: "leaderboard-head" },
            React.createElement("div", null,
                React.createElement("div", { className: "section-kicker" }, "Clasificaci\u00F3n"),
                React.createElement("h2", null, "Mejores puntajes")),
            React.createElement("span", { className: "source-badge" }, source === 'global' ? 'Google Sheets' : 'Este dispositivo')),
        scores.length === 0 ? React.createElement("p", { className: "empty-state" }, "A\u00FAn no hay resultados registrados.") : (React.createElement("div", { className: "score-table-wrap" },
            React.createElement("table", { className: "score-table" },
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", null, "#"),
                        React.createElement("th", null, "Participante"),
                        React.createElement("th", null, "Puntaje"),
                        React.createElement("th", null, "Tiempo"),
                        React.createElement("th", null, "Entrega"))),
                React.createElement("tbody", null, scores.slice(0, 10).map((row, index) => React.createElement("tr", { key: `${row.name}-${row.submittedAt}-${index}` },
                    React.createElement("td", null, index + 1),
                    React.createElement("td", null,
                        React.createElement("strong", null, row.name),
                        React.createElement("span", null, row.course || '—')),
                    React.createElement("td", null, Number(row.score || 0).toLocaleString('es-EC')),
                    React.createElement("td", null, formatTime(Number(row.durationSeconds || 0))),
                    React.createElement("td", null, row.submittedLocal || row.submittedAt || '—')))))))));
}
function App() {
    const [screen, setScreen] = useState('home');
    const [participant, setParticipant] = useState({ name: '', course: '' });
    const [quiz, setQuiz] = useState([]);
    const [answers, setAnswers] = useState({});
    const [current, setCurrent] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [result, setResult] = useState(null);
    const [syncState, setSyncState] = useState('idle');
    const [scores, setScores] = useState(() => getLocalScores());
    const [scoreSource, setScoreSource] = useState('local');
    const timerRef = useRef(null);
    const startedAtRef = useRef(null);
    useEffect(() => {
        let active = true;
        fetchGlobalScores().then((global) => {
            if (active && global?.length) {
                setScores(global);
                setScoreSource('global');
            }
        });
        return () => { active = false; };
    }, []);
    useEffect(() => {
        if (screen !== 'quiz')
            return undefined;
        timerRef.current = window.setInterval(() => {
            setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 250);
        return () => window.clearInterval(timerRef.current);
    }, [screen]);
    const begin = (event) => {
        event.preventDefault();
        const cleanName = participant.name.trim();
        if (cleanName.length < 2)
            return;
        setParticipant((p) => ({ ...p, name: cleanName }));
        setQuiz(makeQuiz());
        setAnswers({});
        setCurrent(0);
        setElapsed(0);
        startedAtRef.current = Date.now();
        setResult(null);
        setSyncState('idle');
        setScreen('quiz');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const finalize = async () => {
        if (Object.keys(answers).length !== 10)
            return;
        window.clearInterval(timerRef.current);
        const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
        const correct = quiz.reduce((sum, q) => sum + (answers[q.id] === q.answer ? 1 : 0), 0);
        const scoring = calculateScore(correct, durationSeconds);
        const now = new Date();
        const resultData = {
            name: participant.name,
            course: participant.course.trim(),
            correct,
            totalQuestions: 10,
            durationSeconds,
            accuracyPoints: scoring.accuracyPoints,
            timeBonus: scoring.timeBonus,
            score: scoring.total,
            submittedAt: now.toISOString(),
            submittedLocal: new Intl.DateTimeFormat('es-EC', {
                timeZone: 'America/Guayaquil', dateStyle: 'short', timeStyle: 'medium', hour12: false,
            }).format(now),
            questionIds: quiz.map((q) => q.id).join(','),
        };
        setElapsed(durationSeconds);
        setResult(resultData);
        const local = saveLocalScore(resultData);
        if (scoreSource !== 'global')
            setScores(local);
        setScreen('result');
        setSyncState('syncing');
        const synced = await syncResult(resultData);
        if (synced.ok) {
            setSyncState('synced');
            const global = await fetchGlobalScores();
            if (global?.length) {
                setScores(global);
                setScoreSource('global');
            }
        }
        else {
            setSyncState(synced.reason === 'not-configured' ? 'not-configured' : 'local-only');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const answeredCount = Object.keys(answers).length;
    const q = quiz[current];
    return (React.createElement("div", { className: "app-shell" },
        React.createElement(StarField, null),
        React.createElement("div", { className: "aurora aurora-one" }),
        React.createElement("div", { className: "aurora aurora-two" }),
        React.createElement("header", { className: "topbar" },
            React.createElement("a", { href: "#inicio", className: "brand", onClick: () => setScreen('home') },
                React.createElement("span", { className: "brand-mark" }, "\u2726"),
                React.createElement("span", null, "Eduar Jim\u00E9nez \u00B7 Astronom\u00EDa")),
            React.createElement("nav", null,
                React.createElement("a", { href: "#explorador" }, "Explorador"),
                React.createElement("a", { href: "#actividad-orbitas" }, "Actividad"),
                React.createElement("a", { href: "#ranking" }, "Ranking"))),
        React.createElement("main", { id: "inicio" },
            screen === 'home' && (React.createElement(React.Fragment, null,
                React.createElement("section", { className: "hero" },
                    React.createElement("div", { className: "hero-copy" },
                        React.createElement("span", { className: "eyebrow" }, "Edici\u00F3n piloto \u00B7 Astronom\u00EDa General B\u00E1sica"),
                        React.createElement("h1", null,
                            "Concurso piloto ",
                            React.createElement("em", null, "Eduar Jim\u00E9nez"),
                            " de Astronom\u00EDa General B\u00E1sica"),
                        React.createElement("p", null, "Una experiencia interactiva para poner a prueba conocimientos esenciales del cielo, el Sistema Solar y la astronom\u00EDa escolar."),
                        React.createElement("div", { className: "hero-stats" },
                            React.createElement("div", null,
                                React.createElement("strong", null, "50"),
                                React.createElement("span", null, "preguntas en el banco")),
                            React.createElement("div", null,
                                React.createElement("strong", null, "10"),
                                React.createElement("span", null, "por intento")),
                            React.createElement("div", null,
                                React.createElement("strong", null, "12.000"),
                                React.createElement("span", null, "puntos m\u00E1ximos")))),
                    React.createElement("div", { className: "space-stage", "aria-hidden": "true" },
                        React.createElement("div", { className: "sun-core" }),
                        React.createElement("div", { className: "orbit orbit-a" },
                            React.createElement("span", null)),
                        React.createElement("div", { className: "orbit orbit-b" },
                            React.createElement("span", null)),
                        React.createElement("div", { className: "orbit orbit-c" },
                            React.createElement("span", null)),
                        React.createElement("div", { className: "satellite" }, "\u2726"))),
                React.createElement("section", { className: "panel registration" },
                    React.createElement("div", null,
                        React.createElement("div", { className: "section-kicker" }, "Ingreso al concurso"),
                        React.createElement("h2", null, "Identificaci\u00F3n del participante"),
                        React.createElement("p", { className: "section-copy" }, "El cron\u00F3metro inicia al presionar \u201CComenzar cuestionario\u201D.")),
                    React.createElement("form", { onSubmit: begin },
                        React.createElement("label", null,
                            "Nombre y apellido",
                            React.createElement("input", { value: participant.name, onChange: (e) => setParticipant({ ...participant, name: e.target.value }), placeholder: "Ej. Ana P\u00E9rez", maxLength: 70, required: true })),
                        React.createElement("label", null,
                            "Curso / paralelo",
                            React.createElement("input", { value: participant.course, onChange: (e) => setParticipant({ ...participant, course: e.target.value }), placeholder: "Ej. 10mo EGB A", maxLength: 40 })),
                        React.createElement("button", { className: "primary-button", type: "submit" },
                            "Comenzar cuestionario ",
                            React.createElement("span", null, "\u2192"))),
                    React.createElement("div", { className: "rules-grid" },
                        React.createElement("article", null,
                            React.createElement("strong", null, "7 f\u00E1ciles"),
                            React.createElement("span", null, "Fundamentos esenciales")),
                        React.createElement("article", null,
                            React.createElement("strong", null, "2 medias"),
                            React.createElement("span", null, "Comprensi\u00F3n y aplicaci\u00F3n")),
                        React.createElement("article", null,
                            React.createElement("strong", null, "1 dif\u00EDcil"),
                            React.createElement("span", null, "Razonamiento astron\u00F3mico")))),
                React.createElement(SolarExplorer, null),
                React.createElement(OrbitChallenge, null),
                React.createElement(Leaderboard, { scores: scores, source: scoreSource }))),
            screen === 'quiz' && q && (React.createElement("section", { className: "quiz-shell" },
                React.createElement("div", { className: "quiz-topline" },
                    React.createElement("div", null,
                        React.createElement("span", { className: "eyebrow" }, "Intento en curso"),
                        React.createElement("h2", null, participant.name)),
                    React.createElement("div", { className: "timer-card" },
                        React.createElement("span", null, "Tiempo"),
                        React.createElement("strong", null, formatTime(elapsed)))),
                React.createElement("div", { className: "progress-meta" },
                    React.createElement("span", null,
                        "Pregunta ",
                        current + 1,
                        " de 10"),
                    React.createElement("span", null,
                        answeredCount,
                        "/10 respondidas")),
                React.createElement("div", { className: "progress-track" },
                    React.createElement("span", { style: { width: `${((current + 1) / 10) * 100}%` } })),
                React.createElement("article", { className: "question-card" },
                    React.createElement("div", { className: `difficulty ${q.difficulty}` }, DIFFICULTY_LABELS[q.difficulty]),
                    React.createElement("h3", null, q.question),
                    React.createElement("div", { className: "choice-grid" }, q.choices.map((choice, index) => React.createElement("button", { key: choice, className: `choice ${answers[q.id] === choice ? 'selected' : ''}`, onClick: () => setAnswers({ ...answers, [q.id]: choice }) },
                        React.createElement("span", null, String.fromCharCode(65 + index)),
                        choice)))),
                React.createElement("div", { className: "quiz-controls" },
                    React.createElement("button", { className: "secondary-button", disabled: current === 0, onClick: () => setCurrent((c) => c - 1) }, "\u2190 Anterior"),
                    React.createElement("div", { className: "question-dots" }, quiz.map((item, index) => React.createElement("button", { key: item.id, className: `${index === current ? 'current' : ''} ${answers[item.id] ? 'answered' : ''}`, onClick: () => setCurrent(index), "aria-label": `Ir a pregunta ${index + 1}` }, index + 1))),
                    current < 9 ? React.createElement("button", { className: "primary-button compact", onClick: () => setCurrent((c) => c + 1) }, "Siguiente \u2192") : React.createElement("button", { className: "primary-button compact", disabled: answeredCount !== 10, onClick: finalize }, "Entregar")),
                current === 9 && answeredCount !== 10 && React.createElement("p", { className: "submit-note" }, "Responde las 10 preguntas para habilitar la entrega."))),
            screen === 'result' && result && (React.createElement(React.Fragment, null,
                React.createElement("section", { className: "result-hero" },
                    React.createElement("div", { className: "result-orbit" },
                        React.createElement("span", null,
                            result.correct,
                            "/10")),
                    React.createElement("div", null,
                        React.createElement("span", { className: "eyebrow" }, "Intento entregado"),
                        React.createElement("h1", null, result.name),
                        React.createElement("p", null,
                            "Resultado registrado el ",
                            result.submittedLocal,
                            "."),
                        React.createElement("div", { className: "sync-status" },
                            syncState === 'syncing' && 'Sincronizando con Google Sheets…',
                            syncState === 'synced' && 'Registro sincronizado con Google Sheets.',
                            syncState === 'not-configured' && 'Guardado localmente. Falta configurar la URL de Google Apps Script.',
                            syncState === 'local-only' && 'Guardado localmente. No se pudo confirmar la sincronización externa.'))),
                React.createElement("section", { className: "result-grid" },
                    React.createElement("article", null,
                        React.createElement("span", null, "Puntaje final"),
                        React.createElement("strong", null, result.score.toLocaleString('es-EC')),
                        React.createElement("small", null, "de 12.000 posibles")),
                    React.createElement("article", null,
                        React.createElement("span", null, "Precisi\u00F3n"),
                        React.createElement("strong", null, result.accuracyPoints.toLocaleString('es-EC')),
                        React.createElement("small", null,
                            result.correct,
                            " respuestas correctas")),
                    React.createElement("article", null,
                        React.createElement("span", null, "Bono por tiempo"),
                        React.createElement("strong", null,
                            "+",
                            result.timeBonus.toLocaleString('es-EC')),
                        React.createElement("small", null,
                            "Tiempo total ",
                            formatTime(result.durationSeconds)))),
                React.createElement("section", { className: "panel review" },
                    React.createElement("div", { className: "section-kicker" }, "Revisi\u00F3n"),
                    React.createElement("h2", null, "Retroalimentaci\u00F3n del intento"),
                    React.createElement("div", { className: "review-list" }, quiz.map((item, index) => { const ok = answers[item.id] === item.answer; return React.createElement("article", { key: item.id, className: ok ? 'ok' : 'bad' },
                        React.createElement("div", { className: "review-number" }, index + 1),
                        React.createElement("div", null,
                            React.createElement("strong", null, item.question),
                            React.createElement("p", null,
                                "Tu respuesta: ",
                                answers[item.id]),
                            !ok && React.createElement("p", null,
                                "Respuesta correcta: ",
                                item.answer),
                            React.createElement("small", null, item.explanation))); })),
                    React.createElement("button", { className: "primary-button", onClick: () => setScreen('home') }, "Volver al inicio")),
                React.createElement(Leaderboard, { scores: scores, source: scoreSource })))),
        React.createElement("footer", null,
            React.createElement("span", null, "Concurso piloto Eduar Jim\u00E9nez de Astronom\u00EDa General B\u00E1sica"),
            React.createElement("span", null, "Doc. Walter Lam, \u00B7 Erick B., \u00B7 Andy A.,\u00B7 Carlos B"))));
}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null,
    React.createElement(App, null)));
