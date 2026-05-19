const bcrypt = require("bcryptjs");
const { executeQuery, callProcedure, withTransaction } = require("../config/oracle");

async function registerUser({ fullName, email, password, role, phoneNumber }) {
  console.log("[SERVICE] registerUser called with:");
  console.log("[SERVICE]   - fullName:", fullName);
  console.log("[SERVICE]   - email:", email);
  console.log("[SERVICE]   - role:", role, "| type:", typeof role);
  console.log("[SERVICE]   - phoneNumber:", phoneNumber);
  
  const passwordHash = await bcrypt.hash(password, 12);
  
  console.log("[SERVICE] Calling Oracle stored procedure sp_register_user");
  console.log("[SERVICE] Procedure params:");
  console.log("[SERVICE]   - p_full_name:", fullName);
  console.log("[SERVICE]   - p_email:", email);
  console.log("[SERVICE]   - p_password_hash: ***");
  console.log("[SERVICE]   - p_role:", role);
  console.log("[SERVICE]   - p_phone_number:", phoneNumber);
  
  const result = await callProcedure(
    `BEGIN
       sp_register_user(
         :p_full_name,
         :p_email,
         :p_password_hash,
         :p_role,
         :p_phone_number,
         :p_user_id,
         :p_message
       );
     END;`,
    {
      p_full_name: fullName,
      p_email: email,
      p_password_hash: passwordHash,
      p_role: role,
      p_phone_number: phoneNumber,
      p_user_id: { dir: require("oracledb").BIND_OUT, type: require("oracledb").NUMBER },
      p_message: { dir: require("oracledb").BIND_OUT, type: require("oracledb").STRING, maxSize: 4000 }
    }
  );

  console.log("[SERVICE] Procedure result:");
  console.log("[SERVICE]   - userId:", result.outBinds.p_user_id);
  console.log("[SERVICE]   - message:", result.outBinds.p_message);

  return {
    userId: result.outBinds.p_user_id,
    message: result.outBinds.p_message,
    passwordHash
  };
}

async function validateLogin({ email, password }) {
  const result = await callProcedure(
    `BEGIN
       sp_validate_login(
         :p_email,
         :p_user_id,
         :p_role,
         :p_password_hash,
         :p_status,
         :p_message
       );
     END;`,
    {
      p_email: email,
      p_user_id: { dir: require("oracledb").BIND_OUT, type: require("oracledb").NUMBER },
      p_role: { dir: require("oracledb").BIND_OUT, type: require("oracledb").STRING, maxSize: 100 },
      p_password_hash: { dir: require("oracledb").BIND_OUT, type: require("oracledb").STRING, maxSize: 4000 },
      p_status: { dir: require("oracledb").BIND_OUT, type: require("oracledb").STRING, maxSize: 100 },
      p_message: { dir: require("oracledb").BIND_OUT, type: require("oracledb").STRING, maxSize: 4000 }
    }
  );

  const out = result.outBinds;
  const status = String(out.p_status || "").toUpperCase();
  const passwordHash = String(out.p_password_hash || "");
  const passwordMatches = passwordHash ? await bcrypt.compare(password, passwordHash) : false;

  if (status !== "SUCCESS" || !passwordMatches) {
    return null;
  }

  return {
    userId: out.p_user_id,
    role: String(out.p_role || "student"),
    message: out.p_message || "Login successful."
  };
}

async function listEvents(filters = {}) {
  const bindValues = {
    department: filters.department || null,
    eventType: filters.eventType || null,
    searchTerm: filters.searchTerm ? `%${filters.searchTerm}%` : null
  };

  const result = await executeQuery(
    `SELECT
       e.event_id AS "id",
       e.title,
       e.event_type AS "eventType",
       e.department,
       TO_CHAR(e.event_date, 'YYYY-MM-DD') AS "date",
       TO_CHAR(e.event_time, 'HH24:MI') AS "time",
       e.location,
       e.description,
       e.image_url AS "image",
       e.image_url AS "posterImage",
       e.status,
       e.organizer_id AS "organizerId"
     FROM events e
     WHERE (:department IS NULL OR e.department = :department)
       AND (:eventType IS NULL OR e.event_type = :eventType)
       AND (
         :searchTerm IS NULL
         OR LOWER(e.title) LIKE LOWER(:searchTerm)
         OR LOWER(e.description) LIKE LOWER(:searchTerm)
       )
     ORDER BY e.event_date DESC, e.event_time DESC`,
    bindValues
  );

  return result.rows || [];
}

