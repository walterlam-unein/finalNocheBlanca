import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QUESTION_POOL, DIFFICULTY_LABELS } from './questions';
import { APP_CONFIG } from './config';
import './styles.css';

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
  } catch {
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
  if (!endpoint) return { ok: false, reason: 'not-configured' };

  const payload = { action: 'submit', ...result };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return { ok: Boolean(data?.ok), data };
  } catch (error) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      return { ok: true, opaque: true };
    } catch {
      return { ok: false, reason: error?.message || 'sync-failed' };
    }
  }
}

async function fetchGlobalScores() {
  const endpoint = APP_CONFIG.googleAppsScriptUrl?.trim();
  if (!endpoint) return null;
  try {
    const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}action=leaderboard&limit=10&t=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo consultar el ranking');
    const data = await response.json();
    return Array.isArray(data?.scores) ? data.scores : null;
  } catch {
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

  return <div className="star-field" aria-hidden="true">{stars.map((s) => <i key={s.id} style={{ left: s.left, top: s.top, animationDelay: s.delay, animationDuration: s.duration, width: s.size, height: s.size }} />)}</div>;
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
  const [selected, setSelected] = useState(2);

  return (
    <section className="panel explorer" id="explorador">
      <div className="section-kicker">Actividad libre</div>
      <h2>Explorador del Sistema Solar</h2>
      <p className="section-copy">Selecciona un planeta para revisar un dato esencial. Esta actividad no altera el puntaje del concurso.</p>
      <div className="planet-strip" role="list" aria-label="Planetas del Sistema Solar">
        {planets.map(([name], index) => (
          <button key={name} className={`planet-chip planet-${index + 1} ${selected === index ? 'active' : ''}`} onClick={() => setSelected(index)} aria-pressed={selected === index}>
            <span className="planet-dot" />
            <span>{name}</span>
          </button>
        ))}
      </div>
      <div className="planet-card">
        <div className={`planet-visual planet-${selected + 1}`}><span /></div>
        <div><strong>{planets[selected][0]}</strong><p>{planets[selected][1]}</p><small>Posición desde el Sol: {selected + 1}</small></div>
      </div>
    </section>
  );
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
    } else {
      setStatus(`Todavía no. En la posición ${placed.length + 1} va otro planeta.`);
    }
  };

  const reset = () => {
    setRemaining(shuffle(correctOrder));
    setPlaced([]);
    setStatus('Selecciona los planetas desde el más cercano al Sol hasta el más lejano.');
  };

  return (
    <section className="panel orbit-activity" id="actividad-orbitas">
      <div className="section-kicker">Reto interactivo</div>
      <h2>Secuencia orbital</h2>
      <p className="section-copy">Construye el orden correcto de los ocho planetas.</p>
      <div className="orbit-answer">
        {Array.from({ length: 8 }, (_, index) => <div key={index} className={`orbit-slot ${placed[index] ? 'filled' : ''}`}><span>{index + 1}</span>{placed[index] || '—'}</div>)}
      </div>
      <div className="orbit-options">
        {remaining.map((planet) => <button key={planet} onClick={() => choose(planet)}>{planet}</button>)}
      </div>
      <div className="activity-status" aria-live="polite">{status}</div>
      <button className="text-button" onClick={reset}>Reiniciar actividad</button>
    </section>
  );
}

