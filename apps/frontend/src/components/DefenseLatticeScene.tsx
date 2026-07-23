import { useEffect, useRef } from "react";
import * as THREE from "three";

type DefenseLatticeSceneProps = {
  progress: number;
};

type ShieldShard = {
  target: THREE.Vector3;
  scatter: THREE.Vector3;
  phase: number;
  spin: number;
  scale: number;
};

type AttackSignal = {
  direction: THREE.Vector3;
  phase: number;
  speed: number;
};

const shardCount = 196;
const attackCount = 72;
const up = new THREE.Vector3(0, 1, 0);

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smootherStep(value: number) {
  const normalized = clamp(value);
  return normalized * normalized * normalized * (normalized * (normalized * 6 - 15) + 10);
}

function stageOffset(progress: number) {
  const points = [
    { progress: 0, x: 0 },
    { progress: 0.25, x: 2.2 },
    { progress: 0.5, x: -2.15 },
    { progress: 0.75, x: 2.05 },
    { progress: 1, x: 0 }
  ];
  const upperIndex = points.findIndex((point) => point.progress >= progress);
  if (upperIndex <= 0) return points[0].x;
  const upper = points[upperIndex];
  const lower = points[upperIndex - 1];
  const localProgress = smootherStep(
    (progress - lower.progress) / (upper.progress - lower.progress)
  );
  return lower.x + (upper.x - lower.x) * localProgress;
}

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createShieldShards() {
  const random = createRandom(5217);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: shardCount }, (_, index): ShieldShard => {
    const y = 1 - (index / (shardCount - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = goldenAngle * index;
    const normal = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    return {
      target: normal.multiplyScalar(1.58),
      scatter: new THREE.Vector3(
        (random() - 0.5) * 7.8,
        (random() - 0.5) * 6.6,
        (random() - 0.5) * 5.2
      ),
      phase: random() * Math.PI * 2,
      spin: (random() - 0.5) * 1.8,
      scale: 0.72 + random() * 0.75
    };
  });
}

