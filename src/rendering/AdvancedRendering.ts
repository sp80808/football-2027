import * as THREE from 'three';
import { SimulationConfig } from '../engine/SimulationConfig';

/**
 * Advanced Pitch Rendering with Dynamic Grass, Wear, and Weather
 */
export class AdvancedPitchRenderer {
  private pitchMesh: THREE.Mesh | null = null;
  private grassMaterial: THREE.ShaderMaterial | null = null;
  private wearTexture: THREE.DataTexture | null = null;
  private wearData: Float32Array | null = null;
  private weatherUniforms: { rain: number; puddles: number; mud: number } = { rain: 0, puddles: 0, mud: 0 };

  constructor(
    private scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer
  ) {}

  async initialize(): Promise<void> {
    await this.createAdvancedGrassShader();
    await this.createWearTexture();
    this.createPitchMesh();
    this.createOuterPitch();
  }

  private async createAdvancedGrassShader(): Promise<void> {
    const vertexShader = `
      uniform float uTime;
      uniform float uGrassHeight;
      uniform vec3 uWindDirection;
      uniform float uWindStrength;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vGrassMask;

      // Pseudo-random noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        vUv = uv;
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vNormal = normalize(normalMatrix * normal);

        // Grass blade displacement
        float bladeNoise = noise(vWorldPos.xz * 0.5 + uTime * 0.1) * 2.0 - 1.0;
        float windEffect = sin(uTime * 2.0 + vWorldPos.x * 0.5) * uWindStrength * 0.02;
        float grassBend = (1.0 - vUv.y) * uGrassHeight * (1.0 + bladeNoise * 0.1);

        // Grass mask for tips
        vGrassMask = smoothstep(0.7, 1.0, vUv.y);

        vec3 displacedPos = position;
        displacedPos.x += windEffect * (1.0 - vUv.y);
        displacedPos.y += grassBend * vUv.y;

        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(displacedPos, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D uGrassTexture;
      uniform sampler2D uWearTexture;
      uniform vec3 uBaseColor1;
      uniform vec3 uBaseColor2;
      uniform vec3 uStripeColor1;
      uniform vec3 uStripeColor2;
      uniform float uStripeWidth;
      uniform float uTime;
      uniform float uWearIntensity;
      uniform float uRainIntensity;
      uniform float uMudIntensity;
      uniform vec3 uSunDirection;
      uniform vec3 uSunColor;
      uniform vec3 uAmbientColor;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vGrassMask;

      // Stripe pattern
      float getStripe(float y) {
        float stripe = mod(y * 0.05, 2.0);
        return step(1.0, stripe);
      }

      // Wear sampling
      float getWear(vec2 uv) {
        return texture2D(uWearTexture, uv).r;
      }

      void main() {
        // Pitch coordinates (-34 to 34, -52.5 to 52.5)
        vec2 pitchUv = (vWorldPos.xz + vec2(34.0, 52.5)) / vec2(68.0, 105.0);

        // Base grass color with stripes
        float stripe = getStripe(vWorldPos.y);
        vec3 grassColor = mix(uBaseColor1, uBaseColor2, stripe);

        // Apply wear
        float wear = getWear(pitchUv) * uWearIntensity;
        grassColor = mix(grassColor, vec3(0.15, 0.1, 0.05), wear * 0.6);

        // Mud patches in high-traffic areas
        float mud = smoothstep(0.3, 0.7, getWear(pitchUv)) * uMudIntensity;
        grassColor = mix(grassColor, vec3(0.18, 0.12, 0.08), mud);

        // Wet surface reflection
        float wetness = uRainIntensity * (1.0 + sin(vWorldPos.x * 0.5 + uTime) * 0.1);
        float specular = pow(max(0.0, dot(vNormal, normalize(-uSunDirection))), 32.0) * wetness * 0.5;

        // Base lighting
        float NdotL = max(0.0, dot(vNormal, uSunDirection));
        vec3 lighting = uAmbientColor + uSunColor * NdotL;

        // Grass texture detail
        vec3 texColor = texture2D(uGrassTexture, vUv * 50.0).rgb;
        grassColor *= texColor * 0.3 + 0.7;

        // Final color
        vec3 finalColor = grassColor * lighting + vec3(specular);

        // Fog
        float fogFactor = smoothstep(50.0, 150.0, length(vWorldPos - vec3(0.0, 10.0, 0.0)));
        finalColor = mix(finalColor, vec3(0.53, 0.7, 0.85), fogFactor);

        // Alpha for grass tips
        float alpha = 1.0;
        if (vGrassMask > 0.5) alpha = 0.8 + vGrassMask * 0.2;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    this.grassMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uGrassHeight: { value: 0.03 },
        uWindDirection: { value: new THREE.Vector3(1, 0, 0) },
        uWindStrength: { value: 0.5 },
        uGrassTexture: { value: null },
        uWearTexture: { value: null },
        uBaseColor1: { value: new THREE.Color(0x2d6a2d) },
        uBaseColor2: { value: new THREE.Color(0x338a33) },
        uStripeColor1: { value: new THREE.Color(0x2d6a2d) },
        uStripeColor2: { value: new THREE.Color(0x338a33) },
        uStripeWidth: { value: 5.0 },
        uWearIntensity: { value: 0.5 },
        uRainIntensity: { value: 0 },
        uMudIntensity: { value: 0 },
        uSunDirection: { value: new THREE.Vector3(0.5, 1, 0.5).normalize() },
        uSunColor: { value: new THREE.Color(0xfff5d6) },
        uAmbientColor: { value: new THREE.Color(0x888888) }
      },
      transparent: true,
      side: THREE.DoubleSide
    });

    // Create procedural grass texture
    const grassTexture = this.createGrassTexture();
    this.grassMaterial.uniforms.uGrassTexture.value = grassTexture;
  }

  private createGrassTexture(): THREE.DataTexture {
    const size = 256;
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const noise = Math.random() * 0.2 + 0.8;
        const blade = Math.sin(x * 0.2) * Math.sin(y * 0.1) * 0.1 + 0.9;
        const val = Math.floor(noise * blade * 255);

        data[idx] = val;     // R
        data[idx + 1] = val; // G
        data[idx + 2] = val; // B
        data[idx + 3] = 255; // A
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private createWearTexture(): void {
    const size = 512;
    this.wearData = new Float32Array(size * size);
    this.wearTexture = new THREE.DataTexture(
      this.wearData,
      size,
      size,
      THREE.RedFormat,
      THREE.FloatType
    );
    this.wearTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.wearTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.wearTexture.minFilter = THREE.LinearFilter;
    this.wearTexture.magFilter = THREE.LinearFilter;
    this.wearTexture.needsUpdate = true;

    if (this.grassMaterial) {
      this.grassMaterial.uniforms.uWearTexture.value = this.wearTexture;
    }
  }

  private createPitchMesh(): void {
    const geometry = new THREE.PlaneGeometry(
      SimulationConfig.PITCH_WIDTH,
      SimulationConfig.PITCH_LENGTH,
      64, 64 // Subdivisions for grass displacement
    );
    geometry.rotateX(-Math.PI / 2);

    this.pitchMesh = new THREE.Mesh(geometry, this.grassMaterial!);
    this.pitchMesh.receiveShadow = true;
    this.pitchMesh.name = 'pitch';
    this.scene.add(this.pitchMesh);
  }

  private createOuterPitch(): void {
    const outerGeometry = new THREE.PlaneGeometry(300, 300);
    const outerMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b7527,
      roughness: 0.9,
      metalness: 0
    });
    const outerPitch = new THREE.Mesh(outerGeometry, outerMaterial);
    outerPitch.rotation.x = -Math.PI / 2;
    outerPitch.position.y = -0.01;
    outerPitch.receiveShadow = true;
    outerPitch.name = 'outerPitch';
    this.scene.add(outerPitch);
  }

  /**
   * Record player position for wear accumulation
   */
  recordPlayerPosition(x: number, y: number, intensity: number = 1.0): void {
    if (!this.wearData || !this.wearTexture) return;

    const size = 512;
    const scaleX = size / SimulationConfig.PITCH_WIDTH;
    const scaleY = size / SimulationConfig.PITCH_LENGTH;

    const cx = Math.floor((x + SimulationConfig.PITCH_HALF_WIDTH) * scaleX);
    const cy = Math.floor((y + SimulationConfig.PITCH_HALF_LENGTH) * scaleY);

    // Apply wear in a radius around position
    const radius = Math.floor(3 * intensity * scaleX);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && px < size && py >= 0 && py < size) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const falloff = 1.0 - dist / radius;
            const idx = py * size + px;
            this.wearData![idx] = Math.min(1.0, this.wearData![idx] + falloff * intensity * 0.001);
          }
        }
      }
    }

    this.wearTexture.needsUpdate = true;
  }

  /**
   * Update weather conditions
   */
  setWeather(rain: number, mud: number): void {
    this.weatherUniforms.rain = rain;
    this.weatherUniforms.mud = mud;
    if (this.grassMaterial) {
      this.grassMaterial.uniforms.uRainIntensity.value = rain;
      this.grassMaterial.uniforms.uMudIntensity.value = mud;
    }
  }

  /**
   * Update time of day
   */
  setTimeOfDay(hour: number): void {
    if (!this.grassMaterial) return;

    // Sun position
    const sunAngle = (hour - 12) * Math.PI / 12;
    const sunDir = new THREE.Vector3(
      Math.sin(sunAngle),
      Math.max(0.1, Math.cos(sunAngle)),
      Math.cos(sunAngle) * 0.5
    ).normalize();

    this.grassMaterial.uniforms.uSunDirection.value = sunDir;

    // Sun color based on time
    let sunColor = new THREE.Color(0xfff5d6);
    let ambient = new THREE.Color(0x888888);

    if (hour < 6 || hour > 20) {
      // Night
      sunColor.setHex(0x333355);
      ambient.setHex(0x111122);
    } else if (hour < 8 || hour > 18) {
      // Dawn/dusk
      sunColor.setHex(0xff8844);
      ambient.setHex(0x443322);
    }

    this.grassMaterial.uniforms.uSunColor.value = sunColor;
    this.grassMaterial.uniforms.uAmbientColor.value = ambient;
  }

  update(deltaTime: number): void {
    if (this.grassMaterial) {
      this.grassMaterial.uniforms.uTime.value += deltaTime;

      // Subtle wind variation
      const windTime = this.grassMaterial.uniforms.uTime.value * 0.3;
      this.grassMaterial.uniforms.uWindDirection.value.set(
        Math.sin(windTime * 0.7) * 0.5 + 0.5,
        0,
        Math.cos(windTime * 0.5) * 0.3
      );
    }
  }

  getPitchMesh(): THREE.Mesh | null {
    return this.pitchMesh;
  }
}

/**
 * Advanced Player Rendering with Skeletal Animation
 */
export class AdvancedPlayerRenderer {
  private playerMeshes: Map<number, THREE.Group> = new Map();
  private animations: Map<string, THREE.AnimationClip> = new Map();
  private mixers: Map<number, THREE.AnimationMixer> = new Map();

  constructor(private scene: THREE.Scene) {}

  async createPlayerModel(
    playerId: number,
    teamColor: string,
    isKeeper: boolean = false
  ): Promise<THREE.Group> {
    const group = new THREE.Group();

    // Load GLTF model (placeholder - would load from file)
    const body = this.createProceduralBody(teamColor, isKeeper);
    group.add(body);

    // Create animation mixer
    const mixer = new THREE.AnimationMixer(group);
    this.mixers.set(playerId, mixer);

    this.playerMeshes.set(playerId, group);
    this.scene.add(group);

    return group;
  }

  private createProceduralBody(teamColor: string, isKeeper: boolean): THREE.Group {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.6, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: teamColor,
      roughness: 0.6,
      metalness: 0
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);

    // Shorts
    const shortsGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.35, 8);
    const shortsMat = new THREE.MeshStandardMaterial({
      color: isKeeper ? 0x111111 : 0xffffff,
      roughness: 0.8
    });
    const shorts = new THREE.Mesh(shortsGeo, shortsMat);
    shorts.position.y = 0.55;
    shorts.castShadow = true;
    group.add(shorts);

    // Legs
    for (let i = 0; i < 2; i++) {
      const legGeo = new THREE.CapsuleGeometry(0.08, 0.45, 4, 8);
      const legMat = new THREE.MeshStandardMaterial({
        color: isKeeper ? 0x111111 : 0xffffff,
        roughness: 0.8
      });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set((i === 0 ? -0.1 : 0.1), 0.2, 0);
      leg.castShadow = true;
      group.add(leg);
    }

    // Head
    const headGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf1cba7,
      roughness: 0.8
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.65;
    head.castShadow = true;
    group.add(head);

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.13, 12, 12);
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a10,
      roughness: 0.9
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.72, 0.02);
    hair.scale.set(1.1, 0.7, 1.1);
    group.add(hair);

    // Arms
    for (let i = 0; i < 2; i++) {
      const armGeo = new THREE.CapsuleGeometry(0.06, 0.5, 4, 8);
      const armMat = new THREE.MeshStandardMaterial({
        color: 0xf1cba7,
        roughness: 0.8
      });
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set((i === 0 ? -0.35 : 0.35), 1.0, 0);
      arm.rotation.x = Math.PI / 2;
      arm.castShadow = true;
      group.add(arm);
    }

    return group;
  }

  updatePlayer(
    playerId: number,
    state: { pos: { x: number; y: number }; facing: { x: number; y: number }; animState: string }
  ): void {
    const mesh = this.playerMeshes.get(playerId);
    const mixer = this.mixers.get(playerId);

    if (mesh) {
      mesh.position.set(state.pos.x, 0, -state.pos.y);
      const angle = Math.atan2(state.facing.x, state.facing.y);
      mesh.rotation.y = angle;
    }

    if (mixer) {
      mixer.update(1/60); // Fixed timestep
    }
  }

  playAnimation(playerId: number, animName: string, loop: boolean = true): void {
    const mixer = this.mixers.get(playerId);
    const clip = this.animations.get(animName);
    if (mixer && clip) {
      const action = mixer.clipAction(clip);
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
      action.play();
    }
  }

  updateAll(deltaTime: number): void {
    for (const mixer of this.mixers.values()) {
      mixer.update(deltaTime);
    }
  }

  dispose(): void {
    for (const [id, mesh] of this.playerMeshes) {
      this.scene.remove(mesh);
      mesh.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    this.playerMeshes.clear();
    this.mixers.clear();
  }
}

/**
 * Ball Trail Effect
 */
export class BallTrailEffect {
  private trail: THREE.Line | null = null;
  private positions: THREE.Vector3[] = [];
  private maxPoints = 30;

  constructor(private scene: THREE.Scene) {
    this.initialize();
  }

  private initialize(): void {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });

    const positions = new Float32Array(this.maxPoints * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    this.trail = new THREE.Line(geometry, material);
    this.trail.frustumCulled = false;
    this.scene.add(this.trail);
  }

  update(ballPos: THREE.Vector3, speed: number): void {
    if (speed > 5) {
      this.positions.unshift(ballPos.clone());
      if (this.positions.length > this.maxPoints) this.positions.pop();
    } else if (this.positions.length > 0) {
      this.positions.pop();
    }

    if (this.trail && this.positions.length >= 2) {
      const geometry = this.trail.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < this.positions.length; i++) {
        positions[i * 3] = this.positions[i].x;
        positions[i * 3 + 1] = this.positions[i].y;
        positions[i * 3 + 2] = this.positions[i].z;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.setDrawRange(0, this.positions.length);

      // Fade trail based on speed
      const material = this.trail.material as THREE.LineBasicMaterial;
      material.opacity = Math.min(0.8, 0.2 + speed * 0.02);
    } else if (this.trail) {
      (this.trail.geometry as THREE.BufferGeometry).setDrawRange(0, 0);
    }
  }

  dispose(): void {
    if (this.trail) {
      this.scene.remove(this.trail);
      this.trail.geometry.dispose();
      (this.trail.material as THREE.Material).dispose();
      this.trail = null;
    }
  }
}

/**
 * Goal Celebration Effect
 */
export class GoalCelebrationEffect {
  private particles: THREE.Mesh[] = [];
  private active = false;
  private timer = 0;

  constructor(private scene: THREE.Scene) {}

  trigger(position: THREE.Vector3, teamColor: number = 0xffd700): void {
    this.active = true;
    this.timer = 0;

    const colors = [
      0xffd700, 0xff4444, 0x44ff44, 0x4488ff, 0xffffff,
      teamColor
    ];

    for (let i = 0; i < 80; i++) {
      const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      mesh.position.y += 1 + Math.random() * 2;
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          5 + Math.random() * 8,
          (Math.random() - 0.5) * 10
        ),
        life: 2 + Math.random() * 1.5,
        maxLife: 2 + Math.random() * 1.5
      });
    }
  }

  update(dt: number): void {
    if (!this.active) return;

    this.timer += dt;
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

      // Fade out
      const lifeRatio = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = lifeRatio * 0.9;
    }

    if (alive === 0) {
      this.active = false;
      this.particles = [];
    }
  }

  dispose(): void {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}

/**
 * Stadium & Crowd System
 */
export class StadiumSystem {
  private crowdParticles: THREE.Points | null = null;
  private stands: THREE.Group | null = null;

  constructor(private scene: THREE.Scene) {}

  async initialize(): Promise<void> {
    this.createStands();
    this.createCrowd();
  }

  private createStands(): void {
    this.stands = new THREE.Group();

    // Four stands
    const standConfigs = [
      { pos: new THREE.Vector3(0, 0, -60), rot: 0, width: 80, depth: 20 },     // North
      { pos: new THREE.Vector3(0, 0, 60), rot: Math.PI, width: 80, depth: 20 },  // South
      { pos: new THREE.Vector3(-40, 0, 0), rot: -Math.PI/2, width: 120, depth: 20 }, // West
      { pos: new THREE.Vector3(40, 0, 0), rot: Math.PI/2, width: 120, depth: 20 }  // East
    ];

    for (const config of standConfigs) {
      const stand = this.createStand(config.width, config.depth);
      stand.position.copy(config.pos);
      stand.rotation.y = config.rot;
      this.stands!.add(stand);
    }

    this.scene.add(this.stands);
  }

  private createStand(width: number, depth: number): THREE.Group {
    const group = new THREE.Group();

    // Tiers
    for (let tier = 0; tier < 3; tier++) {
      const tierGeo = new THREE.BoxGeometry(width, 3, depth);
      const tierMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.9,
        metalness: 0.1
      });
      const tierMesh = new THREE.Mesh(tierGeo, tierMat);
      tierMesh.position.y = 1.5 + tier * 3;
      tierMesh.position.z = -tier * 2;
      tierMesh.castShadow = true;
      tierMesh.receiveShadow = true;
      group.add(tierMesh);

      // Seats
      const seatGeo = new THREE.BoxGeometry(0.45, 0.3, 0.4);
      const seatMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.8
      });

      const seatsPerRow = Math.floor(width / 0.5);
      const rows = Math.floor(depth / 0.8);

      for (let row = 0; row < rows; row++) {
        for (let seat = 0; seat < seatsPerRow; seat++) {
          const seatMesh = new THREE.Mesh(seatGeo, seatMat);
          seatMesh.position.set(
            -width / 2 + seat * 0.5 + 0.25,
            1.5 + tier * 3 + 0.15,
            -tier * 2 - row * 0.8 + 0.4
          );
          group.add(seatMesh);
        }
      }
    }

    return group;
  }

  private createCrowd(): void {
    // Impostor-based crowd system
    const crowdCount = 5000;
    const positions = new Float32Array(crowdCount * 3);
    const colors = new Float32Array(crowdCount * 3);
    const scales = new Float32Array(crowdCount);
    const phases = new Float32Array(crowdCount);

    for (let i = 0; i < crowdCount; i++) {
      // Distribute around pitch
      const side = Math.floor(Math.random() * 4);
      let x, z;

      switch (side) {
        case 0: // North
          x = (Math.random() - 0.5) * 80;
          z = -55 - Math.random() * 15;
          break;
        case 1: // South
          x = (Math.random() - 0.5) * 80;
          z = 55 + Math.random() * 15;
          break;
        case 2: // West
          x = -45 - Math.random() * 15;
          z = (Math.random() - 0.5) * 110;
          break;
        case 3: // East
          x = 45 + Math.random() * 15;
          z = (Math.random() - 0.5) * 110;
          break;
      }

      const tier = Math.floor(Math.random() * 3);
      const y = 2 + tier * 3 + Math.random() * 0.5;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Random team color variation
      const team = Math.random() > 0.5;
      if (team) {
        colors[i * 3] = 0.1 + Math.random() * 0.1;      // Red team
        colors[i * 3 + 1] = 0.05 + Math.random() * 0.05;
        colors[i * 3 + 2] = 0.05 + Math.random() * 0.05;
      } else {
        colors[i * 3] = 0.05 + Math.random() * 0.05;
        colors[i * 3 + 1] = 0.05 + Math.random() * 0.05;
        colors[i * 3 + 2] = 0.1 + Math.random() * 0.1;  // Blue team
      }

      scales[i] = 0.8 + Math.random() * 0.4;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    const crowd = new THREE.Points(geometry, material);
    this.scene.add(crowd);
  }

  update(dt: number, eventIntensity: number = 0): void {
    // Animate crowd based on match events
    // Would update point positions/colors based on excitement
  }

  dispose(): void {
    if (this.stands) {
      this.scene.remove(this.stands);
      this.stands.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      this.stands = null;
    }
  }
}