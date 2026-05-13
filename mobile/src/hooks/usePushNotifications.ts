import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
export const usePushNotifications = () => {
  const notificationListener = useRef<Notifications.Subscription>(null as any);
  const responseListener = useRef<Notifications.Subscription>(null as any);
  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("Notification response received:", data);
        if (data && data.groupId) {
          if (data.expenseId) {
            router.push(`/expense/${data.expenseId}` as any);
          } else {
            router.push(`/group/${data.groupId}` as any);
          }
        }
      });
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
};
