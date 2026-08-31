import { getBootstrap, saveEntry } from "./api.js";

const state = { plan: [], recentSessions: [], recentDaily: [] };
const $ = (id) => document.getElementById(id);

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function calculateWeek(start, selected) {
  if (!start || !selected) return null;
  return Math.floor((parseDate(selected) - parseDate(start)) / 86400000 / 7) + 1;
}

function showMessage(message, error = false) {
  const element = $("app-message");
  element.hidden = !message;
  element.textContent = message;
  element.className = error ? "message message--error" : "message";
}

function getCurrentContext() {
  const selectedDate = $("training-date").value;
  const week = calculateWeek($("plan-start-date").value, selectedDate);
  const rawDay = parseDate(selectedDate).toLocaleDateString("es-AR", { weekday: "long" });
  return { selectedDate, week, day: rawDay.charAt(0).toUpperCase() + rawDay.slice(1) };
}

function getSession() {
  const { week, day } = getCurrentContext();
  return state.plan.find((row) => Number(row.week) === week && row.day === day) || null;
}

function parseExercise(value) {
  const match = value.match(/^(.*?)(?:\s+(\d+)x(\d+(?:-\d+|(?:\/\d+)+)?)(?:\s+(.*))?)$/);
  if (!match) return { title: value, prescription: value };
  const suffix = match[4] ? ` · ${match[4]}` : "";
  const plannedReps = match[3].split("/").map((value) => value.trim());
  return {
    title: match[1],
    prescription: `${match[2]} series × ${match[3]} repeticiones${suffix}`,
    setCount: Number(match[2]),
    plannedReps
  };
}

function exerciseValues(session) {
  return [session?.power, session?.strength, session?.accessories]
    .filter(Boolean)
    .flatMap((value) => value.split("+").map((item) => parseExercise(item.trim())));
}

function normalizeExerciseName(value) {
  return String(value || "").trim().toLocaleLowerCase("es-AR");
}

function lastWeightReference(exerciseName) {
  const target = normalizeExerciseName(exerciseName);
  const rows = state.recentSessions;
  const lastIndex = rows.map((row) => normalizeExerciseName(row.exercise)).lastIndexOf(target);
  if (lastIndex < 0) return null;
  const last = rows[lastIndex];
  const sessionRows = rows.filter((row) => normalizeExerciseName(row.exercise) === target
    && row.date === last.date && row.week === last.week && row.day === last.day);
  if (!sessionRows.some((row) => storedSeries(row.barWeight).some((value) => value !== "" && value != null)
    || storedSeries(row.discPerSide).some((value) => value !== "" && value != null))) return null;
  return {
    barWeight: sessionRows.flatMap((row) => storedSeries(row.barWeight)),
    discPerSide: sessionRows.flatMap((row) => storedSeries(row.discPerSide))
  };
}

function storedSeries(value) {
  if (Array.isArray(value)) return value;
  if (value === "" || value == null) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
}

function applyWeightReference(form) {
  const reference = lastWeightReference(form.dataset.exercise);
  if (!reference) return;
  const bars = storedSeries(reference.barWeight);
  const discs = storedSeries(reference.discPerSide);
  form.querySelectorAll("[data-set-field='barWeight']").forEach((input, index) => { input.value = bars[index] ?? ""; });
  form.querySelectorAll("[data-set-field='discPerSide']").forEach((input, index) => { input.value = discs[index] ?? ""; });
  form.querySelectorAll(".set-row").forEach((row) => updateTotalWeight(row));
}

function renderSetRows(exercise) {
  const setCount = exercise.setCount || 1;
  return Array.from({ length: setCount }, (_, index) => {
    const plannedReps = exercise.plannedReps?.[index] || exercise.plannedReps?.[0] || "";
    const defaultReps = plannedReps.split("-")[0];
    return `
      <div class="set-row">
        <strong>Serie ${index + 1}<small>Plan: ${plannedReps} repeticiones</small></strong>
        <label>Barra (kg)<input data-set-field="barWeight" data-set-index="${index}" type="number" min="0" step="0.5" placeholder="20" /></label>
        <label>Discos por lado (kg)<input data-set-field="discPerSide" data-set-index="${index}" type="number" min="0" step="0.5" placeholder="0" /></label>
        <label>Total (kg)<input data-set-field="totalWeight" type="number" readonly tabindex="-1" placeholder="Calculado" /></label>
        <label>Repeticiones reales<input data-set-field="repetitions" data-set-index="${index}" type="number" min="1" max="50" value="${defaultReps}" required /></label>
      </div>`;
  }).join("");
}

