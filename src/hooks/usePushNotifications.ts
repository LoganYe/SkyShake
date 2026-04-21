import { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if push notifications are supported
    if (Capacitor.isNativePlatform()) {
      setIsSupported(true);
      initializePushNotifications();
    }
  }, []);

  const initializePushNotifications = async () => {
    try {
      // Request permission
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();
      }

      // On success, get the registration token
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token:', token.value);
        setToken(token.value);
      });

      // Handle errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      // Handle incoming notifications
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
      });

      // Handle notification tap
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification);
      });
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  const sendTurbulenceAlert = async (flightNumber: string, turbulenceLevel: string) => {
    // This would typically send a notification via your backend
    // For now, we'll just log it
    console.log(`Turbulence alert for ${flightNumber}: ${turbulenceLevel}`);
    
    if (Capacitor.isNativePlatform()) {
      // Schedule a local notification as a demo
      await PushNotifications.createChannel({
        id: 'turbulence-alerts',
        name: 'Turbulence Alerts',
        description: 'Notifications about flight turbulence',
        importance: 5,
        visibility: 1,
      });
    }
  };

  return {
    isSupported,
    token,
    sendTurbulenceAlert,
  };
};