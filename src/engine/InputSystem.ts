import { Vec2 } from './Math';

export type ControllerFrame = {
  leftStick: Vec2;
  rightStick: Vec2;
  sprint: number;
  shield: number;
  passPressed: boolean;
  passReleased: boolean;
  shootPressed: boolean;
  shootReleased: boolean;
  tacklePressed: boolean;
  switchPressed: boolean;
};

export class InputSystem {
  currentFrame: ControllerFrame = {
    leftStick: new Vec2(),
    rightStick: new Vec2(),
    sprint: 0,
    shield: 0,
    passPressed: false,
    passReleased: false,
    shootPressed: false,
    shootReleased: false,
    tacklePressed: false,
    switchPressed: false,
  };

  private keys: Record<string, boolean> = {};
  private prevKeys: Record<string, boolean> = {};

  private passWasPressed = false;
  private shootWasPressed = false;

  init() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  update() {
    // Gamepad support
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
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
    let pass = false;
    let shoot = false;

    if (gp) {
      // Gamepad mapping (Standard)
      // LS: Axes 0, 1
      if (Math.abs(gp.axes[0]) > 0.1) ls.x = gp.axes[0];
      if (Math.abs(gp.axes[1]) > 0.1) ls.y = gp.axes[1];
      
      // RS: Axes 2, 3
      if (Math.abs(gp.axes[2]) > 0.1) rs.x = gp.axes[2];
      if (Math.abs(gp.axes[3]) > 0.1) rs.y = gp.axes[3];

      // RT/R2 for sprint (Axis or Button depending on OS/Browser)
      if (gp.buttons[7] && gp.buttons[7].pressed) {
        sprint = gp.buttons[7].value;
      }
      
      // Pass (A/Cross)
      pass = gp.buttons[0] ? gp.buttons[0].pressed : false;
      // Shoot (X/Square on Xbox, or B/Circle depending on layout, let's use B for now)
      shoot = gp.buttons[2] ? gp.buttons[2].pressed : false;

    } else {
      // Keyboard fallback
      if (this.keys['ArrowUp'] || this.keys['KeyW']) ls.y -= 1;
      if (this.keys['ArrowDown'] || this.keys['KeyS']) ls.y += 1;
      if (this.keys['ArrowLeft'] || this.keys['KeyA']) ls.x -= 1;
      if (this.keys['ArrowRight'] || this.keys['KeyD']) ls.x += 1;
      if (ls.magSq() > 1) ls.normalize();

      if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) sprint = 1;
      if (this.keys['KeyJ'] || this.keys['Space']) pass = true;
      if (this.keys['KeyK']) shoot = true;
    }

    this.currentFrame.leftStick.copy(ls);
    this.currentFrame.rightStick.copy(rs);
    this.currentFrame.sprint = sprint;
    
    this.currentFrame.passPressed = pass && !this.passWasPressed;
    this.currentFrame.passReleased = !pass && this.passWasPressed;
    
    this.currentFrame.shootPressed = shoot && !this.shootWasPressed;
    this.currentFrame.shootReleased = !shoot && this.shootWasPressed;

    this.passWasPressed = pass;
    this.shootWasPressed = shoot;
  }
}
