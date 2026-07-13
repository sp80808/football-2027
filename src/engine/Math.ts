export class Vec2 {
  constructor(public x: number = 0, public y: number = 0) {}

  set(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v: Vec2) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  add(v: Vec2) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vec2) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mul(s: number) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  div(s: number) {
    if (s !== 0) {
      this.x /= s;
      this.y /= s;
    }
    return this;
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  mag() {
    return Math.sqrt(this.magSq());
  }

  normalize() {
    const m = this.mag();
    if (m > 0) {
      this.div(m);
    }
    return this;
  }

  distanceTo(v: Vec2) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  dot(v: Vec2) {
    return this.x * v.x + this.y * v.y;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }
}

export class Vec3 {
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vec3) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  add(v: Vec3) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  mul(s: number) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  magSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  mag() {
    return Math.sqrt(this.magSq());
  }

  normalize() {
    const m = this.mag();
    if (m > 0) {
      this.x /= m;
      this.y /= m;
      this.z /= m;
    }
    return this;
  }
}
