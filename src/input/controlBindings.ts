import type { LucideIcon } from 'lucide-react';
import { ArrowUp, ChevronsUp, Shield, Footprints, Crosshair, GitBranch, Wind, Target, Sparkles, Zap, RefreshCw, Hand } from 'lucide-react';
export type InputDevice = 'keyboard' | 'xbox' | 'playstation' | 'touch';
export type GameAction = 'move' | 'sprint' | 'shield' | 'pass' | 'shoot' | 'through' | 'lob' | 'finesse' | 'chip' | 'skill' | 'tackle' | 'slide' | 'switch' | 'press';
export interface ActionBinding { id: GameAction; label: string; icon: LucideIcon; keyboard: string[]; xbox: string[]; playstation: string[]; touch: string; }
export const CONTROL_BINDINGS: ActionBinding[] = [
  { id: 'move', label: 'Move', icon: ArrowUp, keyboard: ['W','A','S','D'], xbox: ['L Stick'], playstation: ['L Stick'], touch: 'Stick' },
  { id: 'sprint', label: 'Sprint', icon: ChevronsUp, keyboard: ['Shift'], xbox: ['RT'], playstation: ['R2'], touch: '—' },
  { id: 'shield', label: 'Shield', icon: Shield, keyboard: ['Ctrl'], xbox: ['LT'], playstation: ['L2'], touch: '—' },
  { id: 'pass', label: 'Pass', icon: Footprints, keyboard: ['F','Space'], xbox: ['A'], playstation: ['×'], touch: 'Pass' },
  { id: 'shoot', label: 'Shoot', icon: Crosshair, keyboard: ['G','Enter'], xbox: ['B'], playstation: ['○'], touch: 'Shot' },
  { id: 'through', label: 'Through', icon: GitBranch, keyboard: ['R'], xbox: ['Y'], playstation: ['△'], touch: 'Thru' },
  { id: 'lob', label: 'Lob', icon: Wind, keyboard: ['E'], xbox: ['X'], playstation: ['□'], touch: 'Lob' },
  { id: 'finesse', label: 'Finesse', icon: Target, keyboard: ['Q'], xbox: ['RB'], playstation: ['R1'], touch: 'Fin' },
  { id: 'chip', label: 'Chip', icon: Sparkles, keyboard: ['Alt'], xbox: ['LB'], playstation: ['L1'], touch: 'Chip' },
  { id: 'skill', label: 'Skill', icon: Sparkles, keyboard: ['C'], xbox: ['RS'], playstation: ['R3'], touch: 'Skill' },
  { id: 'tackle', label: 'Tackle', icon: Zap, keyboard: ['T'], xbox: ['B'], playstation: ['○'], touch: '—' },
  { id: 'slide', label: 'Slide', icon: Zap, keyboard: ['X','Shift+T'], xbox: ['X'], playstation: ['□'], touch: '—' },
  { id: 'switch', label: 'Switch', icon: RefreshCw, keyboard: ['Tab'], xbox: ['LB'], playstation: ['L1'], touch: '—' },
  { id: 'press', label: '2nd Press', icon: Hand, keyboard: ['Q hold'], xbox: ['RB hold'], playstation: ['R1 hold'], touch: '—' },
];
export const CORE_BINDINGS = CONTROL_BINDINGS.filter((b) => ['pass','shoot','sprint','through','finesse','tackle'].includes(b.id));
export function getGlyphsForDevice(binding: ActionBinding, device: InputDevice): string[] {
  switch (device) {
    case 'keyboard': return binding.keyboard;
    case 'xbox': return binding.xbox;
    case 'playstation': return binding.playstation;
    case 'touch': return binding.touch === '—' ? [] : [binding.touch];
    default: return binding.keyboard;
  }
}
export function deviceLabel(device: InputDevice): string {
  switch (device) {
    case 'keyboard': return 'Keyboard';
    case 'xbox': return 'Xbox Controller';
    case 'playstation': return 'PlayStation Controller';
    case 'touch': return 'Touch';
    default: return 'Keyboard';
  }
}
