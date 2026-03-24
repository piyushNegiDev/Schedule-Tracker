const STORAGE_KEY = "trackerData.v2";
const LEGACY_STORAGE_KEY = "trackerData";
const THEME_STORAGE_KEY = "trackerTheme";
const elements = {
  calendar: document.querySelector("#calendar"),
  dateRow: document.querySelector("#dateRow"),
  eventBody: document.querySelector("#eventBody"),
  eventForm: document.querySelector("#eventForm"),
  eventName: document.querySelector("#eventName"),
  eventGoal: document.querySelector("#eventGoal"),
  formMessage: document.querySelector("#formMessage"),
  themeToggle: document.querySelector("#themeToggle"),
  monthSummary: document.querySelector("#monthSummary"),
  totalCompletion: document.querySelector("#totalCompletion"),
  completionInsight: document.querySelector("#completionInsight"),
  weeklyAverage: document.querySelector("#weeklyAverage"),
  weeklyInsight: document.querySelector("#weeklyInsight"),
  bestDay: document.querySelector("#bestDay"),
  bestDayInsight: document.querySelector("#bestDayInsight"),
  eventCount: document.querySelector("#eventCount"),
  eventCountInsight: document.querySelector("#eventCountInsight"),
  goalBadge: document.querySelector("#goalBadge"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput"),
  progressChart: document.querySelector("#progressChart"),
};

const appState = {
  data: loadData(),
  chart: null,
  dragEventId: null,
};

function getSelectedMonthDays() {
  return getDaysInMonth(elements.calendar.value);
}

function loadData() {
  const savedV2 = localStorage.getItem(STORAGE_KEY);
  if (savedV2) {
    return normalizeData(JSON.parse(savedV2));
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    const migrated = migrateLegacyData(JSON.parse(legacy));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  return { months: {} };
}

function normalizeData(data) {
  const months = data && typeof data === "object" && data.months ? data.months : {};

  Object.keys(months).forEach((monthKey) => {
    const month = months[monthKey];
    const daysInMonth = getDaysInMonth(monthKey);
    month.events = Array.isArray(month.events) ? month.events : [];
    month.events = month.events.map((event, index) => ({
      id: event.id || createId(),
      name: String(event.name || `Event ${index + 1}`),
      goal: clampGoal(event.goal, daysInMonth),
      checks: Array.isArray(event.checks) ? event.checks.map(Boolean) : [],
    }));
  });

  return { months };
}

function migrateLegacyData(legacyData) {
  const migrated = { months: {} };

  Object.entries(legacyData || {}).forEach(([monthKey, monthEntries]) => {
    const events = Object.entries(monthEntries || {}).map(([name, checks]) => ({
      id: createId(),
      name,
      goal: Math.max(1, Math.min(Array.isArray(checks) ? checks.length : 1, 20)),
      checks: Array.isArray(checks) ? checks.map(Boolean) : [],
    }));

    migrated.months[monthKey] = { events };
  });

  return normalizeData(migrated);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.data));
}

function createId() {
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampGoal(goal, maxDays = getSelectedMonthDays()) {
  const numericGoal = Number(goal);
  if (!Number.isFinite(numericGoal) || numericGoal < 1) {
    return 1;
  }
  return Math.min(Math.round(numericGoal), maxDays);
}

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getDaysInMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function resizeChecks(checks, days) {
  const nextChecks = Array.isArray(checks) ? checks.slice(0, days).map(Boolean) : [];
  while (nextChecks.length < days) {
    nextChecks.push(false);
  }
  return nextChecks;
}

function getCurrentMonthData() {
  const monthKey = elements.calendar.value;
  if (!appState.data.months[monthKey]) {
    appState.data.months[monthKey] = { events: [] };
  }

  const month = appState.data.months[monthKey];
  const days = getDaysInMonth(monthKey);

  month.events = month.events.map((event) => ({
    ...event,
    goal: clampGoal(event.goal, days),
    checks: resizeChecks(event.checks, days),
  }));

  return month;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function getCurrentDayNumber() {
  if (elements.calendar.value !== getTodayKey()) {
    return null;
  }
  return new Date().getDate();
}

function setDefaultMonth() {
  elements.calendar.value = getTodayKey();
}

function updateGoalInputRange() {
  const days = getSelectedMonthDays();
  elements.eventGoal.max = String(days);
  elements.eventGoal.placeholder = String(days);

  if (elements.eventGoal.value) {
    const nextValue = Math.min(Number(elements.eventGoal.value), days);
    elements.eventGoal.value = String(nextValue);
  }
}

function setTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  elements.themeToggle.querySelector(".theme-icon").textContent = isDark ? "Light" : "Dark";
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme) {
    setTheme(savedTheme);
    return;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(prefersDark ? "dark" : "light");
}

function showMessage(message, type = "") {
  elements.formMessage.textContent = message;
  elements.formMessage.className = `form-message${type ? ` ${type}` : ""}`;
}

function getDailyProgress(month) {
  const days = getDaysInMonth(elements.calendar.value);
  const progress = Array.from({ length: days }, () => 0);

  if (!month.events.length) {
    return progress;
  }

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    let completed = 0;
    month.events.forEach((event) => {
      if (event.checks[dayIndex]) {
        completed += 1;
      }
    });
    progress[dayIndex] = Number(((completed / month.events.length) * 100).toFixed(1));
  }

  return progress;
}

