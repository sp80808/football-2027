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
      if (Math.abs(gamepad.axes[0]) > 0.1) leftStick.x = gamepad.axes[0];
      if (Math.abs(gamepad.axes[1]) > 0.1) leftStick.y = gamepad.axes[1];
      if (Math.abs(gamepad.axes[2]) > 0.1) rightStick.x = gamepad.axes[2];
      if (Math.abs(gamepad.axes[3]) > 0.1) rightStick.y = gamepad.axes[3];
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
    } else {
      if (this.keys.ArrowUp || this.keys.KeyW) leftStick.y += 1;
      if (this.keys.ArrowDown || this.keys.KeyS) leftStick.y -= 1;
      if (this.keys.ArrowLeft || this.keys.KeyA) leftStick.x -= 1;
      if (this.keys.ArrowRight || this.keys.KeyD) leftStick.x += 1;
      if (leftStick.magSq() > 1) leftStick.normalize();

      if (this.keys.ShiftLeft || this.keys.ShiftRight) sprint = 1;
      if (this.keys.ControlLeft || this.keys.ControlRight) shield = 1;
      pass = !!(this.keys.KeyF || this.keys.Space);
      shoot = !!(this.keys.KeyG || this.keys.Enter);
      throughPass = !!this.keys.KeyR;
      lob = !!this.keys.KeyE;
      finesse = !!this.keys.KeyQ;
      chip = !!(this.keys.AltLeft || this.keys.AltRight);
      driven = !!(this.keys.ShiftLeft || this.keys.ShiftRight);
      skill = !!this.keys.KeyC;
      tackle = !!this.keys.KeyT;
      slide = !!(this.keys.KeyX || (this.keys.KeyT && (this.keys.ShiftLeft || this.keys.ShiftRight)));
      switchPlayer = !!this.keys.Tab;
      keeperRush = false;

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
    }

    const touch = this.touchOverrides;
    if (touch.leftStick) leftStick.copy(touch.leftStick);
    if (touch.rightStick) rightStick.copy(touch.rightStick);
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
