import { Request, Response, NextFunction } from "express";
import { decode } from "next-auth/jwt";
import { logger } from "../utils/logger.js";

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email?: string;
    name?: string;
    githubId?: string;
  };
}

export async function authenticateJWT(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  // Check for Authorization header first
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  // If no Authorization header, check cookies for NextAuth session token
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(";");
    const sessionCookie = cookies.find(
      (c) =>
        c.trim().startsWith("next-auth.session-token=") ||
        c.trim().startsWith("__Secure-next-auth.session-token="),
    );

    if (sessionCookie) {
      token = decodeURIComponent(sessionCookie.split("=")[1]);
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error("NEXTAUTH_SECRET not configured");
    }

    // Use NextAuth's decode function to decrypt the session token
    const decoded = await decode({
      token,
      secret,
    });

    if (!decoded) {
      throw new Error("Invalid token");
    }

    req.userId = (decoded.id as string) || (decoded.sub as string);
    req.user = {
      id: (decoded.id as string) || (decoded.sub as string),
      email: decoded.email as string,
      name: decoded.name as string,
      githubId: decoded.githubId as string,
    };

    logger.debug("✅ Authenticated user", { userId: req.userId });

    next();
  } catch (error) {
    logger.warn("JWT verification failed", { 
      error: error instanceof Error ? error.message : error,
      path: req.path 
    });
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(";");
    const sessionCookie = cookies.find(
      (c) =>
        c.trim().startsWith("next-auth.session-token=") ||
        c.trim().startsWith("__Secure-next-auth.session-token="),
    );

    if (sessionCookie) {
      token = decodeURIComponent(sessionCookie.split("=")[1]);
    }
  }

  if (!token) {
    return next();
  }

  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return next();
    }

    const decoded = await decode({
      token,
      secret,
    });

    if (decoded) {
      req.userId = (decoded.id as string) || (decoded.sub as string);
      req.user = {
        id: (decoded.id as string) || (decoded.sub as string),
        email: decoded.email as string,
        name: decoded.name as string,
        githubId: decoded.githubId as string,
      };
    }
  } catch (error) {
    logger.debug("Optional JWT verification failed", { 
      error: error instanceof Error ? error.message : error 
    });
  }

  next();
}
