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
      window.addEventListener('keydown', (e) => {
        this.keys[e.code] = true;
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });
    }
  }

  update() {
    const gamepads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    let gp: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gp = gamepads[i];
        break;
      }
    }

    const ls = new Vec2();
    const rs = new Vec2();
    let sprint = 0;
    let shield = 0;
    let pass = false;
    let throughPass = false;
    let shoot = false;
    let tackle = false;
    let slide = false;
    let switchPlayer = false;
    let keeperRush = false;

    if (gp) {
      // GP mapping
      if (Math.abs(gp.axes[0]) > 0.1) ls.x = gp.axes[0];
      if (Math.abs(gp.axes[1]) > 0.1) ls.y = gp.axes[1];
      if (Math.abs(gp.axes[2]) > 0.1) rs.x = gp.axes[2];
      if (Math.abs(gp.axes[3]) > 0.1) rs.y = gp.axes[3];

      // Sprint: RT (Axis or button 7)
      if (gp.buttons[7] && gp.buttons[7].pressed) sprint = gp.buttons[7].value;
      // Shield: LT (Axis or button 6)
      if (gp.buttons[6] && gp.buttons[6].pressed) shield = gp.buttons[6].value;

      pass = gp.buttons[0]?.pressed || false; // A
      shoot = gp.buttons[2]?.pressed || false; // X/B
      throughPass = gp.buttons[3]?.pressed || false; // Y
      switchPlayer = gp.buttons[4]?.pressed || false; // LB
    } else {
      // KB mapping
      if (this.keys['ArrowUp'] || this.keys['KeyW']) ls.y -= 1;
      if (this.keys['ArrowDown'] || this.keys['KeyS']) ls.y += 1;
      if (this.keys['ArrowLeft'] || this.keys['KeyA']) ls.x -= 1;
      if (this.keys['ArrowRight'] || this.keys['KeyD']) ls.x += 1;
      if (ls.magSq() > 1) ls.normalize();

      if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) sprint = 1;
      if (this.keys['ControlLeft']) shield = 1;

      pass = this.keys['Space'] || this.keys['KeyJ'];
      shoot = this.keys['KeyK'];
      throughPass = this.keys['KeyI'];
      tackle = this.keys['KeyJ'];
      slide = this.keys['KeyK'];
      switchPlayer = this.keys['KeyQ'];
      keeperRush = this.keys['KeyE'];
    }

    this.currentFrame.leftStick.copy(ls);
    this.currentFrame.rightStick.copy(rs);
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

