import { verifyAccessToken } from "../utils/jwt.js";

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7);
  if (req.cookies?.access_token) return req.cookies.access_token;
  return null;
}

export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ success: false, message: "Authentication required." });

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

/** Restricts a route to admins, optionally to specific admin roles. */
export function requireAdmin(...allowedRoles) {
  return (req, res, next) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: "Authentication required." });

    try {
      const decoded = verifyAccessToken(token);
      if (decoded.type !== "admin") {
        return res.status(403).json({ success: false, message: "Admin access required." });
      }
      if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ success: false, message: "Insufficient permissions." });
      }
      req.auth = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
  };
}

export function requireUser(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ success: false, message: "Authentication required." });
  try {
    const decoded = verifyAccessToken(token);
    if (decoded.type !== "user") {
      return res.status(403).json({ success: false, message: "User access required." });
    }
    req.auth = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

/** Accepts a valid token from either a user or an admin (e.g. shared notification endpoints). */
export function requireAnyAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ success: false, message: "Authentication required." });
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

/** Attaches req.auth if a valid token is present, but never blocks the request (used for guest checkout). */
export function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.auth = verifyAccessToken(token);
  } catch {
    // ignore invalid/expired token — proceed as guest
  }
  next();
}
