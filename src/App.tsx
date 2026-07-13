/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState } from 'react';
import { hasSeenSplash } from './input/useInputDevice';
import { SplashScreen } from './screens/SplashScreen';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { QuickMatchScreen } from './screens/QuickMatchScreen';
import { CareerScreen } from './screens/CareerScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { GameplayScreen } from './screens/GameplayScreen';
import { SquadScreen } from './screens/SquadScreen';
import { TrainingScreen } from './screens/TrainingScreen';
import { PostMatchScreen } from './screens/PostMatchScreen';
import { useGameStore } from './store/gameStore';
import { useSquadStore } from './career/squadStore';

type Screen = 'splash' | 'mainMenu' | 'quickMatch' | 'career' | 'squad' | 'training' | 'postMatch' | 'settings' | 'gameplay';
type GameplaySource = 'quickMatch' | 'career';

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (hasSeenSplash() ? 'mainMenu' : 'splash'));
  const [matchSession, setMatchSession] = useState(0);
  const [gameplaySource, setGameplaySource] = useState<GameplaySource>('quickMatch');
  const [lastResult, setLastResult] = useState<{ homeScore: number; awayScore: number }>({ homeScore: 0, awayScore: 0 });

  const startMatch = (source: GameplaySource) => {
    // Begin tracking on-pitch actions for the controlled player.
    useSquadStore.getState().startMatchTracking();
    setGameplaySource(source);
    setMatchSession((session) => session + 1);
    setScreen('gameplay');
  };

  useEffect(() => {
    const syncTestSeam = () => {
      const match = useGameStore.getState();
      window.__TEST__ = {
        screen,
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
          onStartMatch={() => startMatch('quickMatch')}
        />
      );
    case 'career':
      return (
        <CareerScreen
          onBack={() => setScreen('mainMenu')}
          onPlayMatch={() => startMatch('career')}
          onOpenSquad={() => setScreen('squad')}
          onOpenTraining={() => setScreen('training')}
        />
      );
    case 'squad':
      return <SquadScreen onBack={() => setScreen('career')} />;
    case 'training':
      return <TrainingScreen onBack={() => setScreen('career')} />;
    case 'postMatch':
      return (
        <PostMatchScreen
          homeScore={lastResult.homeScore}
          awayScore={lastResult.awayScore}
          statsLine={useSquadStore.getState().tracker.statsLine}
          counts={useSquadStore.getState().tracker.counts}
          awards={useSquadStore.getState().lastMatchAwards}
          controlledName={useSquadStore.getState().getControlled()?.name ?? 'Player'}
          onContinue={() => setScreen('career')}
        />
      );
    case 'settings':
      return <SettingsScreen onBack={() => setScreen('mainMenu')} />;
    case 'gameplay':
      return (
        <GameplayScreen
          key={matchSession}
          mode={gameplaySource}
          onExit={(result) => {
            // For career matches, award XP + show post-match screen.
            if (gameplaySource === 'career' && result) {
              const match = useGameStore.getState();
              const didWin = result.homeScore > result.awayScore ? true : result.homeScore === result.awayScore ? null : false;
              const cleanSheet = result.awayScore === 0;
              useSquadStore.getState().recordPostMatchXp(didWin, cleanSheet);
              setLastResult({ homeScore: result.homeScore, awayScore: result.awayScore });
              setScreen('postMatch');
            } else {
              setScreen(gameplaySource === 'career' ? 'career' : 'mainMenu');
            }
          }}
        />
      );
    default:
      return null;
  }
}
