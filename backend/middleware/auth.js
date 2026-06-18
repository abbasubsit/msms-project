import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

// ─── Middleware: Verify JWT & attach user to req ──────────────────────────────
export const protect = async (req, res, next) => {
    let token;

    // Check for Authorization header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(" ")[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user to request (without password & refreshToken)
            req.user = await User.findById(decoded.id).select(
                "-password -refreshToken -passwordResetToken"
            );

            if (!req.user) {
                return res
                    .status(401)
                    .json({ message: "Not authorized, user not found" });
            }

            // Check if user is active
            if (!req.user.isActive) {
                return res
                    .status(403)
                    .json({ message: "Account has been deactivated. Contact administrator." });
            }

            return next();
        } catch (error) {
            console.error("Token verification failed:", error.message);
            return res
                .status(401)
                .json({ message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
};

// ─── Middleware: Role-based Authorization ─────────────────────────────────────
/**
 * Usage: authorize('super_admin', 'pharmacist')
 * Place AFTER protect middleware in route definition.
 */
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. ${allowedRoles.join(" or ")} role required.`,
            });
        }

        next();
    };
};

// ─── Middleware: Block if first login (force password change) ─────────────────
/**
 * Blocks access to protected routes if the user has not yet changed their
 * first-time password. Place AFTER protect middleware.
 */
export const requirePasswordChange = (req, res, next) => {
    if (req.user && req.user.isFirstLogin) {
        return res.status(403).json({
            message: "Password change required before accessing this resource.",
            isFirstLogin: true,
        });
    }
    next();
};