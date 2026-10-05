const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

if (!getApps().length) initializeApp();

const firestore = getFirestore();

const normalizePortalAddress = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
  .replace(/\s+/g, '');

async function applyResetRequestRateLimit(ipAddress) {
  const key = crypto.createHash('sha256').update(ipAddress || 'unknown').digest('hex');
  const rateLimitRef = firestore.collection('passwordResetRateLimits').doc(key);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const now = Date.now();
    const windowStartedAt = snapshot.exists ? Number(snapshot.data().windowStartedAt || 0) : 0;
    const count = snapshot.exists ? Number(snapshot.data().count || 0) : 0;
    const windowIsActive = now - windowStartedAt < 60 * 60 * 1000;
    if (windowIsActive && count >= 5) {
      throw new HttpsError('resource-exhausted', 'Terlalu banyak permintaan. Coba lagi nanti.');
    }
    transaction.set(rateLimitRef, {
      windowStartedAt: windowIsActive ? windowStartedAt : now,
      count: windowIsActive ? count + 1 : 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

exports.submitPasswordResetRequest = onCall(async (request) => {
  const username = String(request.data?.username || '').trim().toLowerCase();
  const portalAddress = normalizePortalAddress(request.data?.portalAddress);
  const employeeId = String(request.data?.employeeId || '').trim().slice(0, 160);
  const notes = String(request.data?.notes || '').trim().slice(0, 1000);
  if (username.length < 2 || username.length > 64 || !portalAddress) {
    throw new HttpsError('invalid-argument', 'Username dan alamat portal wajib diisi.');
  }

  const forwardedFor = request.rawRequest.headers['x-forwarded-for'];
  const ipAddress = request.rawRequest.ip || (Array.isArray(forwardedFor) ? forwardedFor[0] : String(forwardedFor || '').split(',')[0]);
  await applyResetRequestRateLimit(ipAddress);

  const accountSnapshots = await firestore.collection('users')
    .where('username', '==', username)
    .limit(20)
    .get();
  const matchingAccount = accountSnapshots.docs.find((snapshot) =>
    normalizePortalAddress(snapshot.data().portalAddress) === portalAddress
  );
  const requestRef = firestore.collection('passwordResetRequests').doc();
  await requestRef.set({
    ticketId: requestRef.id,
    username,
    portalAddress,
    employeeId,
    notes,
    targetUid: matchingAccount?.id || null,
    accountMatched: Boolean(matchingAccount),
    targetName: matchingAccount ? String(matchingAccount.data().name || username) : username,
    targetRole: matchingAccount ? String(matchingAccount.data().role || 'user') : 'Akun tidak ditemukan',
    targetLocation: matchingAccount ? String(matchingAccount.data().location || '') : '',
    status: 'pending',
    submittedAt: FieldValue.serverTimestamp(),
  });

  return { ticketId: requestRef.id };
});

exports.resetPasswordFromRequest = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Login admin diperlukan.');
  const ticketId = String(request.data?.ticketId || '').trim();
  if (!ticketId) throw new HttpsError('invalid-argument', 'ID tiket wajib diisi.');

  const adminSnapshot = await firestore.collection('users').doc(request.auth.uid).get();
  const admin = adminSnapshot.data();
  const adminPortal = normalizePortalAddress(admin?.portalAddress);
  if (!adminSnapshot.exists || admin?.role !== 'admin' || !adminPortal) {
    throw new HttpsError('permission-denied', 'Hanya admin portal yang dapat mereset password.');
  }

  const ticketRef = firestore.collection('passwordResetRequests').doc(ticketId);
  const ticket = await firestore.runTransaction(async (transaction) => {
    const ticketSnapshot = await transaction.get(ticketRef);
    const requestData = ticketSnapshot.data();
    if (!ticketSnapshot.exists || normalizePortalAddress(requestData?.portalAddress) !== adminPortal) {
      throw new HttpsError('not-found', 'Tiket reset tidak ditemukan di portal admin ini.');
    }
    if (requestData.status !== 'pending' || !requestData.targetUid) {
      throw new HttpsError('failed-precondition', 'Akun tidak cocok atau tiket sudah diproses.');
    }
    transaction.update(ticketRef, {
      status: 'processing',
      resetBy: request.auth.uid,
      resetStartedAt: FieldValue.serverTimestamp(),
    });
    return requestData;
  });
  if (!ticket.targetUid) {
    throw new HttpsError('failed-precondition', 'Akun tidak cocok atau tiket sudah diproses.');
  }

  const targetSnapshot = await firestore.collection('users').doc(ticket.targetUid).get();
  const target = targetSnapshot.data();
  if (!targetSnapshot.exists || normalizePortalAddress(target?.portalAddress) !== adminPortal) {
    await ticketRef.update({ status: 'pending', resetBy: FieldValue.delete(), resetStartedAt: FieldValue.delete() });
    throw new HttpsError('failed-precondition', 'Akun target tidak lagi terdaftar pada portal ini.');
  }

  const temporaryPassword = crypto.randomBytes(18).toString('base64url');
  try {
    await getAuth().updateUser(ticket.targetUid, { password: temporaryPassword });
    await ticketRef.update({
      status: 'completed',
      resetAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await ticketRef.update({ status: 'pending', resetBy: FieldValue.delete(), resetStartedAt: FieldValue.delete() });
    throw error;
  }
  return { temporaryPassword };
});