function createAttackSignals() {
  const random = createRandom(8841);
  return Array.from({ length: attackCount }, (): AttackSignal => {
    const direction = new THREE.Vector3(
      random() - 0.5,
      (random() - 0.5) * 0.8,
      random() - 0.5
    ).normalize();
    return {
      direction,
      phase: random(),
      speed: 0.08 + random() * 0.12
    };
  });
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(170, 244, 255, .92)");
  gradient.addColorStop(0.12, "rgba(92, 221, 255, .54)");
  gradient.addColorStop(0.42, "rgba(68, 160, 255, .16)");
  gradient.addColorStop(1, "rgba(26, 82, 140, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function DefenseLatticeScene({ progress }: DefenseLatticeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
    camera.position.set(0, 0, 8.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
    } catch {
      return;
    }
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    mount.appendChild(renderer.domElement);

    const defenseGroup = new THREE.Group();
    scene.add(defenseGroup);

    const ambientLight = new THREE.HemisphereLight(0x90ddff, 0x070912, 1.25);
    const keyLight = new THREE.DirectionalLight(0xbceeff, 4.2);
    keyLight.position.set(3, 4, 5);
    const rimLight = new THREE.PointLight(0x756cff, 12, 12, 2);
    rimLight.position.set(-3, -1.5, 3);
    const coreLight = new THREE.PointLight(0x5edfff, 10, 8, 2);
    defenseGroup.add(coreLight);
    scene.add(ambientLight, keyLight, rimLight);

    const coreGeometry = new THREE.IcosahedronGeometry(0.74, 5);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x06111c,
      emissive: 0x0a4b68,
      emissiveIntensity: 0.82,
      metalness: 0.84,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.9
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    defenseGroup.add(core);

    const coreWireGeometry = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.79, 2));
    const coreWireMaterial = new THREE.LineBasicMaterial({
      color: 0xb3f4ff,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coreWire = new THREE.LineSegments(coreWireGeometry, coreWireMaterial);
    defenseGroup.add(coreWire);

    const circuitGeometry = new THREE.TorusKnotGeometry(0.92, 0.018, 220, 10, 2, 3);
    const circuitMaterial = new THREE.MeshBasicMaterial({
      color: 0xa9efff,
      transparent: true,
      opacity: 0.44,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const circuit = new THREE.Mesh(circuitGeometry, circuitMaterial);
    circuit.rotation.set(0.4, -0.28, 0.2);
    defenseGroup.add(circuit);

    const shellGeometry = new THREE.IcosahedronGeometry(1.52, 3);
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x4bc7ed,
      emissive: 0x083f5b,
      emissiveIntensity: 0.5,
      metalness: 0.5,
      roughness: 0.12,
      transmission: 0.38,
      thickness: 0.65,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    defenseGroup.add(shell);

    const fresnelUniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0 }
    };
    const fresnelGeometry = new THREE.IcosahedronGeometry(1.61, 4);
    const fresnelMaterial = new THREE.ShaderMaterial({
      uniforms: fresnelUniforms,
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - max(dot(normalize(vWorldNormal), viewDirection), 0.0), 2.4);
          float scan = pow(max(sin(vWorldPosition.y * 5.4 - uTime * 1.7), 0.0), 18.0);
          vec3 edgeColor = mix(vec3(0.13, 0.52, 0.72), vec3(0.62, 0.94, 1.0), fresnel);
          float alpha = (fresnel * 0.72 + scan * 0.12) * uOpacity;
          gl_FragColor = vec4(edgeColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const fresnelShell = new THREE.Mesh(fresnelGeometry, fresnelMaterial);
    defenseGroup.add(fresnelShell);

    const shellWireGeometry = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.55, 2));
    const shellWireMaterial = new THREE.LineBasicMaterial({
      color: 0x73e2ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const shellWire = new THREE.LineSegments(shellWireGeometry, shellWireMaterial);
    defenseGroup.add(shellWire);

    const shockwaves = [0, 1].map(() => {
      const geometry = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.68, 2));
      const material = new THREE.LineBasicMaterial({
        color: 0x8ceaff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const wave = new THREE.LineSegments(geometry, material);
      defenseGroup.add(wave);
      return wave;
    });

    const shardGeometry = new THREE.OctahedronGeometry(0.072, 0);
    const shardMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      metalness: 0.82,
      roughness: 0.2,
      emissive: 0x174b61,
      emissiveIntensity: 1.05,
      transparent: true,
      opacity: 0.92,
      flatShading: true
    });
    const shards = new THREE.InstancedMesh(shardGeometry, shardMaterial, shardCount);
    shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const cyan = new THREE.Color(0x86e8ff);
    const steel = new THREE.Color(0xb6c7dc);
    const violet = new THREE.Color(0x8e82ff);
    for (let index = 0; index < shardCount; index += 1) {
      shards.setColorAt(index, index % 9 === 0 ? violet : index % 3 === 0 ? steel : cyan);
    }
    if (shards.instanceColor) shards.instanceColor.needsUpdate = true;
    defenseGroup.add(shards);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x8ceaff,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const rings = [
      new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.014, 8, 160), ringMaterial.clone()),
      new THREE.Mesh(new THREE.TorusGeometry(1.98, 0.009, 8, 160), ringMaterial.clone()),
      new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.007, 8, 160), ringMaterial.clone())
    ];
    rings[0].rotation.x = Math.PI * 0.5;
    rings[1].rotation.set(Math.PI * 0.22, Math.PI * 0.34, 0);
    rings[2].rotation.set(-Math.PI * 0.28, Math.PI * 0.18, Math.PI * 0.14);
    defenseGroup.add(...rings);

    const scanGeometry = new THREE.RingGeometry(1.48, 1.54, 128);
    const scanMaterial = new THREE.MeshBasicMaterial({
      color: 0xd2f8ff,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const scanRing = new THREE.Mesh(scanGeometry, scanMaterial);
    scanRing.rotation.x = Math.PI * 0.5;
    defenseGroup.add(scanRing);

    const glowTexture = createGlowTexture();
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x75ddff,
      transparent: true,
      opacity: 0.54,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coreGlow = new THREE.Sprite(glowMaterial);
    coreGlow.scale.set(4.3, 4.3, 1);
    defenseGroup.add(coreGlow);

    const attackSignals = createAttackSignals();
    const attackGeometry = new THREE.BufferGeometry();
    const attackPositions = new Float32Array(attackCount * 3);
    attackGeometry.setAttribute("position", new THREE.BufferAttribute(attackPositions, 3));
    const attackMaterial = new THREE.PointsMaterial({
      color: 0xff6a52,
      size: 0.055,
      transparent: true,
      opacity: 0.66,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    const attacks = new THREE.Points(attackGeometry, attackMaterial);
    scene.add(attacks);

    const shieldShards = createShieldShards();
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const spinQuaternion = new THREE.Quaternion();
    const current = new THREE.Vector3();
    const instanceScale = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const pointer = new THREE.Vector2();
    const handlePointer = (event: PointerEvent) => {
      pointer.set(
        event.clientX / window.innerWidth - 0.5,
        event.clientY / window.innerHeight - 0.5
      );
    };
    window.addEventListener("pointermove", handlePointer, { passive: true });

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let frame = 0;
    let renderedProgress = progressRef.current;
    const draw = (time: number) => {
      const seconds = time * 0.001;
      const targetProgress = progressRef.current;
      renderedProgress = reducedMotion
        ? targetProgress
        : renderedProgress + (targetProgress - renderedProgress) * 0.055;
      const assembly = smootherStep((renderedProgress - 0.06) / 0.58);
      const protection = smootherStep((renderedProgress - 0.67) / 0.29);
      const motion = reducedMotion ? 0 : 1;

      shieldShards.forEach((shard, index) => {
        current.copy(shard.scatter).lerp(shard.target, assembly);
        const unsettled = 1 - assembly;
        current.x += Math.sin(seconds * 0.42 + shard.phase) * unsettled * 0.15 * motion;
        current.y += Math.cos(seconds * 0.36 + shard.phase) * unsettled * 0.13 * motion;
        normal.copy(shard.target).normalize();
        quaternion.setFromUnitVectors(up, normal);
        spinQuaternion.setFromAxisAngle(normal, seconds * shard.spin * motion + shard.phase);
        quaternion.multiply(spinQuaternion);
        const length = shard.scale * (0.58 + assembly * 0.36);
        instanceScale.set(0.64, length, 0.64);
        matrix.compose(current, quaternion, instanceScale);
        shards.setMatrixAt(index, matrix);
      });
      shards.instanceMatrix.needsUpdate = true;

      const attackAttribute = attackGeometry.attributes.position as THREE.BufferAttribute;
      attackSignals.forEach((signal, index) => {
        const travel = (signal.phase + seconds * signal.speed * motion) % 1;
        const distance = 5.2 - travel * 3.62;
        const deflection = assembly * Math.pow(travel, 3) * 0.65;
        current.copy(signal.direction).multiplyScalar(distance);
        current.x += Math.sin(signal.phase * 20 + seconds) * deflection;
        current.y += Math.cos(signal.phase * 17 + seconds * 0.8) * deflection;
        attackAttribute.setXYZ(index, current.x, current.y, current.z);
      });
      attackAttribute.needsUpdate = true;

      const pulse = 1 + Math.sin(seconds * 1.42) * 0.025 * protection * motion;
      core.rotation.y = seconds * 0.28 * motion;
      core.rotation.x = seconds * 0.11 * motion;
      core.scale.setScalar((0.42 + assembly * 0.58) * pulse);
      coreWire.rotation.copy(core.rotation);
      coreWire.scale.copy(core.scale);
      circuit.rotation.y = -seconds * 0.34 * motion;
      circuit.rotation.z = seconds * 0.18 * motion;
      circuit.scale.setScalar(0.45 + assembly * 0.55);
      circuitMaterial.opacity = 0.08 + assembly * 0.28 + protection * 0.12;
      coreMaterial.emissiveIntensity =
        0.52 + assembly * 0.56 + Math.sin(seconds * 2.1) * 0.12 * motion;

      shell.rotation.y = -seconds * 0.1 * motion + renderedProgress * 0.8;
      shell.rotation.x = seconds * 0.04 * motion;
      shellWire.rotation.copy(shell.rotation);
      fresnelShell.rotation.copy(shell.rotation);
      shell.scale.setScalar(0.86 + assembly * 0.14);
      shellWire.scale.copy(shell.scale);
      fresnelShell.scale.copy(shell.scale);
      shellMaterial.opacity = 0.02 + assembly * 0.08 + protection * 0.05;
      shellWireMaterial.opacity = 0.04 + assembly * 0.2 + protection * 0.13;
      fresnelUniforms.uTime.value = seconds;
      fresnelUniforms.uOpacity.value = assembly * (0.28 + protection * 0.44);

      shockwaves.forEach((wave, index) => {
        const phase = reducedMotion ? index * 0.5 : (seconds * 0.22 + index * 0.5) % 1;
        const waveScale = 0.9 + phase * 0.34;
        wave.scale.setScalar(waveScale);
        wave.rotation.y = -seconds * (0.08 + index * 0.025) * motion;
        const material = wave.material as THREE.LineBasicMaterial;
        material.opacity = assembly * Math.pow(1 - phase, 2) * (0.1 + protection * 0.2);
      });

      rings.forEach((ring, index) => {
        ring.rotation.z += (0.0012 + index * 0.00045) * motion;
        const material = ring.material as THREE.MeshBasicMaterial;
        material.opacity = (0.03 + assembly * 0.18 + protection * 0.12) * (1 - index * 0.18);
      });
      scanRing.rotation.z = seconds * 0.38 * motion;
      scanRing.position.y = Math.sin(seconds * 0.9) * 1.1 * assembly * motion;
      scanRing.scale.set(1, 0.22 + assembly * 0.78, 1);
      scanMaterial.opacity = assembly * (0.08 + protection * 0.14);

      shardMaterial.opacity = 0.5 + assembly * 0.42;
      attackMaterial.opacity = 0.6 - protection * 0.42;
      coreGlow.material.opacity = 0.12 + assembly * 0.25 + protection * 0.17;
      coreGlow.scale.setScalar((2.7 + assembly * 1.35 + protection * 0.35) * pulse);

      defenseGroup.rotation.y = seconds * 0.12 * motion + renderedProgress * Math.PI * 0.62;
      defenseGroup.rotation.z = Math.sin(seconds * 0.24) * 0.035 * motion;
      defenseGroup.position.x = stageOffset(renderedProgress);
      defenseGroup.position.y = Math.sin(seconds * 0.32) * 0.08 * motion;
      defenseGroup.position.z = -0.38 + assembly * 0.28;
      const groupScale = 0.9 + protection * 0.08;
      defenseGroup.scale.setScalar(groupScale);

      camera.position.x += (pointer.x * 0.38 - camera.position.x) * 0.035 * motion;
      camera.position.y += (-pointer.y * 0.24 - camera.position.y) * 0.035 * motion;
      camera.position.z = 8.65 - assembly * 0.35 + protection * 0.18;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointer);
      resizeObserver.disconnect();
      coreGeometry.dispose();
      coreMaterial.dispose();
      coreWireGeometry.dispose();
      coreWireMaterial.dispose();
      circuitGeometry.dispose();
      circuitMaterial.dispose();
      shellGeometry.dispose();
      shellMaterial.dispose();
      fresnelGeometry.dispose();
      fresnelMaterial.dispose();
      shellWireGeometry.dispose();
      shellWireMaterial.dispose();
      shockwaves.forEach((wave) => {
        wave.geometry.dispose();
        (wave.material as THREE.Material).dispose();
      });
      shardGeometry.dispose();
      shardMaterial.dispose();
      rings.forEach((ring) => {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      });
      ringMaterial.dispose();
      scanGeometry.dispose();
      scanMaterial.dispose();
      attackGeometry.dispose();
      attackMaterial.dispose();
      glowMaterial.dispose();
      glowTexture?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="size-full" aria-hidden="true" />;
}
