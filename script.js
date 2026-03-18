let calendar = document.querySelector("#calendar");
let today = new Date();
let month = today.getMonth() + 1;
let year = today.getFullYear();
let days = new Date(year, month, 0).getDate();

function calendarDefaultValue() {
  if (month < 10) {
    let FixedMonth = "0" + month;
    calendar.value = `${year}-${FixedMonth}`;
  } else {
    calendar.value = `${year}-${month}`;
  }
}

function noOfDays() {
  let dateRow = document.querySelector("#dateRow");
  for (let i = 1; i <= days; i++) {
    let th = document.createElement("th");
    th.innerHTML = i;
    dateRow.append(th);
  }
}

let eventRow = document.querySelector("#eventRow");
// let task = prompt("Enter event");
// console.log(task);
let th = document.createElement("td");
th.innerHTML = "Event1";
eventRow.append(th);

let input = document.createElement("input");
input.type = "checkbox";
console.log(input);

let thCheckbox = document.createElement("td");
thCheckbox.innerHTML = input;
console.log(thCheckbox);

eventRow.append(thCheckbox);
// for (let i = 1; i <= days; i++) {}

noOfDays();
calendarDefaultValue();