function calculateStreak(checks) {
  let best = 0;
  let current = 0;

  checks.forEach((value) => {
    if (value) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });

  return { current, best };
}

function calculateEventCompletion(event, days) {
  const completed = event.checks.filter(Boolean).length;
  return {
    completed,
    percentage: days ? Math.round((completed / days) * 100) : 0,
  };
}

function calculateAnalytics(month) {
  const days = getDaysInMonth(elements.calendar.value);
  const dailyProgress = getDailyProgress(month);
  const eventCount = month.events.length;
  const totalChecks = month.events.reduce(
    (sum, event) => sum + event.checks.filter(Boolean).length,
    0
  );
  const totalPossible = eventCount * days;
  const totalCompletion = totalPossible
    ? Math.round((totalChecks / totalPossible) * 100)
    : 0;
  const weeklySlice = dailyProgress.slice(-7);
  const weeklyAverage = weeklySlice.length
    ? Math.round(
        weeklySlice.reduce((sum, value) => sum + value, 0) / weeklySlice.length
      )
    : 0;
  const bestValue = dailyProgress.length ? Math.max(...dailyProgress) : 0;
  const bestIndex = dailyProgress.findIndex((value) => value === bestValue);
  const goalPercent = eventCount
    ? Number(
        (
          month.events.reduce((sum, event) => sum + (event.goal / days) * 100, 0) /
          eventCount
        ).toFixed(1)
      )
    : 0;

  return {
    days,
    eventCount,
    totalChecks,
    dailyProgress,
    totalCompletion,
    weeklyAverage,
    goalPercent,
    bestDay:
      bestIndex >= 0 && bestValue > 0
        ? { day: bestIndex + 1, value: Math.round(bestValue) }
        : null,
  };
}

function renderDays(days) {
  elements.dateRow.innerHTML = '<th class="sticky-col">Event</th>';
  const currentDay = getCurrentDayNumber();

  for (let day = 1; day <= days; day += 1) {
    const th = document.createElement("th");
    th.textContent = day;
    if (day === currentDay) {
      th.classList.add("current-day");
    }
    elements.dateRow.appendChild(th);
  }
}

function createActionButton(label, className, action, eventId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action-button ${className}`.trim();
  button.dataset.action = action;
  button.dataset.eventId = eventId;
  button.textContent = label;
  return button;
}

function renderEvents(month) {
  const days = getDaysInMonth(elements.calendar.value);
  const currentDay = getCurrentDayNumber();
  elements.eventBody.innerHTML = "";

  if (!month.events.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td class="empty-state" colspan="${
      days + 1
    }">Add your first event to start tracking daily progress.</td>`;
    elements.eventBody.appendChild(emptyRow);
    return;
  }

  month.events.forEach((event) => {
    const eventStats = calculateEventCompletion(event, days);
    const streak = calculateStreak(event.checks);
    const row = document.createElement("tr");
    row.className = "event-row";
    row.dataset.eventId = event.id;
    row.draggable = true;

    const infoCell = document.createElement("td");
    infoCell.className = "event-info";
    infoCell.innerHTML = `
      <div class="event-card">
        <div class="event-topline">
          <div class="event-name-row">
            <span class="drag-handle" aria-hidden="true">||</span>
            <span class="event-name">${escapeHtml(event.name)}</span>
          </div>
          <div class="row-actions"></div>
        </div>
        <div class="event-meta">
          <span class="pill">Goal ${event.goal} days</span>
          <span class="pill">${eventStats.completed}/${days} done</span>
          <span class="pill">${eventStats.percentage}% complete</span>
          <span class="pill">Streak ${streak.current} day${
      streak.current === 1 ? "" : "s"
    }</span>
          <span class="pill">Best streak ${streak.best}</span>
        </div>
      </div>
    `;

    const actionsWrap = infoCell.querySelector(".row-actions");
    actionsWrap.append(
      createActionButton("Edit", "", "edit", event.id),
      createActionButton("Delete", "delete", "delete", event.id)
    );

    row.appendChild(infoCell);

    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      const cell = document.createElement("td");
      cell.className = "checkbox-cell";
      if (dayIndex + 1 === currentDay) {
        cell.classList.add("current-day");
      }

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "checkbox-input";
      checkbox.dataset.eventId = event.id;
      checkbox.dataset.dayIndex = String(dayIndex);
      checkbox.checked = Boolean(event.checks[dayIndex]);
      checkbox.setAttribute("aria-label", `${event.name} day ${dayIndex + 1} completion`);

      cell.appendChild(checkbox);
      row.appendChild(cell);
    }

    elements.eventBody.appendChild(row);
  });
}