function Leaderboard({ scores, source }) {
  return (
    <section className="panel leaderboard" id="ranking">
      <div className="leaderboard-head">
        <div><div className="section-kicker">Clasificación</div><h2>Mejores puntajes</h2></div>
        <span className="source-badge">{source === 'global' ? 'Google Sheets' : 'Este dispositivo'}</span>
      </div>
      {scores.length === 0 ? <p className="empty-state">Aún no hay resultados registrados.</p> : (
        <div className="score-table-wrap"><table className="score-table"><thead><tr><th>#</th><th>Participante</th><th>Puntaje</th><th>Tiempo</th><th>Entrega</th></tr></thead><tbody>
          {scores.slice(0, 10).map((row, index) => <tr key={`${row.name}-${row.submittedAt}-${index}`}><td>{index + 1}</td><td><strong>{row.name}</strong><span>{row.course || '—'}</span></td><td>{Number(row.score || 0).toLocaleString('es-EC')}</td><td>{formatTime(Number(row.durationSeconds || 0))}</td><td>{row.submittedLocal || row.submittedAt || '—'}</td></tr>)}
        </tbody></table></div>
      )}
    </section>
  );
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
    if (screen !== 'quiz') return undefined;
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(timerRef.current);
  }, [screen]);

  const begin = (event) => {
    event.preventDefault();
    const cleanName = participant.name.trim();
    if (cleanName.length < 2) return;
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
    if (Object.keys(answers).length !== 10) return;
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
    if (scoreSource !== 'global') setScores(local);
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
    } else {
      setSyncState(synced.reason === 'not-configured' ? 'not-configured' : 'local-only');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const answeredCount = Object.keys(answers).length;
  const q = quiz[current];

  return (
    <div className="app-shell">
      <StarField />
      <div className="aurora aurora-one" /><div className="aurora aurora-two" />
      <header className="topbar">
        <a href="#inicio" className="brand" onClick={() => setScreen('home')}><span className="brand-mark">✦</span><span>Concurso piloto Eduar Jiménez de Astronomía General Básica</span></a>
        <nav><a href="#explorador">Explorador</a><a href="#actividad-orbitas">Actividad</a><a href="#ranking">Ranking</a></nav>
      </header>

      <main id="inicio">
        {screen === 'home' && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow">Edición piloto · Astronomía General Básica</span>
                <h1>Concurso piloto <em>Eduar Jiménez</em> de Astronomía General Básica</h1>
                <p>Una experiencia interactiva para poner a prueba conocimientos esenciales del cielo, el Sistema Solar y la astronomía escolar.</p>
                <div className="hero-stats"><div><strong>50</strong><span>preguntas en el banco</span></div><div><strong>10</strong><span>por intento</span></div><div><strong>12.000</strong><span>puntos máximos</span></div></div>
              </div>
              <div className="space-stage" aria-hidden="true">
                <div className="sun-core" />
                <div className="orbit orbit-a"><span /></div>
                <div className="orbit orbit-b"><span /></div>
                <div className="orbit orbit-c"><span /></div>
                <div className="satellite">✦</div>
              </div>
            </section>

            <section className="panel registration">
              <div><div className="section-kicker">Ingreso al concurso</div><h2>Identificación del participante</h2><p className="section-copy">El cronómetro inicia al presionar “Comenzar cuestionario”.</p></div>
              <form onSubmit={begin}>
                <label>Nombre y apellido<input value={participant.name} onChange={(e) => setParticipant({ ...participant, name: e.target.value })} placeholder="Ej. Ana Pérez" maxLength={70} required /></label>
                <label>Curso / paralelo<input value={participant.course} onChange={(e) => setParticipant({ ...participant, course: e.target.value })} placeholder="Ej. 10mo EGB A" maxLength={40} /></label>
                <button className="primary-button" type="submit">Comenzar cuestionario <span>→</span></button>
              </form>
              <div className="rules-grid"><article><strong>7 fáciles</strong><span>Fundamentos esenciales</span></article><article><strong>2 medias</strong><span>Comprensión y aplicación</span></article><article><strong>1 difícil</strong><span>Razonamiento astronómico</span></article></div>
            </section>

            <SolarExplorer />
            <OrbitChallenge />
            <Leaderboard scores={scores} source={scoreSource} />
          </>
        )}

        {screen === 'quiz' && q && (
          <section className="quiz-shell">
            <div className="quiz-topline">
              <div><span className="eyebrow">Intento en curso</span><h2>{participant.name}</h2></div>
              <div className="timer-card"><span>Tiempo</span><strong>{formatTime(elapsed)}</strong></div>
            </div>
            <div className="progress-meta"><span>Pregunta {current + 1} de 10</span><span>{answeredCount}/10 respondidas</span></div>
            <div className="progress-track"><span style={{ width: `${((current + 1) / 10) * 100}%` }} /></div>
            <article className="question-card">
              <div className={`difficulty ${q.difficulty}`}>{DIFFICULTY_LABELS[q.difficulty]}</div>
              <h3>{q.question}</h3>
              <div className="choice-grid">
                {q.choices.map((choice, index) => <button key={choice} className={`choice ${answers[q.id] === choice ? 'selected' : ''}`} onClick={() => setAnswers({ ...answers, [q.id]: choice })}><span>{String.fromCharCode(65 + index)}</span>{choice}</button>)}
              </div>
            </article>
            <div className="quiz-controls">
              <button className="secondary-button" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>← Anterior</button>
              <div className="question-dots">{quiz.map((item, index) => <button key={item.id} className={`${index === current ? 'current' : ''} ${answers[item.id] ? 'answered' : ''}`} onClick={() => setCurrent(index)} aria-label={`Ir a pregunta ${index + 1}`}>{index + 1}</button>)}</div>
              {current < 9 ? <button className="primary-button compact" onClick={() => setCurrent((c) => c + 1)}>Siguiente →</button> : <button className="primary-button compact" disabled={answeredCount !== 10} onClick={finalize}>Entregar</button>}
            </div>
            {current === 9 && answeredCount !== 10 && <p className="submit-note">Responde las 10 preguntas para habilitar la entrega.</p>}
          </section>
        )}

        {screen === 'result' && result && (
          <>
            <section className="result-hero">
              <div className="result-orbit"><span>{result.correct}/10</span></div>
              <div><span className="eyebrow">Intento entregado</span><h1>{result.name}</h1><p>Resultado registrado el {result.submittedLocal}.</p>
                <div className="sync-status">{syncState === 'syncing' && 'Sincronizando con Google Sheets…'}{syncState === 'synced' && 'Registro sincronizado con Google Sheets.'}{syncState === 'not-configured' && 'Guardado localmente. Falta configurar la URL de Google Apps Script.'}{syncState === 'local-only' && 'Guardado localmente. No se pudo confirmar la sincronización externa.'}</div>
              </div>
            </section>
            <section className="result-grid">
              <article><span>Puntaje final</span><strong>{result.score.toLocaleString('es-EC')}</strong><small>de 12.000 posibles</small></article>
              <article><span>Precisión</span><strong>{result.accuracyPoints.toLocaleString('es-EC')}</strong><small>{result.correct} respuestas correctas</small></article>
              <article><span>Bono por tiempo</span><strong>+{result.timeBonus.toLocaleString('es-EC')}</strong><small>Tiempo total {formatTime(result.durationSeconds)}</small></article>
            </section>
            <section className="panel review">
              <div className="section-kicker">Revisión</div><h2>Retroalimentación del intento</h2>
              <div className="review-list">{quiz.map((item, index) => { const ok = answers[item.id] === item.answer; return <article key={item.id} className={ok ? 'ok' : 'bad'}><div className="review-number">{index + 1}</div><div><strong>{item.question}</strong><p>Tu respuesta: {answers[item.id]}</p>{!ok && <p>Respuesta correcta: {item.answer}</p>}<small>{item.explanation}</small></div></article>; })}</div>
              <button className="primary-button" onClick={() => setScreen('home')}>Volver al inicio</button>
            </section>
            <Leaderboard scores={scores} source={scoreSource} />
          </>
        )}
      </main>
      <footer><span>Concurso piloto Eduar Jiménez de Astronomía General Básica</span><span>Elaborado por Walter Lam, Erick B, Carlos B, Andy A</span></footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
