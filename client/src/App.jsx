import { useEffect, useState } from 'react';
import { ROOM_STATUS, describeSelection } from '@capitals-quiz/shared';
import { AppShell } from './components/AppShell.jsx';
import { NameScreen } from './screens/NameScreen.jsx';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { SoloSetupScreen, SOLO_DEFAULTS } from './screens/SoloSetupScreen.jsx';
import { SoloGameScreen } from './screens/SoloGameScreen.jsx';
import { SoloResultsScreen } from './screens/SoloResultsScreen.jsx';
import { MultiplayerHomeScreen } from './screens/MultiplayerHomeScreen.jsx';
import { CreateRoomScreen } from './screens/CreateRoomScreen.jsx';
import { JoinRoomScreen } from './screens/JoinRoomScreen.jsx';
import { LobbyScreen } from './screens/LobbyScreen.jsx';
import { MatchScreen } from './screens/MatchScreen.jsx';
import { MatchResultsScreen } from './screens/MatchResultsScreen.jsx';
import { useMultiplayer } from './hooks/useMultiplayer.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { STORAGE_KEYS, getPlayerId } from './lib/storage.js';

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export default function App() {
  const [name, setName] = useLocalStorage(STORAGE_KEYS.name, '');
  const [avatar, setAvatar] = useLocalStorage(STORAGE_KEYS.avatar, '🌍');
  const [theme, setTheme] = useLocalStorage(STORAGE_KEYS.theme, prefersDark() ? 'dark' : 'light');
  const [soundOn, setSoundOn] = useLocalStorage(STORAGE_KEYS.sound, true);

  const profile = { name, avatar, playerId: getPlayerId() };

  const [route, setRoute] = useState(name ? 'home' : 'name');
  const [soloSettings, setSoloSettings] = useState(SOLO_DEFAULTS);
  const [soloResults, setSoloResults] = useState(null);
  /** Bumped to force a brand-new quiz when replaying with the same settings. */
  const [soloRun, setSoloRun] = useState(0);

  const mp = useMultiplayer(profile);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const goHome = () => {
    if (mp.room) mp.leaveRoom();
    setSoloResults(null);
    setRoute('home');
  };

  const saveProfile = ({ name: nextName, avatar: nextAvatar }) => {
    setName(nextName);
    setAvatar(nextAvatar);
    setRoute('home');
  };

  const startSolo = (settings) => {
    setSoloSettings(settings);
    setSoloResults(null);
    setSoloRun((n) => n + 1);
    setRoute('solo-game');
  };

  const shell = (props, children) => (
    <AppShell
      {...props}
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      soundOn={soundOn}
      onToggleSound={() => setSoundOn(!soundOn)}
    >
      {children}
    </AppShell>
  );

  /* ---- name gate ---- */
  if (!name || route === 'name') {
    return shell(
      { title: 'Welcome' },
      <NameScreen profile={profile} onSave={saveProfile} />,
    );
  }

  /* ---- an active room owns the screen ---- */
  if (mp.room) {
    const inMatch =
      mp.room.status === ROOM_STATUS.IN_PROGRESS || mp.room.status === ROOM_STATUS.PAUSED;

    if (inMatch) {
      return shell(
        {
          title: 'Live match',
          subtitle: `Room ${mp.room.code} · ${describeSelection(mp.room.settings.selection)}`,
        },
        <MatchScreen
          room={mp.room}
          me={mp.me}
          opponent={mp.opponent}
          question={mp.question}
          reveal={mp.reveal}
          paused={mp.paused}
          lockedAnswer={mp.lockedAnswer}
          onAnswer={mp.answer}
          soundOn={soundOn}
        />,
      );
    }

    if (mp.summary) {
      return shell(
        { title: 'Match result', subtitle: `Room ${mp.room.code}` },
        <MatchResultsScreen
          summary={mp.summary}
          profile={profile}
          soundOn={soundOn}
          onRematch={mp.rematch}
          onNewGame={() => {
            mp.leaveRoom();
            setRoute('mp-home');
          }}
          onHome={goHome}
        />,
      );
    }

    return shell(
      { title: mp.room.status === ROOM_STATUS.WAITING ? 'Waiting room' : 'Lobby', onBack: goHome },
      <LobbyScreen
        room={mp.room}
        me={mp.me}
        opponent={mp.opponent}
        onToggleReady={mp.setReady}
        onLeave={goHome}
      />,
    );
  }

  /* ---- everything else is plain routing ---- */
  switch (route) {
    case 'solo-setup':
      return shell(
        { title: 'Solo quiz', subtitle: 'Pick a set and go', onBack: () => setRoute('home') },
        <SoloSetupScreen initialSettings={soloSettings} onStart={startSolo} />,
      );

    case 'solo-game':
      return shell(
        {
          title: describeSelection(soloSettings.selection),
          onBack: () => setRoute('solo-setup'),
        },
        <SoloGameScreen
          key={soloRun}
          settings={soloSettings}
          soundOn={soundOn}
          onFinish={(results) => {
            setSoloResults(results);
            setRoute('solo-results');
          }}
        />,
      );

    case 'solo-results':
      return shell(
        { title: 'Your results', onBack: goHome },
        <SoloResultsScreen
          profile={profile}
          results={soloResults}
          soundOn={soundOn}
          onPlayAgain={() => startSolo(soloSettings)}
          onNewQuiz={() => setRoute('solo-setup')}
          onHome={goHome}
        />,
      );

    case 'mp-home':
      return shell(
        { title: 'Multiplayer', onBack: () => setRoute('home') },
        <>
          {mp.notice && (
            <p className="error" role="alert">
              {mp.notice}{' '}
              <button type="button" className="link" onClick={mp.dismissNotice}>
                Dismiss
              </button>
            </p>
          )}
          <MultiplayerHomeScreen
            connected={mp.connected}
            onCreate={() => setRoute('mp-create')}
            onJoin={() => setRoute('mp-join')}
          />
        </>,
      );

    case 'mp-create':
      return shell(
        { title: 'Create a room', onBack: () => setRoute('mp-home') },
        <CreateRoomScreen connected={mp.connected} onCreate={mp.createRoom} />,
      );

    case 'mp-join':
      return shell(
        { title: 'Join a room', onBack: () => setRoute('mp-home') },
        <JoinRoomScreen profile={profile} connected={mp.connected} onJoin={mp.joinRoom} />,
      );

    case 'home':
    default:
      return shell(
        { title: 'Capitals Quiz' },
        <HomeScreen
          profile={profile}
          onSolo={() => setRoute('solo-setup')}
          onMultiplayer={() => setRoute('mp-home')}
          onEditProfile={() => setRoute('name')}
        />,
      );
  }
}
