const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");

initializeApp();
const database = getFirestore();

function safeWebhookUrl(value) {
  try {
    const url = new URL(value);
    const blocked =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname.startsWith("10.") ||
      url.hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
    return url.protocol === "https:" && !blocked ? url.toString() : null;
  } catch {
    return null;
  }
}

async function deliverEvent(eventName, event) {
  const before = event.data?.before?.exists
    ? event.data.before.data()
    : null;
  const after = event.data?.after?.exists
    ? event.data.after.data()
    : null;
  const change = before && after ? "updated" : after ? "created" : "deleted";
  const payload = {
    id: event.id,
    event: eventName,
    change,
    documentId: event.params.documentId,
    occurredAt: new Date().toISOString(),
    data: after,
    previousData: before,
  };
  const subscriptions = await database
    .collection("webhookSubscriptions")
    .where("active", "==", true)
    .get();
  await Promise.allSettled(
    subscriptions.docs
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
      .filter((subscription) =>
        (subscription.events || []).includes(eventName),
      )
      .map(async (subscription) => {
        const url = safeWebhookUrl(subscription.url);
        if (!url || !subscription.secret) return;
        const body = JSON.stringify(payload);
        const signature = crypto
          .createHmac("sha256", subscription.secret)
          .update(body)
          .digest("hex");
        let status = 0;
        let delivered = false;
        let error = "";
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-friendlies-event": eventName,
              "x-friendlies-signature": `sha256=${signature}`,
            },
            body,
            signal: AbortSignal.timeout(10000),
          });
          status = response.status;
          delivered = response.ok;
          if (!response.ok) error = `HTTP ${response.status}`;
        } catch (deliveryError) {
          error = deliveryError.message || "Delivery failed";
        }
        await database.collection("webhookDeliveries").add({
          subscriptionId: subscription.id,
          eventId: event.id,
          event: eventName,
          documentId: event.params.documentId,
          status,
          delivered,
          error,
          createdAt: FieldValue.serverTimestamp(),
        });
      }),
  );
}

async function archiveFinishedMatchChat(event) {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!after || before?.status === "completed" || after.status !== "completed")
    return;
  const chats = await database
    .collection("conversations")
    .where("matchId", "==", event.params.documentId)
    .get();
  const batch = database.batch();
  chats.docs.forEach((chat) =>
    batch.update(chat.ref, {
      active: false,
      archived: true,
      closedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );
  if (!chats.empty) await batch.commit();
}

exports.matchRequestWebhook = onDocumentWritten(
  "matchRequests/{documentId}",
  (event) => deliverEvent("match_request.changed", event),
);

exports.matchWebhook = onDocumentWritten(
  "matches/{documentId}",
  async (event) => {
    await archiveFinishedMatchChat(event);
    await deliverEvent("match.changed", event);
  },
);

exports.teamMembershipWebhook = onDocumentWritten(
  "teamMembers/{documentId}",
  (event) => deliverEvent("team_membership.changed", event),
);

exports.competitionWebhook = onDocumentWritten(
  "leagues/{documentId}",
  (event) => deliverEvent("competition.changed", event),
);
