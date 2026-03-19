import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Busboy from "busboy";
import * as XLSX from "xlsx";

const QRCode = require("qrcode");

admin.initializeApp();
const db = admin.firestore();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const APP_URL =
  process.env.APP_URL || "https://attendify-bf098.web.app";
const SCAN_TOKEN_EXPIRY_SECONDS = 30;
const TOKEN_REFRESH_INTERVAL = SCAN_TOKEN_EXPIRY_SECONDS * 1000;

// ─── Express app ────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Types
interface UserPayload {
  id: string;
  email: string;
  role: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: UserPayload;
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────

app.post("/api/auth/register", async (req: Request, res: Response): Promise<any> => {
  const { email, name, password, role } = req.body;

  if (!email || !email.endsWith("@u.nus.edu")) {
    return res.status(400).json({ error: "Please use a valid NUS email (@u.nus.edu)" });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  try {
    const usersSnap = await db.collection("users").where("email", "==", email).get();
    if (!usersSnap.empty) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const finalRole = role === "student" || role === "organiser" ? role : "student";

    const newUser = {
      email,
      name: name || email.split("@")[0],
      role: finalRole,
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("users").add(newUser);

    const token = jwt.sign(
      { id: docRef.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    const { passwordHash: _, ...safeUser } = { id: docRef.id, ...newUser };
    res.json({ token, user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const usersSnap = await db.collection("users").where("email", "==", email).get();
    if (usersSnap.empty) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const userDoc = usersSnap.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as any;

    if (!user.passwordHash) {
      return res.status(401).json({ error: "Invalid user credentials configuration. Please register again." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ─── Auth middleware ────────────────────────────────────────────────────────

const verifyToken = (req: Request, res: Response, next: NextFunction): any => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    req.user = jwt.verify(token, JWT_SECRET) as UserPayload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ─── Scan token helpers ─────────────────────────────────────────────────────

const generateScanToken = (eventId: string): string =>
  jwt.sign({ eventId, type: "scan" }, JWT_SECRET, {
    expiresIn: `${SCAN_TOKEN_EXPIRY_SECONDS}s`,
  });

const generateScanUrl = (eventId: string): string => {
  const token = generateScanToken(eventId);
  return `${APP_URL}/scan?token=${token}&eventId=${eventId}`;
};

const verifyScanToken = (token: string, eventId: string) => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.type !== "scan") return { valid: false, error: "Invalid token type" };
    if (payload.eventId !== eventId) return { valid: false, error: "Token event mismatch" };
    return { valid: true, payload };
  } catch (error: any) {
    if (error.name === "TokenExpiredError") return { valid: false, error: "Token expired" };
    return { valid: false, error: "Invalid token" };
  }
};

// ─── QR stream (SSE) ────────────────────────────────────────────────────────

app.get("/api/events/:eventId/qr-stream", async (req: Request, res: Response): Promise<any> => {
  const eventId = req.params.eventId as string;
  const authToken = req.query.token as string;

  if (!authToken) return res.status(401).json({ error: "No token provided" });

  try {
    req.user = jwt.verify(authToken, JWT_SECRET) as UserPayload;
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });

    const event = eventSnap.data()!;
    if (event.organiserId !== req.user?.id) return res.status(403).json({ error: "Not authorised" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendQR = async () => {
      const scanUrl = generateScanUrl(eventId);
      const qrData: any = {
        scanUrl,
        refreshAt: Date.now() + TOKEN_REFRESH_INTERVAL,
        expiresAt: Date.now() + TOKEN_REFRESH_INTERVAL + 5000,
      };
      try {
        qrData.qrCode = await QRCode.toDataURL(scanUrl);
      } catch { /* ignore */ }
      res.write(`data: ${JSON.stringify(qrData)}\n\n`);
    };

    sendQR();
    const interval = setInterval(sendQR, TOKEN_REFRESH_INTERVAL);

    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/events/:eventId/generate-token", verifyToken, async (req: Request, res: Response): Promise<any> => {
  const eventId = req.params.eventId as string;
  try {
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });

    const event = eventSnap.data()!;
    if (event.organiserId !== req.user?.id) return res.status(403).json({ error: "Not authorised" });

    const scanUrl = generateScanUrl(eventId);
    const expiresAt = Date.now() + TOKEN_REFRESH_INTERVAL;

    try {
      const qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 512 });
      return res.json({ scanUrl, expiresAt, qrDataUrl });
    } catch {
      return res.json({ scanUrl, expiresAt });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Events ─────────────────────────────────────────────────────────────────

app.post("/api/events", verifyToken, async (req: Request, res: Response): Promise<any> => {
  const { title, category, venue, startTime, endTime, expectedAttendees } = req.body;
  if (!title || !category || !venue) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const eventId = `event-${Date.now()}`;
  const event = {
    id: eventId,
    title,
    category,
    venue,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    expectedAttendees: expectedAttendees || 50,
    organiserId: req.user?.id,
    status: "draft",
    checkInPhase: null,
    checkOutPhase: null,
    createdAt: new Date().toISOString(),
  };

  await db.collection("events").doc(eventId).set(event);
  res.json(event);
});

app.get("/api/events", verifyToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const snap = await db.collection("events").get();
    const allEvents = snap.docs.map((d) => d.data());
    const userEvents = allEvents.filter((e) => {
      const isOrganiser = e.organiserId === req.user?.id;
      const isFuture =
        new Date(e.startTime) > new Date() || e.status === "ongoing" || e.status === "completed";
      return isOrganiser || isFuture;
    });
    res.json(userEvents);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/events/:eventId", verifyToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const eventId = req.params.eventId as string;
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });

    const event = eventSnap.data()!;
    const attSnap = await db.collection("attendances").where("eventId", "==", eventId).get();
    const attendances = attSnap.docs.map((d) => d.data());

    res.json({ ...event, attendanceCount: attendances.length, attendances });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/api/events/:eventId/start", verifyToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const eventId = req.params.eventId as string;
    const ref = db.collection("events").doc(eventId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Event not found" });

    const event = snap.data()!;
    if (event.organiserId !== req.user?.id) return res.status(403).json({ error: "Not authorised" });

    const updates = {
      status: "ongoing",
      checkInPhase: { startedAt: new Date().toISOString(), endedAt: null },
    };
    await ref.update(updates);
    res.json({ ...event, ...updates });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/api/events/:eventId/end", verifyToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const eventId = req.params.eventId as string;
    const ref = db.collection("events").doc(eventId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Event not found" });

    const event = snap.data()!;
    if (event.organiserId !== req.user?.id) return res.status(403).json({ error: "Not authorised" });

    const updates: any = { status: "completed" };
    if (event.checkInPhase) {
      updates.checkInPhase = { ...event.checkInPhase, endedAt: new Date().toISOString() };
    }
    await ref.update(updates);
    res.json({ ...event, ...updates });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Scan & attendance ──────────────────────────────────────────────────────

app.post("/api/scan", verifyToken, async (req: Request, res: Response): Promise<any> => {
  const { token, eventId, deviceId } = req.body;

  try {
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });
    const event = eventSnap.data()!;

    const verification = verifyScanToken(token, eventId);
    if (!verification.valid) return res.status(400).json({ error: verification.error });

    const attSnap = await db
      .collection("attendances")
      .where("eventId", "==", eventId)
      .where("userId", "==", req.user?.id)
      .where("phase", "==", "check-in")
      .get();

    if (!attSnap.empty) {
      return res.status(409).json({
        error: "Already checked in",
        timestamp: attSnap.docs[0].data().timestamp,
      });
    }

    let status = "attended";
    if (event.checkInPhase) {
      const eventStart = new Date(event.startTime);
      if (new Date() > new Date(eventStart.getTime() + 15 * 60000)) {
        status = "late";
      }
    }

    const attendanceId = `attendance-${Date.now()}`;
    const attendance = {
      id: attendanceId,
      eventId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      phase: "check-in",
      timestamp: new Date().toISOString(),
      deviceId: deviceId || null,
      status,
    };

    await db.collection("attendances").doc(attendanceId).set(attendance);
    res.json({ success: true, attendance });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Attendance analytics ───────────────────────────────────────────────────

const detectSuspiciousScans = (attendances: any[]) => {
  const suspicious: any[] = [];
  const deviceMap: Record<string, any[]> = {};
  attendances.forEach((a) => {
    if (!a.deviceId) return;
    if (!deviceMap[a.deviceId]) deviceMap[a.deviceId] = [];
    deviceMap[a.deviceId].push(a);
  });
  Object.entries(deviceMap).forEach(([deviceId, scans]) => {
    if (scans.length > 1) {
      suspicious.push({
        type: "MULTIPLE_SCANS_SAME_DEVICE",
        deviceId,
        scanCount: scans.length,
        userIds: scans.map((s) => s.userId),
      });
    }
  });
  return suspicious;
};

app.get("/api/events/:eventId/attendances", verifyToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const eventId = req.params.eventId as string;
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });
    const event = eventSnap.data()!;

    if (event.organiserId !== req.user?.id) return res.status(403).json({ error: "Not authorised" });

    const attSnap = await db.collection("attendances").where("eventId", "==", eventId).get();
    const eventAttendances = attSnap.docs.map((d) => d.data());

    const summary = {
      totalScanned: eventAttendances.length,
      expected: event.expectedAttendees,
      percentage: Math.round((eventAttendances.length / event.expectedAttendees) * 100) || 0,
      byStatus: {
        attended: eventAttendances.filter((a) => a.status === "attended").length,
        late: eventAttendances.filter((a) => a.status === "late").length,
      },
      suspiciousActivity: detectSuspiciousScans(eventAttendances),
    };

    res.json({ attendances: eventAttendances, summary });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── CSV export ─────────────────────────────────────────────────────────────

app.get("/api/events/:eventId/export-csv", verifyToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const eventId = req.params.eventId as string;
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });
    const event = eventSnap.data()!;

    if (event.organiserId !== req.user?.id) return res.status(403).json({ error: "Not authorised" });

    const attSnap = await db.collection("attendances").where("eventId", "==", eventId).get();
    const eventAttendances = attSnap.docs.map((d) => d.data());

    const csv = [
      ["Email", "Timestamp", "Status", "Phase"].join(","),
      ...eventAttendances.map((a) =>
        [a.userEmail, a.timestamp, a.status || "attended", a.phase].join(",")
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="event-${eventId}-attendances.csv"`);
    res.send(csv);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Student dashboard ──────────────────────────────────────────────────────

const groupByCategory = (attendances: any[]) => {
  const counts: Record<string, number> = {};
  attendances.forEach((a) => {
    if (a.eventCategory) counts[a.eventCategory] = (counts[a.eventCategory] || 0) + 1;
  });
  return counts;
};

const computeBadges = (attendances: any[]) => {
  const badges: any[] = [];
  if (attendances.length >= 5) {
    badges.push({ name: "Community Builder", icon: "\u{1F3E2}", description: "Attended 5+ events" });
  }
  const eveningEvents = attendances.filter((a) => {
    const hour = new Date(a.timestamp).getHours();
    return hour >= 18 || hour < 6;
  });
  if (eveningEvents.length >= 3) {
    badges.push({ name: "Night Owl", icon: "\u{1F319}", description: "Attended 3+ evening events" });
  }
  const categories = groupByCategory(attendances);
  Object.entries(categories).forEach(([cat, count]) => {
    if (count >= 5) {
      badges.push({ name: `${cat} Enthusiast`, icon: "\u2B50", description: `Attended 5+ ${cat} events` });
    }
  });
  return badges;
};

app.get("/api/me/attendances", verifyToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const attSnap = await db.collection("attendances").where("userId", "==", req.user?.id).get();
    const raw = attSnap.docs.map((d) => d.data());

    const userAttendances = await Promise.all(
      raw.map(async (a) => {
        let eventTitle = "Unknown";
        let eventCategory = "Unknown";
        const evtDoc = await db.collection("events").doc(a.eventId).get();
        if (evtDoc.exists) {
          const e = evtDoc.data()!;
          eventTitle = e.title;
          eventCategory = e.category;
        }
        return { ...a, eventTitle, eventCategory };
      })
    );

    res.json({
      attendances: userAttendances,
      stats: {
        totalAttended: userAttendances.length,
        categoryCounts: groupByCategory(userAttendances),
        badges: computeBadges(userAttendances),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Organiser dashboard ────────────────────────────────────────────────────

app.get("/api/organiser/summary", verifyToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const eventsSnap = await db.collection("events").where("organiserId", "==", req.user?.id).get();
    const organisedEvents = eventsSnap.docs.map((d) => d.data());

    const summary = await Promise.all(
      organisedEvents.map(async (event) => {
        const attSnap = await db.collection("attendances").where("eventId", "==", event.id).get();
        const count = attSnap.docs.length;
        return {
          ...event,
          attendanceCount: count,
          attendanceRate: Math.round((count / (event.expectedAttendees || 1)) * 100) + "%",
        };
      })
    );

    res.json(summary);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Namelist upload & attendance status ────────────────────────────────────

const parseExcelBuffer = (buffer: Buffer): { name: string; email: string }[] => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

  const entries: { name: string; email: string }[] = [];
  for (const row of rows) {
    // Try common column header variations
    const email = (row.Email || row.email || row.EMAIL || row["E-mail"] || row["e-mail"] || "").toString().trim().toLowerCase();
    const name = (row.Name || row.name || row.NAME || row["Full Name"] || row["full name"] || "").toString().trim();
    if (email) {
      entries.push({ name: name || email.split("@")[0], email });
    }
  }
  return entries;
};

const parseMultipartFile = (req: Request): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    const chunks: Buffer[] = [];

    bb.on("file", (_fieldname: string, file: NodeJS.ReadableStream) => {
      file.on("data", (data: Buffer) => chunks.push(data));
      file.on("end", () => resolve(Buffer.concat(chunks)));
    });

    bb.on("error", (err: Error) => reject(err));
    bb.on("finish", () => {
      if (chunks.length === 0) reject(new Error("No file uploaded"));
    });

    // Firebase Cloud Functions may have already consumed the raw body
    if ((req as any).rawBody) {
      bb.end((req as any).rawBody);
    } else {
      req.pipe(bb);
    }
  });
};

// Upload a namelist Excel file for an event
app.post("/api/events/:eventId/namelist", verifyToken, async (req: Request, res: Response): Promise<any> => {
  const eventId = req.params.eventId as string;

  try {
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });

    const event = eventSnap.data()!;
    if (event.organiserId !== req.user?.id) return res.status(403).json({ error: "Not authorised" });

    const fileBuffer = await parseMultipartFile(req);
    const entries = parseExcelBuffer(fileBuffer);

    if (entries.length === 0) {
      return res.status(400).json({ error: "No valid entries found. Ensure the file has 'Name' and 'Email' columns." });
    }

    // Store each namelist entry as a sub-document
    const batch = db.batch();

    // Delete existing namelist entries for this event first
    const existing = await db.collection("namelists").where("eventId", "==", eventId).get();
    existing.docs.forEach((doc) => batch.delete(doc.ref));

    for (const entry of entries) {
      const ref = db.collection("namelists").doc();
      batch.set(ref, {
        eventId,
        name: entry.name,
        email: entry.email,
        uploadedAt: new Date().toISOString(),
      });
    }

    // Update expected attendees to match namelist size
    batch.update(db.collection("events").doc(eventId), {
      expectedAttendees: entries.length,
    });

    await batch.commit();

    res.json({ success: true, count: entries.length, entries });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to process namelist" });
  }
});

// Get the namelist for an event
app.get("/api/events/:eventId/namelist", verifyToken, async (req: Request, res: Response): Promise<any> => {
  const eventId = req.params.eventId as string;

  try {
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });

    const event = eventSnap.data()!;
    if (event.organiserId !== req.user?.id) return res.status(403).json({ error: "Not authorised" });

    const namelistSnap = await db.collection("namelists").where("eventId", "==", eventId).get();
    const namelist = namelistSnap.docs.map((d) => d.data());

    res.json({ namelist, count: namelist.length });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete the namelist for an event
app.delete("/api/events/:eventId/namelist", verifyToken, async (req: Request, res: Response): Promise<any> => {
  const eventId = req.params.eventId as string;

  try {
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });

    const event = eventSnap.data()!;
    if (event.organiserId !== req.user?.id) return res.status(403).json({ error: "Not authorised" });

    const existing = await db.collection("namelists").where("eventId", "==", eventId).get();
    const batch = db.batch();
    existing.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Get attendance status: cross-references namelist with actual attendances
app.get("/api/events/:eventId/attendance-status", verifyToken, async (req: Request, res: Response): Promise<any> => {
  const eventId = req.params.eventId as string;

  try {
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });

    const event = eventSnap.data()!;
    if (event.organiserId !== req.user?.id) return res.status(403).json({ error: "Not authorised" });

    const [namelistSnap, attSnap] = await Promise.all([
      db.collection("namelists").where("eventId", "==", eventId).get(),
      db.collection("attendances").where("eventId", "==", eventId).get(),
    ]);

    const namelist = namelistSnap.docs.map((d) => d.data());
    const attendances = attSnap.docs.map((d) => d.data());

    // Build a map of email -> attendance record
    const attendanceMap: Record<string, any> = {};
    for (const att of attendances) {
      if (att.userEmail) {
        attendanceMap[att.userEmail.toLowerCase()] = att;
      }
    }

    // Cross-reference namelist with attendances
    const statusList = namelist.map((entry) => {
      const att = attendanceMap[entry.email.toLowerCase()];
      let status: "present" | "late" | "absent" = "absent";
      let checkInTime: string | null = null;

      if (att) {
        status = att.status === "late" ? "late" : "present";
        checkInTime = att.timestamp || null;
      }

      return {
        name: entry.name,
        email: entry.email,
        status,
        checkInTime,
      };
    });

    const summary = {
      total: namelist.length,
      present: statusList.filter((s) => s.status === "present").length,
      late: statusList.filter((s) => s.status === "late").length,
      absent: statusList.filter((s) => s.status === "absent").length,
    };

    res.json({ statusList, summary });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Health ─────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// ─── Export as Cloud Function ───────────────────────────────────────────────

export const api = functions.https.onRequest(app);
