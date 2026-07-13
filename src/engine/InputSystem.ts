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
    let tackle = false;
    let slide = false;
    let switchPlayer = false;
    let keeperRush = false;

    if (gamepad) {
      if (Math.abs(gamepad.axes[0]) > 0.1) leftStick.x = gamepad.axes[0];
      if (Math.abs(gamepad.axes[1]) > 0.1) leftStick.y = gamepad.axes[1];
      if (Math.abs(gamepad.axes[2]) > 0.1) rightStick.x = gamepad.axes[2];
      if (Math.abs(gamepad.axes[3]) > 0.1) rightStick.y = gamepad.axes[3];
      if (gamepad.buttons[7]?.pressed) sprint = gamepad.buttons[7].value;
      if (gamepad.buttons[6]?.pressed) shield = gamepad.buttons[6].value;
      pass = gamepad.buttons[0]?.pressed || false;
      shoot = gamepad.buttons[2]?.pressed || false;
      throughPass = gamepad.buttons[3]?.pressed || false;
      switchPlayer = gamepad.buttons[4]?.pressed || false;
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
      tackle = !!this.keys.KeyT;
      switchPlayer = !!this.keys.KeyQ;
      keeperRush = !!this.keys.KeyE;
    }

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
  }
}
