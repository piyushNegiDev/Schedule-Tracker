const EventData = require("../models/EventData");

function getDaysInMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function normalizeMonth(month) {
  return typeof month === "string" && /^\d{4}-\d{2}$/.test(month) ? month : "";
}

function clampGoal(goal, month) {
  const numericGoal = Number(goal);
  const maxDays = getDaysInMonth(month);

  if (!Number.isFinite(numericGoal) || numericGoal < 1) {
    return 1;
  }

  return Math.min(Math.round(numericGoal), maxDays);
}

function normalizeDays(days, month) {
  const maxDays = getDaysInMonth(month);
  const normalizedDays = Array.isArray(days) ? days.slice(0, maxDays).map(Boolean) : [];

  while (normalizedDays.length < maxDays) {
    normalizedDays.push(false);
  }

  return normalizedDays;
}

function serializeMonth(doc) {
  return {
    id: doc._id,
    month: doc.month,
    events: doc.events
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((event, index) => ({
        id: event._id.toString(),
        name: event.name,
        goal: event.goal,
        days: event.days,
        order: Number.isFinite(event.order) ? event.order : index,
      })),
  };
}

async function getEvents(req, res) {
  const monthQuery = normalizeMonth(req.query.month);
  const filter = { userId: req.userId };

  if (monthQuery) {
    filter.month = monthQuery;
  }

  const documents = await EventData.find(filter).sort({ month: 1 });

  return res.json({
    months: documents.map(serializeMonth),
  });
}

async function createEvent(req, res) {
  const month = normalizeMonth(req.body.month);
  const name = String(req.body.name || "").trim();

  if (!month) {
    return res.status(400).json({ message: "A valid month is required." });
  }

  if (!name) {
    return res.status(400).json({ message: "Event name is required." });
  }

  const goal = clampGoal(req.body.goal, month);

  let monthData = await EventData.findOne({ userId: req.userId, month });
  if (!monthData) {
    monthData = await EventData.create({
      userId: req.userId,
      month,
      events: [],
    });
  }

  const duplicate = monthData.events.some(
    (event) => event.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    return res.status(409).json({ message: "That event already exists for this month." });
  }

  monthData.events.push({
    name,
    goal,
    days: normalizeDays(req.body.days, month),
    order: monthData.events.length,
  });

  await monthData.save();

  const createdEvent = monthData.events[monthData.events.length - 1];
  return res.status(201).json({
    event: {
      id: createdEvent._id.toString(),
      name: createdEvent.name,
      goal: createdEvent.goal,
      days: createdEvent.days,
      order: createdEvent.order,
    },
  });
}

async function updateEvent(req, res) {
  const eventId = req.params.id;
  const monthData = await EventData.findOne({
    userId: req.userId,
    "events._id": eventId,
  });

  if (!monthData) {
    return res.status(404).json({ message: "Event not found." });
  }

  const event = monthData.events.id(eventId);
  const month = monthData.month;

  if (typeof req.body.name !== "undefined") {
    const nextName = String(req.body.name || "").trim();
    if (!nextName) {
      return res.status(400).json({ message: "Event name cannot be empty." });
    }

    const duplicate = monthData.events.some(
      (item) =>
        item._id.toString() !== eventId &&
        item.name.trim().toLowerCase() === nextName.toLowerCase()
    );

    if (duplicate) {
      return res.status(409).json({ message: "Choose a unique name for this event." });
    }

    event.name = nextName;
  }

  if (typeof req.body.goal !== "undefined") {
    event.goal = clampGoal(req.body.goal, month);
  }

  if (typeof req.body.days !== "undefined") {
    event.days = normalizeDays(req.body.days, month);
  }

  if (Number.isInteger(req.body.dayIndex)) {
    const dayIndex = req.body.dayIndex;
    const days = normalizeDays(event.days, month);

    if (dayIndex < 0 || dayIndex >= days.length) {
      return res.status(400).json({ message: "Day index is out of range." });
    }

    days[dayIndex] = Boolean(req.body.checked);
    event.days = days;
  }

  if (Number.isInteger(req.body.order)) {
    event.order = req.body.order;
  }

  await monthData.save();

  return res.json({
    event: {
      id: event._id.toString(),
      name: event.name,
      goal: event.goal,
      days: event.days,
      order: event.order,
    },
  });
}

async function deleteEvent(req, res) {
  const eventId = req.params.id;
  const monthData = await EventData.findOne({
    userId: req.userId,
    "events._id": eventId,
  });

  if (!monthData) {
    return res.status(404).json({ message: "Event not found." });
  }

  monthData.events.pull({ _id: eventId });
  monthData.events.forEach((event, index) => {
    event.order = index;
  });

  if (!monthData.events.length) {
    await EventData.deleteOne({ _id: monthData._id });
  } else {
    await monthData.save();
  }

  return res.json({ message: "Event deleted successfully." });
}

async function replaceMonth(req, res) {
  const month = normalizeMonth(req.params.month);
  const incomingEvents = Array.isArray(req.body.events) ? req.body.events : [];

  if (!month) {
    return res.status(400).json({ message: "A valid month is required." });
  }

  const normalizedEvents = incomingEvents.map((event, index) => ({
    name: String(event.name || "").trim(),
    goal: clampGoal(event.goal, month),
    days: normalizeDays(event.days || event.checks, month),
    order: index,
  }));

  if (normalizedEvents.some((event) => !event.name)) {
    return res.status(400).json({ message: "Every imported event must have a name." });
  }

  if (!normalizedEvents.length) {
    await EventData.deleteOne({ userId: req.userId, month });
    return res.json({ month, events: [] });
  }

  const monthData = await EventData.findOneAndUpdate(
    { userId: req.userId, month },
    {
      userId: req.userId,
      month,
      events: normalizedEvents,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return res.json(serializeMonth(monthData));
}

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  replaceMonth,
};
