// App.tsx
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef } from '@react-navigation/native';

import { AuthProvider } from './context/AuthContext';
import RootNavigator from './navigation/RootNavigator';

import type { RootStackParamList } from './types';
import { attachNotificationListeners } from './utils/notifications';

const App = () => {
  const navRef = useRef<NavigationContainerRef<RootStackParamList> | null>(null);

  useEffect(() => {
    // ✅ Deep-link on notification tap
    const detach = attachNotificationListeners((screen, params) => {
      try {
        // React Navigation overloads can be annoying — keep this permissive
        (navRef.current as any)?.navigate(screen, params);
      } catch (e) {
        console.log('Notification navigation failed:', e);
      }
    });

    return () => detach();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer ref={navRef}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;