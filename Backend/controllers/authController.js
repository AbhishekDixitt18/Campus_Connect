const jwt = require("jsonwebtoken");

/**
 * Authentication Controller
 * Handles register and login requests
 */

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function createAuthResponse(user, token) {
  return {
    token,
    user: {
      id: user.userId || user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber || null
    }
  };
}

/**
 * Register endpoint handler
 */
async function register(req, res, authService) {
  try {
    const {
      fullName,
      email,
      password,
      role,
      phoneNumber,
      accountType,
      userType,
      firstName,
      lastName,
      regNo,
      username,
      department,
      programOrUnit,
      yearOrDesignation
    } = req.body;

    // Basic validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "fullName, email, and password are required"
      });
    }

    // Register user
    const user = await authService.registerUser({
      fullName,
      email,
      password,
      role: role || userType || accountType,
      phoneNumber,
      accountType: accountType || userType,
      programOrUnit,
      yearOrDesignation,
      department,
      firstName,
      lastName,
      regNo,
      username
    });

    // Create JWT token
    const token = jwt.sign(
      {
        sub: String(user.userId),
        email: user.email,
        role: user.role,
        scope: "session"
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      message: "Registration successful",
      ...createAuthResponse(user, token)
    });
  } catch (error) {
    console.error("[AUTH] Registration error:", error.message);

    if (error.message.includes("already exists")) {
      return res.status(409).json({
        message: "User with this email already exists"
      });
    }

    if (error.message.includes("must be")) {
      return res.status(400).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: "Registration failed. Please try again.",
      error: error.message
    });
  }
}

/**
 * Login endpoint handler
 */
async function login(req, res, authService) {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // Validate login
    const user = await authService.validateLogin({ email, password });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        sub: String(user.userId || user.id),
        email: user.email,
        role: user.role,
        scope: "session"
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      message: "Login successful",
      ...createAuthResponse(user, token)
    });
  } catch (error) {
    console.error("[AUTH] Login error:", error.message);

    return res.status(500).json({
      message: "Login failed. Please try again.",
      error: error.message
    });
  }
}

/**
 * Get current user profile (protected route)
 */
async function getProfile(req, res, authService) {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated"
      });
    }

    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    return res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error("[AUTH] Get profile error:", error.message);

    return res.status(500).json({
      message: "Could not retrieve profile"
    });
  }
}

/**
 * Update user profile (protected route)
 */
async function updateProfile(req, res, authService) {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated"
      });
    }

    const updates = {};

    if (req.body.fullName) updates.full_name = req.body.fullName;
    if (req.body.phoneNumber) updates.phone_number = req.body.phoneNumber;
    if (req.body.department) updates.department = req.body.department;
    if (req.body.programOrUnit) updates.program_or_unit = req.body.programOrUnit;
    if (req.body.yearOrDesignation) updates.year_or_designation = req.body.yearOrDesignation;

    const user = await authService.updateUserProfile(userId, updates);

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error("[AUTH] Update profile error:", error.message);

    return res.status(500).json({
      message: "Could not update profile"
    });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};