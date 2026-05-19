const bcrypt = require("bcryptjs");

/**
 * Auth Service - Handles all authentication database operations with SQLite
 * Pure functions that work with the database helper functions passed in
 */

class AuthService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Helper function to promisify database operations
   */
  _run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  _get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  _all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Initialize database schema
   */
  async initializeDatabase() {
    // Create users table
    await this._run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        phone_number TEXT,
        account_type TEXT,
        program_or_unit TEXT,
        year_or_designation TEXT,
        department TEXT,
        first_name TEXT,
        last_name TEXT,
        reg_no TEXT,
        username TEXT UNIQUE,
        email_verified INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on email for faster lookups
    await this._run(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    // Create events table
    await this._run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organizer_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_type TEXT,
        department TEXT,
        date DATE,
        time TIME,
        location TEXT,
        image_url TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create registrations table
    await this._run(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'REGISTERED',
        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(event_id, user_id)
      )
    `);

    console.log("[AuthService] Database schema initialized");
  }

  /**
   * Register a new user
   */
  async registerUser({
    fullName,
    email,
    password,
    role,
    phoneNumber,
    accountType,
    programOrUnit,
    yearOrDesignation,
    department,
    firstName,
    lastName,
    regNo,
    username
  }) {
    // Validate inputs
    if (!fullName || !email || !password || !role) {
      throw new Error("fullName, email, password, and role are required");
    }

    const normalizedRole = String(role).toLowerCase().trim();
    if (!["student", "organizer"].includes(normalizedRole)) {
      throw new Error("Role must be 'student' or 'organizer'");
    }

    // Check if user already exists
    const existingUser = await this._get(
      "SELECT id FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert new user
    const result = await this._run(
      `INSERT INTO users (
        full_name,
        email,
        password_hash,
        role,
        phone_number,
        account_type,
        program_or_unit,
        year_or_designation,
        department,
        first_name,
        last_name,
        reg_no,
        username,
        email_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        normalizedRole,
        phoneNumber || null,
        accountType || normalizedRole,
        programOrUnit || null,
        yearOrDesignation || null,
        department || null,
        firstName || null,
        lastName || null,
        regNo || null,
        username || null,
        0 // email_verified = false
      ]
    );

    return {
      userId: result.lastID,
      id: result.lastID,
      fullName,
      email: email.toLowerCase().trim(),
      role: normalizedRole,
      phoneNumber: phoneNumber || null,
      message: "Registration successful"
    };
  }

  /**
   * Validate login credentials
   */
  async validateLogin({ email, password }) {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Find user by email
    const user = await this._get(
      "SELECT * FROM users WHERE email = ? AND is_active = 1",
      [email.toLowerCase().trim()]
    );

    if (!user) {
      return null;
    }

    // Compare password
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return null;
    }

    return {
      userId: user.id,
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phone_number,
      message: "Login successful"
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    if (!userId) return null;

    const user = await this._get(
      "SELECT * FROM users WHERE id = ? AND is_active = 1",
      [userId]
    );

    if (!user) return null;

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phone_number
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    if (!email) return null;

    const user = await this._get(
      "SELECT * FROM users WHERE email = ? AND is_active = 1",
      [email.toLowerCase().trim()]
    );

    if (!user) return null;

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phone_number
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, updates) {
    if (!userId) throw new Error("User ID is required");

    const allowedFields = [
      "full_name",
      "phone_number",
      "department",
      "program_or_unit",
      "year_or_designation"
    ];

    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return await this.getUserById(userId);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    updateValues.push(userId);

    await this._run(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    return await this.getUserById(userId);
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId) {
    if (!userId) throw new Error("User ID is required");

    await this._run(
      "UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [userId]
    );

    return { message: "User deleted successfully" };
  }

  /**
   * Get all users (admin function)
   */
  async getAllUsers() {
    const users = await this._all(
      "SELECT id, full_name, email, role, created_at FROM users WHERE is_active = 1 ORDER BY created_at DESC"
    );

    return users.map((user) => ({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at
    }));
  }
}

module.exports = AuthService;