function renderSummary(month, analytics) {
  const monthLabel = formatMonthLabel(elements.calendar.value);
  elements.monthSummary.textContent = `${monthLabel} | ${analytics.eventCount} event${
    analytics.eventCount === 1 ? "" : "s"
  }`;
  elements.totalCompletion.textContent = `${analytics.totalCompletion}%`;
  elements.completionInsight.textContent = analytics.eventCount
    ? `${analytics.totalChecks} check-ins completed across all events this month.`
    : "Add events to start building a monthly completion picture.";
  elements.weeklyAverage.textContent = `${analytics.weeklyAverage}%`;
  elements.weeklyInsight.textContent = analytics.eventCount
    ? "Average completion over the most recent 7 tracked days."
    : "Weekly average updates automatically once you begin tracking.";
  elements.bestDay.textContent = analytics.bestDay ? `Day ${analytics.bestDay.day}` : "-";
  elements.bestDayInsight.textContent = analytics.bestDay
    ? `${analytics.bestDay.value}% completion was your strongest day.`
    : "Your best-performing day will appear after the first completed check-ins.";
  elements.eventCount.textContent = String(analytics.eventCount);
  elements.eventCountInsight.textContent = analytics.eventCount
    ? "Drag rows to reorder your focus areas."
    : "No events created for this month yet.";
  const safeGoalPercent = Number.isFinite(analytics.goalPercent) ? analytics.goalPercent : 0;
  elements.goalBadge.textContent = `Goal line: ${Math.round(safeGoalPercent)}%`;
}

function renderChart(analytics) {
  const context = elements.progressChart.getContext("2d");
  if (appState.chart) {
    appState.chart.destroy();
  }

  const gradient = context.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, "rgba(37, 99, 235, 0.38)");
  gradient.addColorStop(1, "rgba(37, 99, 235, 0.02)");

  appState.chart = new Chart(context, {
    type: "line",
    data: {
      labels: analytics.dailyProgress.map((_, index) => `${index + 1}`),
      datasets: [
        {
          label: "Daily Progress",
          data: analytics.dailyProgress,
          borderColor: "#2563eb",
          backgroundColor: gradient,
          fill: true,
          tension: 0.38,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#2563eb",
          pointBorderWidth: 0,
        },
        {
          label: "Goal",
          data: analytics.dailyProgress.map(() => analytics.goalPercent),
          borderColor: "rgba(245, 158, 11, 0.95)",
          borderDash: [6, 6],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation: { duration: 900, easing: "easeOutQuart" },
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            boxWidth: 10,
          },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          padding: 12,
          displayColors: false,
          callbacks: {
            title(items) {
              return `Day ${items[0].label}`;
            },
            label(context) {
              if (context.datasetIndex === 1) {
                return `Target ${context.formattedValue}%`;
              }
              return `Completion ${context.formattedValue}%`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback(value) {
              return `${value}%`;
            },
          },
        },
      },
    },
  });
}

function renderApp() {
  const month = getCurrentMonthData();
  saveData();
  const analytics = calculateAnalytics(month);
  renderDays(analytics.days);
  renderEvents(month);
  renderSummary(month, analytics);
  renderChart(analytics);
}

function isDuplicateEventName(name, ignoreId = "") {
  const normalized = name.trim().toLowerCase();
  return getCurrentMonthData().events.some(
    (event) => event.id !== ignoreId && event.name.trim().toLowerCase() === normalized
  );
}

function addEvent(name, goal) {
  const trimmedName = name.trim();
  const days = getSelectedMonthDays();
  if (!trimmedName) {
    showMessage("Please enter an event name.", "error");
    return;
  }

  if (isDuplicateEventName(trimmedName)) {
    showMessage("That event already exists for this month.", "error");
    return;
  }

  const validatedGoal = Number(goal);
  if (!Number.isFinite(validatedGoal) || validatedGoal < 1 || validatedGoal > days) {
    showMessage(`Monthly goal must be between 1 and ${days}.`, "error");
    return;
  }

  getCurrentMonthData().events.push({
    id: createId(),
    name: trimmedName,
    goal: clampGoal(goal, days),
    checks: resizeChecks([], days),
  });

  saveData();
  renderApp();
  elements.eventForm.reset();
  showMessage(`Added "${trimmedName}" successfully.`, "success");
}

