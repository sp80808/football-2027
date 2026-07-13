/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { SplashScreen } from './screens/SplashScreen';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { QuickMatchScreen } from './screens/QuickMatchScreen';
import { CareerScreen } from './screens/CareerScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { GameplayScreen } from './screens/GameplayScreen';

type Screen = 'splash' | 'mainMenu' | 'quickMatch' | 'career' | 'settings' | 'gameplay';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');

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
