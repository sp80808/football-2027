import React, { useState, useEffect, useRef } from 'react';
import { RenderingPanel } from '../debug/RenderingPanel';
import { GameEngine } from '../engine/GameEngine';
import { SimulationWorkerClient } from '../bridge/SimulationWorkerClient';
import { HUD } from '../components/HUD';
import { WorldState } from '../engine/WorldState';
import { Play, Pause, SkipBack, SkipForward, ArrowRightLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/Button';

// Initialize the TS engine
const tsEngine = new GameEngine();
tsEngine.init();

// Initialize the WASM worker client
const wasmClient = new SimulationWorkerClient();
wasmClient.init();

interface GameplayScreenProps {
  onExit: () => void;
}

export const GameplayScreen: React.FC<GameplayScreenProps> = ({ onExit }) => {
  const [useWasm, setUseWasm] = useState(false);
  const [, setForceRender] = useState({});
  const [replayMode, setReplayMode] = useState(false);
  const replayModeRef = useRef(false);
  const [replayFrame, setReplayFrame] = useState(0);
  const [showOffsideLine, setShowOffsideLine] = useState(false);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  
  const replayItems = useRef<WorldState[]>([]);

  useEffect(() => {
    let reqId: number;

    const loop = (time: number) => {
      reqId = requestAnimationFrame(loop);
      
      if (!replayModeRef.current) {
        tsEngine.update(time);
      }
      
      const input = tsEngine.input.currentFrame;
      wasmClient.submitInput(input);

      if (Math.random() < 0.1) {
        setForceRender({});
      }
    };
    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, []);

  useEffect(() => {
    if (!replayMode || !isPlayingReplay) return;
    
    let reqId: number;
    let lastTime = performance.now();
    
    const playLoop = (time: number) => {
      reqId = requestAnimationFrame(playLoop);
      const dt = time - lastTime;
      if (dt > 1000 / 60) {
        setReplayFrame(prev => {
          if (prev >= replayItems.current.length - 1) {
            setIsPlayingReplay(false);
            return prev;
          }
          return Math.min(prev + 2, replayItems.current.length - 1);
        });
        lastTime = time;
      }
    };
    
    reqId = requestAnimationFrame(playLoop);
    return () => cancelAnimationFrame(reqId);
  }, [replayMode, isPlayingReplay]);

  const handleToggleReplay = () => {
    if (!replayMode) {
      replayItems.current = tsEngine.replayBuffer.getItems();
      setReplayFrame(Math.max(0, replayItems.current.length - 1));
      setReplayMode(true);
      replayModeRef.current = true;
      setIsPlayingReplay(false);
    } else {
      setReplayMode(false);
      replayModeRef.current = false;
      setIsPlayingReplay(false);
    }
  };

  const currentReplayState = replayMode && replayItems.current.length > 0 
    ? replayItems.current[replayFrame] 
    : null;

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <RenderingPanel 
        useWasm={useWasm} 
        engine={tsEngine} 
        wasmClient={wasmClient} 
        replayState={currentReplayState}
        showOffsideLine={replayMode && showOffsideLine}
      />
      
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <Button 
          variant="secondary"
          onClick={() => setUseWasm(!useWasm)}
        >
          <ArrowRightLeft size={16} />
          {useWasm ? 'Using WASM Core' : 'Using TS Core'}
        </Button>
        <Button 
          variant={replayMode ? 'danger' : 'primary'}
          onClick={handleToggleReplay}
        >
          {replayMode ? (
            <>Exit Replay</>
          ) : (
            <>
              <Play size={16} /> Instant Replay
            </>
          )}
        </Button>
      </div>

      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <Button variant="danger" size="sm" onClick={onExit}>
          <X size={16} /> Exit Match
        </Button>
      </div>

      <AnimatePresence>
        {replayMode && (
          <motion.div 
            initial={{ y: 100, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 100, opacity: 0, x: '-50%' }}
            className="absolute bottom-10 left-1/2 z-20 bg-slate-900/90 p-6 rounded-xl text-white flex flex-col items-center gap-5 min-w-[500px] shadow-2xl border border-slate-700 backdrop-blur-sm"
          >
            <div className="flex justify-between w-full items-center">
              <h2 className="m-0 text-red-500 text-lg font-bold flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                REPLAY MODE
              </h2>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={showOffsideLine} 
                  onChange={(e) => setShowOffsideLine(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                Show Offside Line
              </label>
            </div>
            
            <div className="w-full flex gap-4 items-center">
              <span className="font-mono text-sm text-slate-400">-5s</span>
              <input 
                type="range" 
                min={0} 
                max={Math.max(0, replayItems.current.length - 1)} 
                value={replayFrame} 
                onChange={(e) => {
                  setReplayFrame(parseInt(e.target.value));
                  setIsPlayingReplay(false);
                }}
                className="flex-1 cursor-pointer accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none"
              />
              <span className="font-mono text-sm text-slate-400">NOW</span>
            </div>
            
            <div className="flex gap-4 items-center">
              <button 
                onClick={() => { setReplayFrame(0); setIsPlayingReplay(false); }}
                className="bg-transparent border-none text-slate-300 hover:text-white cursor-pointer p-2 flex items-center justify-center transition-colors"
              >
                <SkipBack size={24} />
              </button>
              <button 
                onClick={() => setIsPlayingReplay(!isPlayingReplay)}
                className="bg-blue-500 hover:bg-blue-600 border-none text-white cursor-pointer p-3 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg"
              >
                {isPlayingReplay ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </button>
              <button 
                onClick={() => { setReplayFrame(Math.max(0, replayItems.current.length - 1)); setIsPlayingReplay(false); }}
                className="bg-transparent border-none text-slate-300 hover:text-white cursor-pointer p-2 flex items-center justify-center transition-colors"
              >
                <SkipForward size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HUD engine={tsEngine} />
    </div>
  );
};
