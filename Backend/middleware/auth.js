const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Authenticate JWT token from Authorization header
 * Extracts user info and attaches to req.user
 */
function authenticateToken(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing authentication token" });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({ message: "Invalid authorization header" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (!payload) {
      console.debug("[AUTH] Token verified but payload is empty");
      return res.status(401).json({ message: "Invalid token" });
    }

    // Robust role extraction: support multiple payload shapes
    const roleCandidate = (
      payload.role ||
      payload.accountType ||
      payload.account_type ||
      (payload.isAdmin ? "admin" : undefined) ||
      (payload.is_admin ? "admin" : undefined) ||
      (payload.admin ? "admin" : undefined)
    );

    // Attach normalized user info to request
    req.user = {
      sub: payload.sub || payload.id || payload.userId,
      email: payload.email || payload.em || null,
      role: roleCandidate ? String(roleCandidate).toLowerCase().trim() : undefined,
      scope: payload.scope
    };

    // Debugging output for tracing auth issues
    console.debug("[AUTH] Decoded JWT payload:", payload);
    console.debug("[AUTH] Attached req.user:", req.user);

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired" });
    }
    console.debug("[AUTH] Token verification error:", error.message);
    return res.status(401).json({ message: "Invalid or malformed token" });
  }
}

/**
 * Require specific roles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userRole = String(req.user.role || "").toLowerCase().trim();
    const normalizedRoles = allowedRoles.map((role) => String(role).toLowerCase().trim());

    // Log the exact values used in the permission check
    console.debug("[AUTH] requireRole check - userRole:", userRole, "allowed:", normalizedRoles);

    if (!normalizedRoles.includes(userRole)) {
      console.debug("[AUTH] Permission denied: userRole not in allowedRoles - condition failed: !normalizedRoles.includes(userRole)");
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};