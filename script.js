let calendar = document.querySelector("#calendar");
let dateRow = document.querySelector("#dateRow");
let eventBody = document.querySelector("#eventBody");

let data = JSON.parse(localStorage.getItem("trackerData")) || {};

function saveData() {
  localStorage.setItem("trackerData", JSON.stringify(data));
}

function calendarDefaultValue() {
  let today = new Date();
  calendar.value = today.toISOString().slice(0, 7);
}

function ensureMonth() {
  if (!data[calendar.value]) {
    data[calendar.value] = {};
  }
}

function getDays(year, month) {
  return new Date(year, month, 0).getDate();
}

function renderDays(days) {
  dateRow.innerHTML = "<th>Date</th>";

  for (let i = 1; i <= days; i++) {
    let th = document.createElement("th");
    th.textContent = i;
    dateRow.appendChild(th);
  }
}

function renderEvents(days) {
  eventBody.innerHTML = "";

  let monthData = data[calendar.value];

  for (let event in monthData) {
    let tr = document.createElement("tr");
    tr.dataset.trId = event;

    let td = document.createElement("td");
    td.textContent = event;
    tr.appendChild(td);

    for (let i = 0; i < days; i++) {
      let tdCheckbox = document.createElement("td");

      let input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.id = i;
      input.checked = monthData[event][i] || false;

      tdCheckbox.appendChild(input);
      tr.appendChild(tdCheckbox);
    }

    eventBody.appendChild(tr);
  }

  renderGraph(days);
}

function addEvent(eventName, days) {
  ensureMonth();

  if (!data[calendar.value][eventName]) {
    data[calendar.value][eventName] = new Array(days).fill(false);
  }

  saveData();
  renderEvents(days);
}

calendar.addEventListener("change", () => {
  let [year, month] = calendar.value.split("-");
  let days = getDays(year, month);

  ensureMonth();
  renderDays(days);
  renderEvents(days);
});

document.querySelector(".addBtnDiv button").addEventListener("click", () => {
  let eventName = prompt("Enter Event Name");
  if (!eventName) return;

  let [year, month] = calendar.value.split("-");
  let days = getDays(year, month);

  addEvent(eventName, days);
});

eventBody.addEventListener("click", (e) => {
  if (e.target.type === "checkbox") {
    let index = Number(e.target.dataset.id);
    let eventName = e.target.closest("tr").dataset.trId;

    data[calendar.value][eventName][index] = e.target.checked;

    saveData();

    let [year, month] = calendar.value.split("-");
    let days = getDays(year, month);

    renderGraph(days);
  }
});

function calculateProgress(days) {
  let result = [];
  let monthData = data[calendar.value];

  for (let i = 0; i < days; i++) {
    let total = 0;
    let done = 0;

    for (let event in monthData) {
      total++;
      if (monthData[event][i]) done++;
    }

    let percent = total === 0 ? 0 : (done / total) * 100;
    result.push(percent);
  }

  return result;
}

// ✅ CHART.JS GRAPH
let chart;

function renderGraph(days) {
  let ctx = document.getElementById("progressChart").getContext("2d");

  let progress = calculateProgress(days);

  let labels = [];
  for (let i = 1; i <= days; i++) {
    labels.push(i);
  }

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Daily Progress %",
          data: progress,
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderColor: "#4bc0c0",
          pointBackgroundColor: "#4bc0c0",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          grid: { display: true },
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: { display: true },
        },
      },
    },
  });
}

// ✅ INITIAL LOAD
calendarDefaultValue();

let [year, month] = calendar.value.split("-");
let days = getDays(year, month);

ensureMonth();
renderDays(days);
renderEvents(days);