function renderSession() {
  const context = getCurrentContext();
  $("week-label").textContent = context.week ? `Semana ${context.week}` : "Definí el inicio del plan";
  $("day-label").textContent = context.day;
  const session = getSession();

  if (!session) {
    $("session-title").textContent = "No hay sesión programada";
    $("session-duration").textContent = "—";
    $("session-objective").textContent = context.week && !["Martes", "Jueves"].includes(context.day)
      ? "El plan está pensado para entrenar martes y jueves."
      : "Elegí una fecha dentro de las 12 semanas del plan.";
    $("exercise-list").innerHTML = "";
    return;
  }

  $("session-title").textContent = `${session.block} · ${session.day}`;
  $("session-duration").textContent = session.duration || "60 min";
  $("session-objective").textContent = session.objective || "";
  $("exercise-list").innerHTML = exerciseValues(session).map((exercise, index) => `
    <details class="exercise-card" ${index === 0 ? "open" : ""}>
      <summary><span><strong>${exercise.title}</strong><small>${exercise.prescription}</small></span><span class="exercise-card__chevron">⌄</span></summary>
      <form class="exercise-form" data-exercise="${exercise.title}">
        <div class="prescription"><span>Planificado</span><strong>${exercise.prescription}</strong></div>
        <div class="set-list">${renderSetRows(exercise)}</div>
        <div class="form-grid form-grid--exercise">
          <label class="form-grid__wide">Observaciones<textarea name="notes" rows="2" placeholder="Velocidad, molestias, sensaciones…"></textarea></label>
        </div>
        <button class="button form-grid__wide" type="submit">Guardar ${exercise.title}</button>
      </form>
    </details>`).join("");
  $("exercise-list").querySelectorAll(".exercise-form").forEach(applyWeightReference);
}

function renderSummary() {
  const daily = state.recentDaily.filter((row) => row.weight !== "" && row.weight != null);
  const last = daily[daily.length - 1];
  const first = daily[0];
  const variation = last && first ? (Number(last.weight) - Number(first.weight)).toFixed(1) : "—";
  const values = [last ? `${last.weight} kg` : "—", variation === "—" ? "—" : `${variation} kg`, state.recentSessions.length];
  $("summary-list").innerHTML = ["Último peso", "Variación", "Sesiones cargadas"].map((label, index) => `<div><dt>${label}</dt><dd>${values[index]}</dd></div>`).join("");
}

function numericValue(value) { return value === "" ? "" : Number(value); }

function updateTotalWeight(row) {
  const bar = numericValue(row.querySelector("[data-set-field='barWeight']").value) || 0;
  const disc = numericValue(row.querySelector("[data-set-field='discPerSide']").value) || 0;
  row.querySelector("[data-set-field='totalWeight']").value = bar || disc
    ? (bar + disc * 2).toFixed(1).replace(/\.0$/, "") : "";
}

function collectSeries(form) {
  return [...form.querySelectorAll(".set-row")].map((row) => ({
    barWeight: numericValue(row.querySelector("[data-set-field='barWeight']").value),
    discPerSide: numericValue(row.querySelector("[data-set-field='discPerSide']").value),
    totalWeight: numericValue(row.querySelector("[data-set-field='totalWeight']").value),
    repetitions: numericValue(row.querySelector("[data-set-field='repetitions']").value)
  }));
}

async function handleExerciseSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const context = getCurrentContext();
  if (!getSession() || !context.week) return showMessage("Seleccioná una fecha válida dentro del plan.", true);
  try {
    const series = collectSeries(form);
    await saveEntry("session", {
      date: context.selectedDate, week: context.week, day: context.day, exercise: form.dataset.exercise,
      series,
      repetitions: series.map((set) => set.repetitions),
      notes: form.elements.notes.value
    });
    showMessage(`${form.dataset.exercise} guardado en Google Sheets.`);
    form.reset(); await loadData();
  } catch (error) { showMessage(error.message, true); }
}

async function handleDailySubmit(event) {
  event.preventDefault();
  const context = getCurrentContext();
  try {
    await saveEntry("daily", {
      date: context.selectedDate, weight: numericValue($("body-weight").value), waist: numericValue($("waist").value),
      sleepHours: numericValue($("sleep-hours").value), sleepQuality: numericValue($("sleep-quality").value),
      energy: numericValue($("energy").value), fatigue: numericValue($("fatigue").value), pain: numericValue($("daily-pain").value), notes: $("daily-notes").value
    });
    showMessage("Control diario guardado en Google Sheets."); await loadData();
  } catch (error) { showMessage(error.message, true); }
}

async function loadData() {
  try {
    const payload = await getBootstrap();
    state.plan = payload.plan || []; state.recentSessions = payload.recentSessions || []; state.recentDaily = payload.recentDaily || [];
    $("connection-status").textContent = "Conectado a Google Sheets"; $("connection-status").className = "status";
    renderSession(); renderSummary();
  } catch (error) { $("connection-status").textContent = "Error de conexión"; showMessage(error.message, true); }
}

function initialize() {
  const today = localDate(); $("training-date").value = today; $("plan-start-date").value = localStorage.getItem("planStartDate") || today;
  $("training-date").addEventListener("change", renderSession);
  $("plan-start-date").addEventListener("change", (event) => { localStorage.setItem("planStartDate", event.target.value); renderSession(); });
  $("refresh-button").addEventListener("click", loadData); $("daily-form").addEventListener("submit", handleDailySubmit);
  $("exercise-list").addEventListener("submit", handleExerciseSubmit);
  $("exercise-list").addEventListener("input", (event) => {
    const row = event.target.closest(".set-row");
    if (row && event.target.matches("[data-set-field='barWeight'], [data-set-field='discPerSide']")) updateTotalWeight(row);
  });
  document.querySelectorAll("[data-screen-target]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".screen").forEach((screen) => { screen.hidden = screen.id !== button.dataset.screenTarget; });
    document.querySelectorAll(".mobile-nav__button").forEach((item) => item.classList.toggle("mobile-nav__button--active", item === button)); window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  renderSession(); loadData();
}

initialize();
