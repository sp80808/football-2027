/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState } from 'react';
import { SplashScreen } from './screens/SplashScreen';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { QuickMatchScreen } from './screens/QuickMatchScreen';
import { CareerScreen } from './screens/CareerScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { GameplayScreen } from './screens/GameplayScreen';
import { useGameStore } from './store/gameStore';

type Screen = 'splash' | 'mainMenu' | 'quickMatch' | 'career' | 'settings' | 'gameplay';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const screenRef = useRef(screen);
  screenRef.current = screen;

  useEffect(() => {
    const syncTestSeam = () => {
      const match = useGameStore.getState();
      window.__TEST__ = {
        screen: screenRef.current,
        phase: match.phase,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      };
    };

    syncTestSeam();
    const unsubscribe = useGameStore.subscribe(syncTestSeam);
    return () => {
      unsubscribe();
      delete window.__TEST__;
    };
  }, [screen]);

  switch (screen) {
    case 'splash':
      return <SplashScreen onStart={() => setScreen('mainMenu')} />;
    case 'mainMenu':
      return (
        <MainMenuScreen
          onNavigate={(target) => {
            if (target === 'quickMatch') setScreen('quickMatch');
            else if (target === 'career') setScreen('career');
            else setScreen('settings');
          }}
        />
      );
    case 'quickMatch':
      return (
        <QuickMatchScreen
          onBack={() => setScreen('mainMenu')}
          onStartMatch={() => setScreen('gameplay')}
        />
      );
    case 'career':
      return (
        <CareerScreen
          onBack={() => setScreen('mainMenu')}
          onPlayMatch={() => setScreen('gameplay')}
        />
      );
    case 'settings':
      return <SettingsScreen onBack={() => setScreen('mainMenu')} />;
    case 'gameplay':
      return <GameplayScreen onExit={() => setScreen('mainMenu')} />;
    default:
      return null;
  }
}
