import { Vec2 } from './Math';
import { ControllerFrame } from './Intent';

export class InputSystem {
  currentFrame: ControllerFrame = {
    leftStick: new Vec2(),
    rightStick: new Vec2(),
    sprint: 0,
    shield: 0,
    passPressed: false,
    passHeld: false,
    passReleased: false,
    throughPassPressed: false,
    throughPassHeld: false,
    throughPassReleased: false,
    shootPressed: false,
    shootHeld: false,
    shootReleased: false,
    lobHeld: false,
    finesseHeld: false,
    chipHeld: false,
    drivenHeld: false,
    skillPressed: false,
    lowDrivenTap: false,
    tacklePressed: false,
    slidePressed: false,
    switchPressed: false,
    keeperRushHeld: false,
  };

  private keys: Record<string, boolean> = {};
  private prevPass = false;
  private prevThroughPass = false;
  private prevShoot = false;
  private prevTackle = false;
  private prevSlide = false;
  private prevSwitch = false;
  private prevSkill = false;
  private shootCharging = false;
  private lowDrivenLatched = false;
  private lastShootPressTime = 0;
  private lastStickDir = new Vec2();
  private lastStickTapTime = 0;
  private touchOverrides: Partial<ControllerFrame> = {};

  init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (event) => {
        this.keys[event.code] = true;
      });
      window.addEventListener('keyup', (event) => {
        this.keys[event.code] = false;
      });
    }
  }

  /** Merge virtual touch input for mobile overlay. */
  applyTouchOverrides(overrides: Partial<ControllerFrame> | null) {
    this.touchOverrides = overrides ?? {};
  }

  injectFrame(input: ControllerFrame) {
    this.currentFrame.leftStick.copy(input.leftStick);
    this.currentFrame.rightStick.copy(input.rightStick);
    this.currentFrame.sprint = input.sprint;
    this.currentFrame.shield = input.shield;
    this.currentFrame.passPressed = input.passPressed;
    this.currentFrame.passHeld = input.passHeld;
    this.currentFrame.passReleased = input.passReleased;
    this.currentFrame.throughPassPressed = input.throughPassPressed;
    this.currentFrame.throughPassHeld = input.throughPassHeld;
    this.currentFrame.throughPassReleased = input.throughPassReleased;
    this.currentFrame.shootPressed = input.shootPressed;
    this.currentFrame.shootHeld = input.shootHeld;
    this.currentFrame.shootReleased = input.shootReleased;
    this.currentFrame.lobHeld = input.lobHeld;
    this.currentFrame.finesseHeld = input.finesseHeld;
    this.currentFrame.chipHeld = input.chipHeld;
    this.currentFrame.drivenHeld = input.drivenHeld;
    this.currentFrame.skillPressed = input.skillPressed;
    this.currentFrame.lowDrivenTap = input.lowDrivenTap;
    this.currentFrame.tacklePressed = input.tacklePressed;
    this.currentFrame.slidePressed = input.slidePressed;
    this.currentFrame.switchPressed = input.switchPressed;
    this.currentFrame.keeperRushHeld = input.keeperRushHeld;
  }

  update() {
    const gamepads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    let gamepad: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gamepad = gamepads[i];
        break;
      }
    }

    const leftStick = new Vec2();
    const rightStick = new Vec2();
    let sprint = 0;
    let shield = 0;
    let pass = false;
    let throughPass = false;
    let shoot = false;
    let lob = false;
    let finesse = false;
    let chip = false;
    let driven = false;
    let skill = false;
    let tackle = false;
    let slide = false;
    let switchPlayer = false;
    let keeperRush = false;
    let lowDrivenTap = false;

    if (gamepad) {
      const applyRadialDeadzone = (x: number, y: number, deadzone = 0.15) => {
        const mag = Math.hypot(x, y);
        if (mag < deadzone) return { x: 0, y: 0 };
        const norm = Math.min(1, (mag - deadzone) / (1 - deadzone));
        return { x: (x / mag) * norm, y: (y / mag) * norm };
      };

      const ls = applyRadialDeadzone(gamepad.axes[0] || 0, -(gamepad.axes[1] || 0));
      leftStick.x = ls.x;
      leftStick.y = ls.y;

      const rs = applyRadialDeadzone(gamepad.axes[2] || 0, -(gamepad.axes[3] || 0));
      rightStick.x = rs.x;
      rightStick.y = rs.y;
      if (gamepad.buttons[7]?.pressed) sprint = gamepad.buttons[7].value;
      if (gamepad.buttons[6]?.pressed) shield = gamepad.buttons[6].value;
      pass = gamepad.buttons[0]?.pressed || false;
      lob = gamepad.buttons[1]?.pressed || false;
      shoot = gamepad.buttons[2]?.pressed || false;
      throughPass = gamepad.buttons[3]?.pressed || false;
      chip = gamepad.buttons[4]?.pressed || false;
      finesse = gamepad.buttons[5]?.pressed || false;
      driven = gamepad.buttons[5]?.pressed || false;
      if (shoot && !this.prevShoot && this.shootCharging) {
        lowDrivenTap = true;
        this.lowDrivenLatched = true;
      }
      if (shoot && !this.prevShoot) {
        this.lastShootPressTime = performance.now();
        this.shootCharging = true;
      }
      if (!shoot) {
        this.shootCharging = false;
        this.lowDrivenLatched = false;
      }
      const rsMag = rightStick.mag();
      skill = rsMag > 0.85;
      keeperRush = gamepad.buttons[10]?.pressed || false;
    }

    if (this.keys.ArrowUp || this.keys.KeyW) leftStick.y += 1;
    if (this.keys.ArrowDown || this.keys.KeyS) leftStick.y -= 1;
    if (this.keys.ArrowLeft || this.keys.KeyA) leftStick.x -= 1;
    if (this.keys.ArrowRight || this.keys.KeyD) leftStick.x += 1;
    if (leftStick.magSq() > 1) leftStick.normalize();

    if (this.keys.ShiftLeft || this.keys.ShiftRight) sprint = 1;
    if (this.keys.ControlLeft || this.keys.ControlRight) shield = 1;
    pass = pass || !!(this.keys.KeyF || this.keys.Space);
    shoot = shoot || !!(this.keys.KeyG || this.keys.Enter);
    throughPass = throughPass || !!this.keys.KeyR;
    lob = lob || !!this.keys.KeyE;
    finesse = finesse || !!this.keys.KeyQ;
    chip = chip || !!(this.keys.AltLeft || this.keys.AltRight);
    driven = driven || !!(this.keys.ShiftLeft || this.keys.ShiftRight);
    skill = skill || !!this.keys.KeyC;
    tackle = tackle || !!this.keys.KeyT;
    slide = slide || !!(this.keys.KeyX || (this.keys.KeyT && (this.keys.ShiftLeft || this.keys.ShiftRight)));
    switchPlayer = switchPlayer || !!this.keys.Tab;
    keeperRush = keeperRush || !!this.keys.KeyV;

    if (shoot && !this.prevShoot) {
      if (this.shootCharging && performance.now() - this.lastShootPressTime < 350) {
        lowDrivenTap = true;
        this.lowDrivenLatched = true;
      }
      this.lastShootPressTime = performance.now();
      this.shootCharging = true;
    }
    if (!shoot) {
      this.shootCharging = false;
    }
    if (this.lowDrivenLatched) lowDrivenTap = true;
    if (!shoot && this.prevShoot) this.lowDrivenLatched = false;

    if (leftStick.magSq() > 0.5) {
      const now = performance.now();
      const sameDir = this.lastStickDir.dot(leftStick) > 0.85 && leftStick.magSq() > 0.5;
      if (sameDir && now - this.lastStickTapTime < 280) {
        skill = true;
        this.lastStickTapTime = 0;
      } else if (!sameDir || now - this.lastStickTapTime > 280) {
        this.lastStickDir.copy(leftStick);
        this.lastStickTapTime = now;
      }
    }

    const touch = this.touchOverrides;
    if (touch.leftStick && touch.leftStick.magSq() > 0) leftStick.copy(touch.leftStick);
    if (touch.rightStick && touch.rightStick.magSq() > 0) rightStick.copy(touch.rightStick);
    if (touch.sprint !== undefined) sprint = touch.sprint;
    if (touch.shield !== undefined) shield = touch.shield;
    if (touch.passHeld) pass = true;
    if (touch.shootHeld) shoot = true;
    if (touch.throughPassHeld) throughPass = true;
    if (touch.lobHeld) lob = true;
    if (touch.finesseHeld) finesse = true;
    if (touch.chipHeld) chip = true;
    if (touch.drivenHeld) driven = true;
    if (touch.skillPressed) skill = true;
    if (touch.tacklePressed) tackle = true;
    if (touch.slidePressed) slide = true;
    if (touch.keeperRushHeld) keeperRush = true;

    this.currentFrame.leftStick.copy(leftStick);
    this.currentFrame.rightStick.copy(rightStick);
    this.currentFrame.sprint = sprint;
    this.currentFrame.shield = shield;
    this.currentFrame.passPressed = pass && !this.prevPass;
    this.currentFrame.passHeld = pass;
    this.currentFrame.passReleased = !pass && this.prevPass;
    this.currentFrame.throughPassPressed = throughPass && !this.prevThroughPass;
    this.currentFrame.throughPassHeld = throughPass;
    this.currentFrame.throughPassReleased = !throughPass && this.prevThroughPass;
    this.currentFrame.shootPressed = shoot && !this.prevShoot;
    this.currentFrame.shootHeld = shoot;
    this.currentFrame.shootReleased = !shoot && this.prevShoot;
    this.currentFrame.lobHeld = lob;
    this.currentFrame.finesseHeld = finesse;
    this.currentFrame.chipHeld = chip;
    this.currentFrame.drivenHeld = driven;
    this.currentFrame.skillPressed = skill && !this.prevSkill;
    this.currentFrame.lowDrivenTap = lowDrivenTap;
    this.currentFrame.tacklePressed = tackle && !this.prevTackle;
    this.currentFrame.slidePressed = slide && !this.prevSlide;
    this.currentFrame.switchPressed = switchPlayer && !this.prevSwitch;
    this.currentFrame.keeperRushHeld = keeperRush;

    this.prevPass = pass;
    this.prevThroughPass = throughPass;
    this.prevShoot = shoot;
    this.prevTackle = tackle;
    this.prevSlide = slide;
    this.prevSwitch = switchPlayer;
    this.prevSkill = skill;
  }
}
