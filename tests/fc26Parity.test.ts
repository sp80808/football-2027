import { describe, expect, it } from 'vitest';
import { Vec2 } from '../src/engine/Math';
import { Ball } from '../src/engine/Ball';
import { Player } from '../src/engine/Player';
import { Opponent } from '../src/engine/Opponent';
import { Keeper } from '../src/engine/Keeper';
import { SimulationConfig } from '../src/engine/SimulationConfig';
import { ControllerFrame } from '../src/engine/Intent';
import { parseIntent } from '../src/engine/PlayerIntentParser';

function makeFrame(o: Partial<ControllerFrame> = {}): ControllerFrame {
  return { leftStick:new Vec2(), rightStick:new Vec2(), sprint:0, shield:0, passPressed:false, passHeld:false, passReleased:false, throughPassPressed:false, throughPassHeld:false, throughPassReleased:false, shootPressed:false, shootHeld:false, shootReleased:false, lobHeld:false, finesseHeld:false, chipHeld:false, drivenHeld:false, skillPressed:false, lowDrivenTap:false, tacklePressed:false, slidePressed:false, switchPressed:false, keeperRushHeld:false, ...o };
}

describe('FC26 parity', () => {
  it('contain', () => {
    expect(parseIntent(makeFrame({shield:1}),{playerSpeed:4,chargeDuration:0,isCharging:false,chargeType:'pass',ballGrounded:true,ballInControl:false,ballReceiving:false,incomingBallSpeed:0}).isContaining).toBe(true);
  });
  it('fake shot', () => {
    expect(parseIntent(makeFrame({shootReleased:true}),{playerSpeed:2,chargeDuration:0.1,isCharging:true,chargeType:'shoot',ballGrounded:true,ballInControl:true,ballReceiving:false,incomingBallSpeed:0}).skillMove).toBe('fake_shot');
  });
  it('through lead', () => {
    const p=new Player(),b=new Ball(),o=new Opponent(); p.pos.set(0,10);p.facing.set(0,1);p.controlState='under_control';o.pos.set(0,22);b.pos.set(0,10.3,0); p.isCharging=true;p.chargeType='pass';p.chargeStart=0.8; p.update(1/120,makeFrame({throughPassReleased:true}),b,o); expect(b.vel.y).toBeGreaterThan(6);
  });
  it('gk passback', () => {
    const g=SimulationConfig.PITCH_HALF_LENGTH-0.5,k=new Keeper();k.pos.set(0,g); const b=new Ball();b.pos.set(0.5,g-1.2,0);b.vel.set(0,0.5,0); k.update(1/120,b,false,true); expect(b.vel.y).toBeLessThan(-1);
  });
});