async function createEvent({ title, eventType, department, eventDate, eventTime, location, description, imageUrl, organizerId }) {
  const result = await callProcedure(
    `BEGIN
       sp_create_event(
         :p_title,
         :p_event_type,
         :p_department,
         :p_event_date,
         :p_event_time,
         :p_location,
         :p_description,
         :p_image_url,
         :p_organizer_id,
         :p_event_id,
         :p_message
       );
     END;`,
    {
      p_title: title,
      p_event_type: eventType,
      p_department: department,
      p_event_date: eventDate,
      p_event_time: eventTime,
      p_location: location,
      p_description: description,
      p_image_url: imageUrl || null,
      p_organizer_id: organizerId,
      p_event_id: { dir: require("oracledb").BIND_OUT, type: require("oracledb").NUMBER },
      p_message: { dir: require("oracledb").BIND_OUT, type: require("oracledb").STRING, maxSize: 4000 }
    }
  );

  return {
    eventId: result.outBinds.p_event_id,
    message: result.outBinds.p_message
  };
}

async function registerForEvent({ eventId, userId }) {
  const result = await callProcedure(
    `BEGIN
       sp_register_event(
         :p_event_id,
         :p_user_id,
         :p_registration_id,
         :p_message
       );
     END;`,
    {
      p_event_id: eventId,
      p_user_id: userId,
      p_registration_id: { dir: require("oracledb").BIND_OUT, type: require("oracledb").NUMBER },
      p_message: { dir: require("oracledb").BIND_OUT, type: require("oracledb").STRING, maxSize: 4000 }
    }
  );

  return {
    registrationId: result.outBinds.p_registration_id,
    message: result.outBinds.p_message
  };
}

async function listUserEvents({ userId, role }) {
  if (String(role || "").toLowerCase() === "organizer") {
    const result = await executeQuery(
      `SELECT
         e.event_id AS "id",
         e.title,
         e.event_type AS "eventType",
         e.department,
         TO_CHAR(e.event_date, 'YYYY-MM-DD') AS "date",
         TO_CHAR(e.event_time, 'HH24:MI') AS "time",
         e.location,
         e.description,
         e.image_url AS "image",
         e.image_url AS "posterImage",
         e.status,
         COUNT(r.registration_id) AS "registrationsCount"
       FROM events e
       LEFT JOIN registrations r ON r.event_id = e.event_id
       WHERE e.organizer_id = :userId
       GROUP BY e.event_id, e.title, e.event_type, e.department, e.event_date, e.event_time, e.location, e.description, e.image_url, e.status
       ORDER BY e.event_date DESC, e.event_time DESC`,
      { userId }
    );

    return result.rows || [];
  }

  const result = await executeQuery(
    `SELECT
       e.event_id AS "id",
       e.title,
       e.event_type AS "eventType",
       e.department,
       TO_CHAR(e.event_date, 'YYYY-MM-DD') AS "date",
       TO_CHAR(e.event_time, 'HH24:MI') AS "time",
       e.location,
       e.description,
       e.image_url AS "image",
       e.image_url AS "posterImage",
       r.status AS "registrationStatus",
       TO_CHAR(r.registered_at, 'YYYY-MM-DD HH24:MI:SS') AS "registeredAt"
     FROM registrations r
     INNER JOIN events e ON e.event_id = r.event_id
     WHERE r.user_id = :userId
     ORDER BY r.registered_at DESC`,
    { userId }
  );

  return result.rows || [];
}

module.exports = {
  registerUser,
  validateLogin,
  listEvents,
  createEvent,
  registerForEvent,
  listUserEvents,
  withTransaction
};