function updateEventName(eventId) {
  const month = getCurrentMonthData();
  const event = month.events.find((item) => item.id === eventId);
  const days = getSelectedMonthDays();
  if (!event) {
    return;
  }

  const nextName = window.prompt("Edit event name", event.name);
  if (nextName === null) {
    return;
  }

  const trimmedName = nextName.trim();
  if (!trimmedName) {
    showMessage("Event name cannot be empty.", "error");
    return;
  }

  if (isDuplicateEventName(trimmedName, eventId)) {
    showMessage("Choose a unique name for this event.", "error");
    return;
  }

  const nextGoal = window.prompt(`Edit monthly goal (1-${days})`, String(event.goal));
  if (nextGoal === null) {
    return;
  }

  const validatedGoal = Number(nextGoal);
  if (!Number.isFinite(validatedGoal) || validatedGoal < 1 || validatedGoal > days) {
    showMessage(`Monthly goal must be between 1 and ${days}.`, "error");
    return;
  }

  event.name = trimmedName;
  event.goal = clampGoal(validatedGoal, days);
  saveData();
  renderApp();
  showMessage(`Updated "${trimmedName}" with a ${event.goal}-day goal.`, "success");
}

function deleteEvent(eventId) {
  const month = getCurrentMonthData();
  const event = month.events.find((item) => item.id === eventId);
  if (!event) {
    return;
  }

  if (!window.confirm(`Delete "${event.name}" from this month?`)) {
    return;
  }

  month.events = month.events.filter((item) => item.id !== eventId);
  saveData();
  renderApp();
  showMessage(`Deleted "${event.name}".`, "success");
}

function toggleCheck(eventId, dayIndex, checked) {
  const event = getCurrentMonthData().events.find((item) => item.id === eventId);
  if (!event) {
    return;
  }
  event.checks[dayIndex] = checked;
  saveData();
  renderApp();
}

function reorderEvents(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) {
    return;
  }

  const month = getCurrentMonthData();
  const fromIndex = month.events.findIndex((event) => event.id === sourceId);
  const toIndex = month.events.findIndex((event) => event.id === targetId);
  if (fromIndex < 0 || toIndex < 0) {
    return;
  }

  const [movedEvent] = month.events.splice(fromIndex, 1);
  month.events.splice(toIndex, 0, movedEvent);
  saveData();
  renderApp();
}

function exportData() {
  const blob = new Blob([JSON.stringify(appState.data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `schedule-tracker-${elements.calendar.value}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showMessage("Exported tracker data as JSON.", "success");
}

function importData(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      appState.data = normalizeData(JSON.parse(String(reader.result || "")));
      saveData();
      renderApp();
      showMessage("Imported tracker data successfully.", "success");
    } catch (error) {
      showMessage("Import failed. Please choose a valid JSON export.", "error");
    }
  };
  reader.readAsText(file);
}

function handleTableClick(event) {
  const target = event.target;
  if (target.matches(".checkbox-input")) {
    toggleCheck(target.dataset.eventId, Number(target.dataset.dayIndex), target.checked);
    return;
  }

  if (target.matches("[data-action='edit']")) {
    updateEventName(target.dataset.eventId);
    return;
  }

  if (target.matches("[data-action='delete']")) {
    deleteEvent(target.dataset.eventId);
  }
}

function handleDragStart(event) {
  const row = event.target.closest(".event-row");
  if (!row) {
    return;
  }
  appState.dragEventId = row.dataset.eventId;
  row.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
}

function handleDragOver(event) {
  const row = event.target.closest(".event-row");
  if (!row || row.dataset.eventId === appState.dragEventId) {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleDrop(event) {
  const row = event.target.closest(".event-row");
  if (!row) {
    return;
  }
  event.preventDefault();
  reorderEvents(appState.dragEventId, row.dataset.eventId);
}

function handleDragEnd(event) {
  const row = event.target.closest(".event-row");
  if (row) {
    row.classList.remove("dragging");
  }
  appState.dragEventId = null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function bindEvents() {
  elements.calendar.addEventListener("change", () => {
    showMessage("");
    updateGoalInputRange();
    renderApp();
  });

  elements.eventForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addEvent(elements.eventName.value, elements.eventGoal.value);
  });

  elements.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
    setTheme(nextTheme);
    renderApp();
  });

  elements.exportBtn.addEventListener("click", exportData);
  elements.importInput.addEventListener("change", (event) => {
    importData(event.target.files[0]);
    event.target.value = "";
  });

  elements.eventBody.addEventListener("click", handleTableClick);
  elements.eventBody.addEventListener("dragstart", handleDragStart);
  elements.eventBody.addEventListener("dragover", handleDragOver);
  elements.eventBody.addEventListener("drop", handleDrop);
  elements.eventBody.addEventListener("dragend", handleDragEnd);
}

function initializeApp() {
  setDefaultMonth();
  initializeTheme();
  updateGoalInputRange();
  bindEvents();
  renderApp();
}

initializeApp();
