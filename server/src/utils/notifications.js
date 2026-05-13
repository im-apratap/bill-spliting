import { Expo } from "expo-server-sdk";
const expo = new Expo();
export const sendPushNotifications = async (messages) => {
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Error sending push notifications:", error);
    }
  }
  return tickets;
};
