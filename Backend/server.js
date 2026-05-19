const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

// Import routes and middleware
const authRoutes = require("./routes/authRoutes");
const { authenticateToken, requireRole } = require("./middleware/auth");
const AuthService = require("./services/authService");

// Environment variables
const {
  PORT = 4000,
  NODE_ENV = "development",
  FRONTEND_ORIGIN = "http://127.0.0.1:5500,http://localhost:5500",
  JWT_SECRET,
  JWT_EXPIRES_IN = "7d",
  ADMIN_EMAIL = "",
  ADMIN_PASSWORD = ""
} = process.env;

// Validate required env vars
if (!JWT_SECRET) {
  console.error("❌ ERROR: JWT_SECRET is not set in .env file");
  process.exit(1);
}

// Express app setup
const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));

// CORS configuration
const allowedOrigins = String(FRONTEND_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isPrivateIpv4(hostname) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false;
  const [a, b] = hostname.split(".").map(Number);
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isDevTrustedOrigin(origin) {
  try {
    const parsed = new URL(origin);
    const hostname = String(parsed.hostname || "").toLowerCase();
    if (!hostname) return false;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      isPrivateIpv4(hostname)
    );
  } catch (_error) {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (NODE_ENV !== "production" && isDevTrustedOrigin(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: false
  })
);

// Database setup
const dbPath = path.join(__dirname, "auth.db");
const sqlite = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Database connected");
});

// Create AuthService instance
const authService = new AuthService(sqlite);

// Attach authService to app for route access
app.locals.authService = authService;

