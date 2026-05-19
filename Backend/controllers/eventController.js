const { createEvent, listEvents, registerForEvent, listUserEvents } = require("../services/oracleService");

async function getEvents(req, res) {
  try {
    const events = await listEvents({
      department: req.query.department,
      eventType: req.query.eventType,
      searchTerm: req.query.search
    });

    return res.json({ events });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch events.", error: error.message });
  }
}

async function postEvent(req, res) {
  try {
    const user = req.user || {};
    const payload = req.body || {};

    const created = await createEvent({
      title: payload.title,
      eventType: payload.eventType,
      department: payload.department,
      eventDate: payload.eventDate,
      eventTime: payload.eventTime,
      location: payload.location,
      description: payload.description,
      imageUrl: payload.imageUrl,
      organizerId: Number(user.sub)
    });

    return res.status(201).json({
      message: created.message,
      eventId: created.eventId
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not create event.", error: error.message });
  }
}

async function registerEvent(req, res) {
  try {
    const { eventId } = req.body || {};
    if (!eventId) {
      return res.status(400).json({ message: "eventId is required." });
    }

    const created = await registerForEvent({
      eventId: Number(eventId),
      userId: Number(req.user.sub)
    });

    return res.status(201).json({
      message: created.message,
      registrationId: created.registrationId
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not register for event.", error: error.message });
  }
}

async function getUserEvents(req, res) {
  try {
    const events = await listUserEvents({
      userId: Number(req.user.sub),
      role: req.user.role
    });

    return res.json({ events });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch user events.", error: error.message });
  }
}

module.exports = {
  getEvents,
  postEvent,
  registerEvent,
  getUserEvents
};