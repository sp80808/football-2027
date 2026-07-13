import React from 'react';
import { Gamepad2, Keyboard, Smartphone } from 'lucide-react';
import { type ActionBinding, type GameAction, type InputDevice, CONTROL_BINDINGS, CORE_BINDINGS, deviceLabel, getGlyphsForDevice } from '../input/controlBindings';
import { useInputDevice } from '../input/useInputDevice';
import { GLYPH_PILL, TYPO, cn } from '../ui/designTokens';
const XBOX: Record<string,string> = { A:'border-emerald-400/40 bg-emerald-500/20 text-emerald-200', B:'border-red-400/40 bg-red-500/20 text-red-200', X:'border-sky-400/40 bg-sky-500/20 text-sky-200', Y:'border-amber-400/40 bg-amber-500/20 text-amber-200' };
const PS: Record<string,string> = { '×':'border-blue-400/40 bg-blue-500/20 text-blue-200', '○':'border-rose-400/40 bg-rose-500/20 text-rose-200', '□':'border-fuchsia-400/40 bg-fuchsia-500/20 text-fuchsia-200', '△':'border-emerald-400/40 bg-emerald-500/20 text-emerald-200' };
const color = (t:string,d:InputDevice) => d==='xbox'?XBOX[t]??'border-border-strong bg-white/10 text-text-primary':d==='playstation'?PS[t]??'border-border-strong bg-white/10 text-text-primary':d==='touch'?'border-cyan-400/30 bg-cyan-500/15 text-cyan-200':'border-border-strong bg-white/10 font-mono text-[10px] text-text-primary';
export function ControlGlyph({ token, device='keyboard' }: { token: string; device?: InputDevice }) {
  if (token==='—') return <span className={cn(GLYPH_PILL,'min-h-[22px] min-w-[22px] border-border bg-transparent text-text-subtle')}>—</span>;
  return <span className={cn(GLYPH_PILL,'min-h-[22px] min-w-[22px] text-[10px]',color(token,device))}>{token}</span>;
}
export function ControlBindingRow({ binding, device, compact=false }: { binding: ActionBinding; device: InputDevice; compact?: boolean }) {
  const Icon=binding.icon; const glyphs=getGlyphsForDevice(binding,device); if(!glyphs.length) return null;
  return <li className={cn('flex items-center',compact?'gap-2':'gap-2.5')}><span className="shrink-0 text-text-muted"><Icon size={compact?11:12}/></span><span className={cn('shrink-0 text-text-secondary',compact?'w-14 text-[10px]':'w-[72px] text-[11px]')}>{binding.label}</span><span className="flex flex-wrap gap-1">{glyphs.map((g,i)=><ControlGlyph key={`${binding.id}-${g}-${i}`} token={g} device={device}/>)}</span></li>;
}
function DeviceBadge({ device }: { device: InputDevice }) {
  const Icon = device==='keyboard'?Keyboard:device==='touch'?Smartphone:Gamepad2;
  return <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted"><Icon size={12}/>{deviceLabel(device)}</span>;
}
export function ControlBindingsPanel({ device: deviceProp, bindings=CONTROL_BINDINGS, title='Controls', compact=false, className='', footer }: { device?: InputDevice; bindings?: ActionBinding[]; title?: string; compact?: boolean; className?: string; footer?: React.ReactNode }) {
  const detectedDevice = useInputDevice();
  const device = deviceProp ?? detectedDevice;
  const visible=bindings.filter(b=>getGlyphsForDevice(b,device).length>0);
  return <div className={cn('rounded-xl border border-border bg-surface-elevated p-3 backdrop-blur-[var(--blur-glass)]',className)}><div className="mb-2.5 flex items-center justify-between gap-2"><p className={cn(TYPO.sectionLabel,'m-0')}>{title}</p><DeviceBadge device={device}/></div><ul className={compact?'space-y-1':'space-y-1.5'}>{visible.map(b=><ControlBindingRow key={b.id} binding={b} device={device} compact={compact}/>)}</ul>{footer??<p className="mt-2 text-[10px] leading-tight text-text-subtle">Hold to charge. Tap shoot twice for low driven.</p>}</div>;
}
export function ControlGlyphStrip({ actions, device: deviceProp, className='' }: { actions: GameAction[]; device?: InputDevice; className?: string }) {
  const detectedDevice = useInputDevice();
  const device = deviceProp ?? detectedDevice;
  return <div className={cn('flex flex-wrap gap-2',className)}>{actions.map(actionId=>{const binding=CORE_BINDINGS.find(b=>b.id===actionId)??CONTROL_BINDINGS.find(b=>b.id===actionId); if(!binding) return null; const glyphs=getGlyphsForDevice(binding,device); if(!glyphs.length) return null; const Icon=binding.icon; return <div key={actionId} className="flex items-center gap-1.5 rounded-pill border border-border bg-surface-hud px-2 py-1"><Icon size={11} className="text-text-muted"/><span className="text-[10px] text-text-secondary">{binding.label}</span>{glyphs.slice(0,2).map((g,i)=><ControlGlyph key={`${actionId}-${i}`} token={g} device={device}/>)}</div>;})}</div>;
}
