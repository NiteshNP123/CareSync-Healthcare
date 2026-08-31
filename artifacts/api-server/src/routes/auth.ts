import { Router, type IRouter } from "express";
import { hashPassword, verifyPassword, signJwt } from "../lib/crypto";
import { store } from "../lib/store";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// REGISTER USER & PROFILE
// ============================================================================
router.post("/auth/register", (req, res) => {
  const { email, password, role, fullName, phone, specialization, qualification, licenseNumber, organization, dateOfBirth, gender, emergencyContactName, emergencyContactPhone } = req.body;

  if (!email || !password || !role || !fullName) {
    res.status(400).json({ error: "Missing required registration fields (email, password, role, fullName)" });
    return;
  }

  const existing = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(409).json({ error: "User already exists with this email address" });
    return;
  }

  const userId = store.users.length + 1;
  const passwordHash = hashPassword(password);

  const newUser = {
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    role: role as any,
    fullName,
    phone: phone || null,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  store.users.push(newUser as any);

  let patientId: number | undefined;
  let doctorId: number | undefined;

  // Create Patient Profile if Patient role
  if (role === "PATIENT") {
    patientId = store.patients.length + 1;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const careSyncId = `CS-${randomSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPatient = {
      id: patientId,
      userId,
      careSyncId,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      bloodGroup: null,
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      emergencyContactRelation: null,
      idStatus: "VERIFIED",
      address: null,
      allergies: [],
      chronicConditions: [],
      createdAt: new Date(),
    };
    store.patients.push(newPatient as any);

    // Initial journey event
    store.addJourneyEvent({
      patientId,
      eventType: "REGISTRATION",
      title: "CareSync Patient Account Created",
      provider: "CareSync Platform",
      organization: "CareSync Health Network",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      description: `Welcome to CareSync. Your continuous care journey is active with CareSync ID ${careSyncId}.`,
      accent: "teal",
    });
  }

  // Create Doctor Profile if Doctor role
  if (role === "DOCTOR") {
    doctorId = store.doctors.length + 1;
    const newDoctor = {
      id: doctorId,
      userId,
      fullName,
      specialization: specialization || "General Medicine",
      qualification: qualification || "MBBS",
      licenseNumber: licenseNumber || `KMC-${Math.floor(10000 + Math.random() * 90000)}`,
      experienceYears: 5,
      organization: organization || "CareSync Clinical Network",
      location: "Bengaluru",
      fee: 750,
      rating: "4.80",
      verificationStatus: "UNDER_REVIEW",
      verificationDocuments: [],
      nextSlot: "Tomorrow, 10:00 AM",
      initials: fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2),
      bio: "Healthcare practitioner focused on longitudinal patient wellness and coordinated clinical care.",
      createdAt: new Date(),
    };
    store.doctors.push(newDoctor as any);
  }

  const token = signJwt({
    userId,
    email: newUser.email,
    role: newUser.role,
    fullName: newUser.fullName,
    patientId,
    doctorId,
  });

  store.logAudit({
    actorId: userId,
    actorRole: role,
    action: "USER_REGISTRATION",
    entityType: "USER",
    entityId: userId,
    patientId,
    result: "SUCCESS",
  });

  res.cookie("auth_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
  res.status(201).json({
    token,
    user: {
      id: userId,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
      patientId,
      doctorId,
    },
  });
});

// ============================================================================
// LOGIN
// ============================================================================
router.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    store.logAudit({
      actorRole: "UNAUTHENTICATED",
      action: "FAILED_LOGIN_ATTEMPT",
      entityType: "USER",
      result: "DENIED",
      metadata: { email },
    });

    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const patient = store.patients.find((p) => p.userId === user.id);
  const doctor = store.doctors.find((d) => d.userId === user.id);
  const member = store.organizationMembers.find((m) => m.userId === user.id);

  const token = signJwt({
    userId: user.id,
    email: user.email,
    role: user.role as any,
    fullName: user.fullName,
    patientId: patient?.id,
    doctorId: doctor?.id,
    orgId: member?.organizationId,
  });

  store.logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "USER_LOGIN",
    entityType: "USER",
    entityId: user.id,
    patientId: patient?.id,
    result: "SUCCESS",
  });

  res.cookie("auth_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      patientId: patient?.id,
      careSyncId: patient?.careSyncId,
      doctorId: doctor?.id,
      orgId: member?.organizationId,
    },
  });
});

// ============================================================================
// GET CURRENT AUTHENTICATED USER
// ============================================================================
router.get("/auth/me", requireAuth, (req, res) => {
  const user = store.users.find((u) => u.id === req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const patient = store.patients.find((p) => p.userId === user.id);
  const doctor = store.doctors.find((d) => d.userId === user.id);
  const member = store.organizationMembers.find((m) => m.userId === user.id);
  const organization = member ? store.organizations.find((o) => o.id === member.organizationId) : null;
  const caregiver = store.caregivers.find((c) => c.caregiverUserId === user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      phone: user.phone,
      patient: patient
        ? {
            id: patient.id,
            careSyncId: patient.careSyncId,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            bloodGroup: patient.bloodGroup,
            idStatus: patient.idStatus,
            allergies: patient.allergies,
            chronicConditions: patient.chronicConditions,
          }
        : null,
      doctor: doctor
        ? {
            id: doctor.id,
            specialization: doctor.specialization,
            qualification: doctor.qualification,
            organization: doctor.organization,
            fee: doctor.fee,
            rating: doctor.rating,
            verificationStatus: doctor.verificationStatus,
          }
        : null,
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            orgType: organization.orgType,
            licenseNumber: organization.licenseNumber,
          }
        : null,
      caregiver: caregiver
        ? {
            id: caregiver.id,
            patientId: caregiver.patientId,
            relationship: caregiver.relationship,
            permissions: caregiver.permissions,
          }
        : null,
    },
  });
});

// ============================================================================
// DEMO QUICK-SWITCH PERSONA
// ============================================================================
router.post("/auth/demo-switch", (req, res) => {
  const { role, userId } = req.body;

  let targetUser = userId
    ? store.users.find((u) => u.id === Number(userId))
    : store.users.find((u) => u.role === role);

  if (!targetUser) {
    targetUser = store.users[0]; // fallback to Rahul Sharma (Patient)
  }

  const patient = store.patients.find((p) => p.userId === targetUser.id);
  const doctor = store.doctors.find((d) => d.userId === targetUser.id);
  const member = store.organizationMembers.find((m) => m.userId === targetUser.id);

  const token = signJwt({
    userId: targetUser.id,
    email: targetUser.email,
    role: targetUser.role as any,
    fullName: targetUser.fullName,
    patientId: patient?.id,
    doctorId: doctor?.id,
    orgId: member?.organizationId,
  });

  store.logAudit({
    actorId: targetUser.id,
    actorRole: targetUser.role,
    action: "DEMO_ROLE_SWITCH",
    entityType: "USER",
    entityId: targetUser.id,
    patientId: patient?.id,
    result: "SUCCESS",
    metadata: { switchedToRole: targetUser.role },
  });

  res.cookie("auth_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
  res.json({
    token,
    user: {
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      fullName: targetUser.fullName,
      patientId: patient?.id,
      careSyncId: patient?.careSyncId,
      doctorId: doctor?.id,
      orgId: member?.organizationId,
    },
  });
});

// ============================================================================
// LOGOUT
// ============================================================================
router.post("/auth/logout", requireAuth, (req, res) => {
  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "USER_LOGOUT",
    entityType: "USER",
    entityId: req.user!.userId,
    result: "SUCCESS",
  });

  res.clearCookie("auth_token");
  res.json({ message: "Successfully signed out" });
});

export default router;
