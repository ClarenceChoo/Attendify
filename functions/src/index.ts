// /**
//  * Import function triggers from their respective submodules:
//  *
//  * import {onCall} from "firebase-functions/v2/https";
//  * import {onDocumentWritten} from "firebase-functions/v2/firestore";
//  *
//  * See a full list of supported triggers at https://firebase.google.com/docs/functions
//  */

// import {setGlobalOptions} from "firebase-functions";
// import {onRequest} from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";

// // Start writing functions
// // https://firebase.google.com/docs/functions/typescript

// // For cost control, you can set the maximum number of containers that can be
// // running at the same time. This helps mitigate the impact of unexpected
// // traffic spikes by instead downgrading performance. This limit is a
// // per-function limit. You can override the limit for each function using the
// // `maxInstances` option in the function's options, e.g.
// // `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// // NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// // functions should each use functions.runWith({ maxInstances: 10 }) instead.
// // In the v1 API, each function can only serve one request per container, so
// // this will be the maximum concurrent request count.
// setGlobalOptions({ maxInstances: 10 });

// // export const helloWorld = onRequest((request, response) => {
// //   logger.info("Hello logs!", {structuredData: true});
// //   response.send("Hello from Firebase!");
// // });


import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import jwt from "jsonwebtoken";
// Use require to avoid missing type declarations for qrcode
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QRCode = require('qrcode')

admin.initializeApp();
const db = admin.firestore();

// Prefer environment variables in Cloud Functions; fallback to process.env
const JWT_SECRET = process.env.FUNCTIONS_QR_SECRET || process.env.JWT_SECRET || '';
const APP_URL = process.env.FUNCTIONS_APP_URL || process.env.APP_URL || 'https://your-project-id.web.app';

if (!JWT_SECRET) {
  throw new Error('JWT secret not configured. Set FUNCTIONS_QR_SECRET or JWT_SECRET')
}

export const generateToken = functions.https.onCall(async (data: any, context: any) => {
  if (!context || !context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
  }

  const { eventId } = data as any;
  if (!eventId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing eventId");
  }

  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();

  if (!eventSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Event not found");
  }

  const eventData = eventSnap.data();
  if (eventData?.createdBy !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not organiser");
  }

  const tokenId = db.collection("_").doc().id;

  try {
    // Sign JWT with 20s expiry
    const signedToken = jwt.sign({ eventId, tokenId }, JWT_SECRET, { expiresIn: 20 });

    // Decode to extract iat/exp (decoded may be object or null)
    const decoded: any = jwt.decode(signedToken) || {}
    const nowSec = Math.floor(Date.now() / 1000)
    const issuedAt = decoded.iat ? decoded.iat : nowSec
    const exp = decoded.exp ? decoded.exp : issuedAt + 20

    const scanUrl = `${APP_URL.replace(/\/$/, '')}/scan?token=${encodeURIComponent(signedToken)}`;

    // generate qr data url
    let qrDataUrl: string | null = null
    try {
      qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 512 })
    } catch (qrErr) {
      console.error('Failed to generate QR data URL', qrErr)
    }

    await eventRef.collection("tokens").doc(tokenId).set({
      tokenId,
      createdAt: admin.firestore.Timestamp.fromMillis(issuedAt * 1000),
      expiresAt: admin.firestore.Timestamp.fromMillis(exp * 1000),
      scanUrl,
      signedToken,
    });

    return {
      tokenId,
      scanUrl,
      expiresAt: exp * 1000,
      qrDataUrl,
    };
  } catch (err) {
    console.error('generateToken error', err)
    throw new functions.https.HttpsError('internal', 'Failed to generate token')
  }
});
