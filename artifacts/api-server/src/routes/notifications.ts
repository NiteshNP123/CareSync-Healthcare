import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// GET USER NOTIFICATIONS
// ============================================================================
router.get("/notifications", requireAuth, (req, res) => {
  const userId = req.user!.userId;
  const list = store.notifications.filter((n) => n.userId === userId);
  res.json(list);
});

// ============================================================================
// MARK NOTIFICATION AS READ
// ============================================================================
router.patch("/notifications/:id/read", requireAuth, (req, res) => {
  const notifId = Number(req.params.id);
  const notif = store.notifications.find((n) => n.id === notifId && n.userId === req.user!.userId);

  if (!notif) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  notif.isRead = true;
  res.json({ message: "Notification marked as read", notification: notif });
});

// ============================================================================
// MARK ALL AS READ
// ============================================================================
router.post("/notifications/read-all", requireAuth, (req, res) => {
  const userId = req.user!.userId;
  store.notifications.forEach((n) => {
    if (n.userId === userId) {
      n.isRead = true;
    }
  });

  res.json({ message: "All notifications marked as read" });
});

export default router;