// Database helper functions
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqlite.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqlite.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqlite.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// Initialize database and routes
async function initialize() {
  try {
    console.log("📦 Initializing database...");
    await authService.initializeDatabase();
    console.log("✅ Database schema initialized");

    // Seed admin user so frontend /admin/login has a valid account.
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      const adminEmail = String(ADMIN_EMAIL).trim().toLowerCase();
      const existingAdmin = await get(
        "SELECT id FROM users WHERE email = ?",
        [adminEmail]
      );
      const adminHash = await bcrypt.hash(String(ADMIN_PASSWORD), 12);

      if (!existingAdmin) {
        await run(
          `INSERT INTO users (
            full_name,
            email,
            password_hash,
            role,
            account_type,
            first_name,
            last_name,
            username,
            email_verified,
            is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "Campus Admin",
            adminEmail,
            adminHash,
            "admin",
            "admin",
            "Campus",
            "Admin",
            "campus_admin",
            1,
            1
          ]
        );
      } else {
        await run(
          `UPDATE users
           SET password_hash = ?,
               role = 'admin',
               account_type = 'admin',
               first_name = COALESCE(first_name, 'Campus'),
               last_name = COALESCE(last_name, 'Admin'),
               username = COALESCE(username, 'campus_admin'),
               is_active = 1,
               email_verified = 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [adminHash, existingAdmin.id]
        );
      }
    }

    // Mount auth routes
    app.use("/api/auth", authRoutes);

    // Health check endpoint
    app.get("/api/health", (req, res) => {
      res.json({
        status: "ok",
        service: "campus-connect-auth-api",
        environment: NODE_ENV,
        port: PORT
      });
    });

    // Admin login endpoint expected by frontend at POST /api/admin/login
    app.post("/api/admin/login", async (req, res) => {
      try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = String(req.body?.password || "");

        if (!email || !password) {
          return res.status(400).json({ message: "Email and password are required" });
        }

        const admin = await get(
          "SELECT id, email, full_name, password_hash, role FROM users WHERE email = ? AND is_active = 1",
          [email]
        );

        if (!admin || String(admin.role || "").toLowerCase() !== "admin") {
          return res.status(401).json({ message: "Invalid admin credentials" });
        }

        const passwordOk = await bcrypt.compare(password, admin.password_hash);
        if (!passwordOk) {
          return res.status(401).json({ message: "Invalid admin credentials" });
        }

        const token = jwt.sign(
          {
            sub: String(admin.id),
            email: admin.email,
            role: "admin",
            scope: "session"
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        return res.json({
          success: true,
          message: "Admin login successful",
          token,
          user: {
            id: admin.id,
            email: admin.email,
            fullName: admin.full_name,
            role: "admin"
          }
        });
      } catch (error) {
        console.error("[ERROR] Admin login:", error.message);
        return res.status(500).json({ message: "Admin login failed" });
      }
    });

    app.get("/api/admin/users", authenticateToken, requireRole("admin"), async (_req, res) => {
      try {
        const users = await all(
          `SELECT id, first_name AS firstName, last_name AS lastName, email, account_type AS accountType, role
           FROM users
           WHERE is_active = 1
           ORDER BY created_at DESC`
        );
        return res.json({ users });
      } catch (error) {
        console.error("[ERROR] Admin users:", error.message);
        return res.status(500).json({ message: "Could not load users" });
      }
    });

    app.get("/api/admin/events", authenticateToken, requireRole("admin"), async (req, res) => {
      try {
        const status = String(req.query?.status || "All").trim();
        const params = [];
        let whereClause = "";

        if (status !== "All") {
          whereClause = " WHERE status = ?";
          params.push(status);
        }

        const events = await all(
          `SELECT id, title, department, event_type AS eventType,
                  CASE
                    WHEN status = 'ACTIVE' THEN 'Approved'
                    WHEN status = 'REJECTED' THEN 'Rejected'
                    ELSE 'Pending'
                  END AS approvalStatus,
                  status
           FROM events${whereClause}
           ORDER BY created_at DESC`,
          params
        );

        return res.json({ events });
      } catch (error) {
        console.error("[ERROR] Admin events:", error.message);
        return res.status(500).json({ message: "Could not load events" });
      }
    });

    app.get("/api/admin/registrations", authenticateToken, requireRole("admin"), async (_req, res) => {
      try {
        const registrations = await all(
          `SELECT r.id,
                  u.full_name AS fullName,
                  u.email,
                  e.title AS eventTitle,
                  e.department
           FROM registrations r
           JOIN users u ON u.id = r.user_id
           JOIN events e ON e.id = r.event_id
           ORDER BY r.registered_at DESC`
        );

        return res.json({ registrations });
      } catch (error) {
        console.error("[ERROR] Admin registrations:", error.message);
        return res.status(500).json({ message: "Could not load registrations" });
      }
    });

    app.patch("/api/admin/events/:id/approve", authenticateToken, requireRole("admin"), async (req, res) => {
      try {
        const eventId = Number(req.params.id);
        if (!Number.isInteger(eventId) || eventId <= 0) {
          return res.status(400).json({ message: "Invalid event id" });
        }

        const result = await run("UPDATE events SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [eventId]);
        if (!result.changes) {
          return res.status(404).json({ message: "Event not found" });
        }

        return res.json({ message: "Event approved" });
      } catch (error) {
        console.error("[ERROR] Admin approve event:", error.message);
        return res.status(500).json({ message: "Could not update event" });
      }
    });

    app.patch("/api/admin/events/:id/reject", authenticateToken, requireRole("admin"), async (req, res) => {
      try {
        const eventId = Number(req.params.id);
        if (!Number.isInteger(eventId) || eventId <= 0) {
          return res.status(400).json({ message: "Invalid event id" });
        }

        const result = await run("UPDATE events SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [eventId]);
        if (!result.changes) {
          return res.status(404).json({ message: "Event not found" });
        }

        return res.json({ message: "Event rejected" });
      } catch (error) {
        console.error("[ERROR] Admin reject event:", error.message);
        return res.status(500).json({ message: "Could not update event" });
      }
    });

    // Get user profile (protected)
    app.get("/api/users/profile", authenticateToken, async (req, res) => {
      try {
        const userId = req.user.sub;
        const user = await authService.getUserById(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({ user });
      } catch (error) {
        console.error("[ERROR] Get profile:", error.message);
        res.status(500).json({ message: "Could not retrieve profile" });
      }
    });

    // Get events (public - for students)
    app.get("/api/events", async (req, res) => {
      try {
        const events = await all(
          "SELECT id, title, description, date, time, location FROM events WHERE status = 'ACTIVE' ORDER BY date DESC"
        );
        res.json({ events });
      } catch (error) {
        console.error("[ERROR] Get events:", error.message);
        res.status(500).json({ message: "Could not retrieve events" });
      }
    });

    // Get user's registered events (protected)
    app.get("/api/users/events", authenticateToken, async (req, res) => {
      try {
        const userId = req.user.sub;
        const events = await all(
          `SELECT e.id as eventId, e.title, e.description, e.date, e.time, e.location, r.registered_at
           FROM events e
           JOIN registrations r ON e.id = r.event_id
           WHERE r.user_id = ?
           ORDER BY e.date DESC`,
          [userId]
        );
        res.json({ events });
      } catch (error) {
        console.error("[ERROR] Get user events:", error.message);
        res.status(500).json({ message: "Could not retrieve your events" });
      }
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error("[ERROR]", err.message);
      res.status(err.status || 500).json({
        message: err.message || "Internal server error"
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ message: "Endpoint not found" });
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 Campus Connect Auth API running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${NODE_ENV}`);
      console.log(`🗄️  Database: ${dbPath}`);
      console.log(`\n✅ Server is ready for requests\n`);
    });
  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⛔ Shutting down...");
  sqlite.close((err) => {
    if (err) {
      console.error("Error closing database:", err);
      process.exit(1);
    }
    console.log("✅ Database closed");
    process.exit(0);
  });
});

// Start the server
initialize();

module.exports = app;
