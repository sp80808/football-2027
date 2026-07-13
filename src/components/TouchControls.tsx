import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Vec2 } from '../engine/Math';
import { ControllerFrame } from '../engine/Intent';
import { InputSystem } from '../engine/InputSystem';
import { Crosshair, Footprints, GitBranch, Sparkles, Wind, Target } from 'lucide-react';
import { springSnappy, tapScale, useReducedMotion } from '../ui/motionPresets';

interface TouchControlsProps {
  input: InputSystem;
}

type TouchButton = 'pass' | 'shoot' | 'through' | 'lob' | 'finesse' | 'chip' | 'skill';

function TouchButtonPad({
  label,
  icon,
  active,
  onDown,
  onUp,
  className = '',
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onDown: () => void;
  onUp: () => void;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [rippling, setRippling] = useState(false);

  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={tapScale(reduced, 0.9)}
      transition={springSnappy}
      className={`relative flex h-14 w-14 flex-col items-center justify-center overflow-hidden rounded-full border text-[9px] font-semibold uppercase tracking-wide transition-colors select-none touch-none ${active ? 'border-white/60 bg-white/25 text-white' : 'border-white/20 bg-black/50 text-white/80'} ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        if (!reduced) setRippling(true);
        onDown();
      }}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
    >
      {rippling && !reduced && (
        <motion.span
          initial={{ scale: 0.4, opacity: 0.5 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded-full bg-white/25"
          onAnimationComplete={() => setRippling(false)}
        />
      )}
      <span className="relative z-10 flex flex-col items-center">
        {icon}
        <span className="mt-0.5">{label}</span>
      </span>
    </motion.button>
  );
}

export function TouchControls({ input }: TouchControlsProps) {
  const stickOrigin = useRef<{ x: number; y: number } | null>(null);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState<Set<TouchButton>>(new Set());
  const frameRef = useRef<Partial<ControllerFrame>>({});

  const syncInput = useCallback(() => {
    const h = held;
    const stick = new Vec2(stickOffset.x, stickOffset.y);
    if (stick.magSq() > 1) stick.normalize();

    frameRef.current = {
      leftStick: stick,
      passHeld: h.has('pass'),
      shootHeld: h.has('shoot'),
      throughPassHeld: h.has('through'),
      lobHeld: h.has('lob'),
      finesseHeld: h.has('finesse'),
      chipHeld: h.has('chip'),
      skillPressed: h.has('skill'),
      sprint: 0,
      shield: 0,
    };
    input.applyTouchOverrides(frameRef.current);
  }, [held, input, stickOffset]);

  const setButton = (button: TouchButton, down: boolean) => {
    setHeld((prev) => {
      const next = new Set(prev);
      if (down) next.add(button);
      else next.delete(button);
      return next;
    });
  };

  React.useEffect(() => { syncInput(); }, [syncInput]);

  const onStickStart = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    stickOrigin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stickOrigin.current) return;
    const dx = e.clientX - stickOrigin.current.x;
    const dy = e.clientY - stickOrigin.current.y;
    const max = 42;
    const mag = Math.hypot(dx, dy);
    const scale = mag > max ? max / mag : 1;
    setStickOffset({ x: (dx * scale) / max, y: -(dy * scale) / max });
  };

  const onStickEnd = () => {
    stickOrigin.current = null;
    setStickOffset({ x: 0, y: 0 });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 md:hidden">
      <div
        className="pointer-events-auto absolute bottom-8 left-6 h-28 w-28 rounded-full border border-white/15 bg-black/35 touch-none"
        onPointerDown={onStickStart}
        onPointerMove={onStickMove}
        onPointerUp={onStickEnd}
        onPointerCancel={onStickEnd}
      >
        <div
          className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30"
          style={{ transform: `translate(calc(-50% + ${stickOffset.x * 36}px), calc(-50% + ${-stickOffset.y * 36}px))` }}
        />
      </div>

      <div className="pointer-events-auto absolute bottom-8 right-6 flex flex-col items-end gap-3">
        <div className="flex gap-2">
          <TouchButtonPad label="Lob" icon={<Wind size={16} />} active={held.has('lob')} onDown={() => setButton('lob', true)} onUp={() => setButton('lob', false)} />
          <TouchButtonPad label="Thru" icon={<GitBranch size={16} />} active={held.has('through')} onDown={() => setButton('through', true)} onUp={() => setButton('through', false)} />
        </div>
        <div className="flex gap-2">
          <TouchButtonPad label="Pass" icon={<Footprints size={16} />} active={held.has('pass')} onDown={() => setButton('pass', true)} onUp={() => setButton('pass', false)} className="h-16 w-16" />
          <TouchButtonPad label="Shot" icon={<Crosshair size={16} />} active={held.has('shoot')} onDown={() => setButton('shoot', true)} onUp={() => setButton('shoot', false)} className="h-16 w-16 border-red-400/40" />
        </div>
        <div className="flex gap-2">
          <TouchButtonPad label="Fin" icon={<Target size={16} />} active={held.has('finesse')} onDown={() => setButton('finesse', true)} onUp={() => setButton('finesse', false)} />
          <TouchButtonPad label="Chip" icon={<Sparkles size={16} />} active={held.has('chip')} onDown={() => setButton('chip', true)} onUp={() => setButton('chip', false)} />
          <TouchButtonPad label="Skill" icon={<Sparkles size={16} />} active={held.has('skill')} onDown={() => setButton('skill', true)} onUp={() => setButton('skill', false)} />
        </div>
      </div>
    </div>
  );
}
