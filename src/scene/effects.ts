import * as THREE from 'three';

/** Rolling ball velocity trail — ported from sports-game VFX patterns */
export class BallTrail {
  private readonly maxPoints = 24;
  private positions: THREE.Vector3[] = [];
  private line: THREE.Line;
  private material: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      linewidth: 1,
    });
    const geo = new THREE.BufferGeometry();
    this.line = new THREE.Line(geo, this.material);
    this.line.frustumCulled = false;
    scene.add(this.line);
  }

  update(ballPos: THREE.Vector3, speed: number) {
    if (speed > 3) {
      this.positions.unshift(ballPos.clone());
      if (this.positions.length > this.maxPoints) {
        this.positions.pop();
      }
    } else if (this.positions.length > 0) {
      this.positions.pop();
    }

    const count = this.positions.length;
    if (count < 2) {
      this.line.visible = false;
      return;
    }

    this.line.visible = true;
    const verts = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      verts[i * 3] = this.positions[i].x;
      verts[i * 3 + 1] = this.positions[i].y;
      verts[i * 3 + 2] = this.positions[i].z;
    }
    this.line.geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    this.line.geometry.setDrawRange(0, count);
    this.material.opacity = Math.min(0.7, 0.2 + speed * 0.02);
  }

  dispose() {
    this.line.geometry.dispose();
    this.material.dispose();
  }
}

/** Simple confetti burst on goal */
export class GoalCelebration {
  private particles: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    life: number;
  }[] = [];
  private active = false;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  trigger(origin: THREE.Vector3) {
    this.active = true;
    const colors = [0xffd700, 0xff4444, 0x44ff44, 0x4488ff, 0xffffff];
    for (let i = 0; i < 60; i++) {
      const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(origin);
      mesh.position.y += 1 + Math.random() * 2;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          4 + Math.random() * 6,
          (Math.random() - 0.5) * 8
        ),
        life: 1.5 + Math.random(),
      });
    }
  }

  update(dt: number): boolean {
    if (!this.active) return false;

    let alive = 0;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        continue;
      }
      alive++;
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 4;
      p.mesh.rotation.z += dt * 3;
    }

    if (alive === 0) {
      this.particles = [];
      this.active = false;
      return false;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    return true;
  }
}
