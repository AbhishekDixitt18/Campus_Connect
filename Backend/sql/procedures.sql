CREATE OR REPLACE PROCEDURE sp_register_user (
  p_full_name IN VARCHAR2,
  p_email IN VARCHAR2,
  p_password_hash IN VARCHAR2,
  p_role IN VARCHAR2,
  p_phone_number IN VARCHAR2,
  p_user_id OUT NUMBER,
  p_message OUT VARCHAR2
) AS
BEGIN
  INSERT INTO users (full_name, email, password_hash, role, phone_number)
  VALUES (p_full_name, LOWER(TRIM(p_email)), p_password_hash, LOWER(TRIM(p_role)), p_phone_number)
  RETURNING user_id INTO p_user_id;

  p_message := 'User registered successfully.';
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    p_user_id := NULL;
    p_message := 'Email already exists.';
  WHEN OTHERS THEN
    p_user_id := NULL;
    p_message := 'Registration failed: ' || SQLERRM;
    RAISE;
END;
/

CREATE OR REPLACE PROCEDURE sp_validate_login (
  p_email IN VARCHAR2,
  p_user_id OUT NUMBER,
  p_role OUT VARCHAR2,
  p_password_hash OUT VARCHAR2,
  p_status OUT VARCHAR2,
  p_message OUT VARCHAR2
) AS
BEGIN
  SELECT user_id, role, password_hash
    INTO p_user_id, p_role, p_password_hash
    FROM users
   WHERE LOWER(email) = LOWER(TRIM(p_email));

  p_status := 'SUCCESS';
  p_message := 'Login data fetched successfully.';
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    p_user_id := NULL;
    p_role := NULL;
    p_password_hash := NULL;
    p_status := 'NOT_FOUND';
    p_message := 'Invalid email or password.';
  WHEN OTHERS THEN
    p_user_id := NULL;
    p_role := NULL;
    p_password_hash := NULL;
    p_status := 'ERROR';
    p_message := 'Login validation failed: ' || SQLERRM;
    RAISE;
END;
/

CREATE OR REPLACE PROCEDURE sp_create_event (
  p_title IN VARCHAR2,
  p_event_type IN VARCHAR2,
  p_department IN VARCHAR2,
  p_event_date IN DATE,
  p_event_time IN VARCHAR2,
  p_location IN VARCHAR2,
  p_description IN CLOB,
  p_image_url IN CLOB,
  p_organizer_id IN NUMBER,
  p_event_id OUT NUMBER,
  p_message OUT VARCHAR2
) AS
BEGIN
  INSERT INTO events (
    organizer_id,
    title,
    event_type,
    department,
    event_date,
    event_time,
    location,
    description,
    image_url
  ) VALUES (
    p_organizer_id,
    p_title,
    p_event_type,
    p_department,
    p_event_date,
    p_event_time,
    p_location,
    p_description,
    p_image_url
  ) RETURNING event_id INTO p_event_id;

  p_message := 'Event created successfully.';
EXCEPTION
  WHEN OTHERS THEN
    p_event_id := NULL;
    p_message := 'Event creation failed: ' || SQLERRM;
    RAISE;
END;
/

CREATE OR REPLACE PROCEDURE sp_register_event (
  p_event_id IN NUMBER,
  p_user_id IN NUMBER,
  p_registration_id OUT NUMBER,
  p_message OUT VARCHAR2
) AS
BEGIN
  INSERT INTO registrations (event_id, user_id)
  VALUES (p_event_id, p_user_id)
  RETURNING registration_id INTO p_registration_id;

  p_message := 'Event registration successful.';
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    p_registration_id := NULL;
    p_message := 'You are already registered for this event.';
  WHEN OTHERS THEN
    p_registration_id := NULL;
    p_message := 'Event registration failed: ' || SQLERRM;
    RAISE;
END;
/