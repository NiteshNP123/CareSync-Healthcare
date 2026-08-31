import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// INSPECT AUDIT LOGS (ADMIN & COMPLIANCE REVIEW)
// ============================================================================
router.get("/audit-logs", requireAuth, requireRole(["ADMIN"]), (req, res) => {
  const { action, actorRole, patientId, limit } = req.query;
  let logs = store.auditLogs;

  if (action) {
    logs = logs.filter((l) => l.action.toLowerCase() === String(action).toLowerCase());
  }
  if (actorRole) {
    logs = logs.filter((l) => l.actorRole.toLowerCase() === String(actorRole).toLowerCase());
  }
  if (patientId) {
    logs = logs.filter((l) => l.patientId === Number(patientId));
  }

  const max = limit ? Math.min(Number(limit), 100) : 50;
  const result = logs.slice(0, max).map((log) => {
    const actorUser = log.actorId ? store.users.find((u) => u.id === log.actorId) : null;
    return {
      ...log,
      actorName: actorUser?.fullName || "System Service",
    };
  });

  res.json(result);
});

export default router;
