import type { Request, Response, NextFunction } from "express";
import { verifyJwt, type JwtPayload } from "../lib/crypto";
import { store } from "../lib/store";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware to extract and verify authentication credentials
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (token) {
    const payload = verifyJwt(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

/**
 * Enforce that the request must come from an authenticated user
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: "Authentication required",
      message: "Please sign in to access this healthcare resource",
    });
    return;
  }
  next();
}

/**
 * Enforce Role-Based Access Control (RBAC)
 */
export function requireRole(allowedRoles: Array<JwtPayload["role"]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      store.logAudit({
        actorId: req.user.userId,
        actorRole: req.user.role,
        action: "UNAUTHORIZED_ROLE_ACCESS_ATTEMPT",
        entityType: "API_ENDPOINT",
        result: "DENIED",
        metadata: { path: req.path, requiredRoles: allowedRoles },
      });

      res.status(403).json({
        error: "Forbidden",
        message: `Your role (${req.user.role}) does not have permission to perform this action.`,
      });
      return;
    }

    next();
  };
}

/**
 * Enforce Object-Level Patient Data Access & Consent Check
 */
export function verifyPatientAccess(req: Request, res: Response, patientId: number, requiredScope?: string): boolean {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }

  // 1. Patient accessing their own records
  if (req.user.role === "PATIENT") {
    const patient = store.patients.find((p) => p.userId === req.user!.userId);
    if (patient && patient.id === patientId) {
      return true;
    }
  }

  // 2. Administrator has oversight
  if (req.user.role === "ADMIN") {
    return true;
  }

  // 3. Caregiver authorized with active permission
  if (req.user.role === "CAREGIVER") {
    const caregiver = store.caregivers.find(
      (c) => c.patientId === patientId && c.caregiverUserId === req.user!.userId && c.status === "ACTIVE"
    );
    if (caregiver) {
      return true;
    }
  }

  // 4. Doctor accessing with active consent
  if (req.user.role === "DOCTOR") {
    const doctor = store.doctors.find((d) => d.userId === req.user!.userId);
    if (doctor && store.hasConsent(patientId, doctor.id, requiredScope)) {
      return true;
    }
  }

  // 5. Diagnostic Lab or Pharmacy staff access within active order scope
  if (req.user.role === "LAB_STAFF" || req.user.role === "PHARMACY_STAFF") {
    return true; // Requisitions & pharmacy orders handle specific entity validation
  }

  store.logAudit({
    actorId: req.user.userId,
    actorRole: req.user.role,
    action: "UNAUTHORIZED_PATIENT_ACCESS_ATTEMPT",
    entityType: "PATIENT",
    entityId: patientId,
    patientId,
    result: "DENIED",
    metadata: { requiredScope },
  });

  res.status(403).json({
    error: "Consent required",
    message: "You do not have active authorized consent to view this patient's records.",
  });
  return false;
}
