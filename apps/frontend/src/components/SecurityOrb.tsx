import { useEffect, useRef } from "react";
import * as THREE from "three";

export function SecurityOrb() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 9.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);

    const coreGeometry = new THREE.IcosahedronGeometry(1.46, 3);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x171a4a,
      emissive: 0x5865f2,
      emissiveIntensity: 0.82,
      roughness: 0.18,
      metalness: 0.48,
      transmission: 0.2,
      transparent: true,
      opacity: 0.92,
      flatShading: true
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    root.add(core);

    const wireGeometry = new THREE.IcosahedronGeometry(1.82, 2);
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xaeb4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.2
    });
    const wire = new THREE.Mesh(wireGeometry, wireMaterial);
    root.add(wire);

    const ringGroup = new THREE.Group();
    const ringColors = [0x5865f2, 0xaeb4ff, 0xfb7185];
    ringColors.forEach((color, index) => {
      const geometry = new THREE.TorusGeometry(2.18 + index * 0.34, 0.012, 10, 160);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.42 - index * 0.08
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.set(
        Math.PI * (0.22 + index * 0.18),
        Math.PI * (0.08 + index * 0.14),
        Math.PI * index * 0.18
      );
      ringGroup.add(ring);
    });
    root.add(ringGroup);

    const particleCount = 760;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.45 + Math.random() * 1.75;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xc9cdfb,
      size: 0.022,
      transparent: true,
      opacity: 0.58,
      sizeAttenuation: true
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    root.add(particles);

    const attackCount = 42;
    const attackPositions = new Float32Array(attackCount * 2 * 3);
    for (let index = 0; index < attackCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * 2.2;
      const outerRadius = 4.8 + Math.random() * 1.5;
      const innerRadius = 2.15 + Math.random() * 0.3;
      const offset = index * 6;
      attackPositions.set(
        [
          Math.cos(angle) * outerRadius,
          elevation,
          Math.sin(angle) * outerRadius,
          Math.cos(angle) * innerRadius,
          elevation * 0.42,
          Math.sin(angle) * innerRadius
        ],
        offset
      );
    }
    const attackGeometry = new THREE.BufferGeometry();
    attackGeometry.setAttribute("position", new THREE.BufferAttribute(attackPositions, 3));
    const attackMaterial = new THREE.LineBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending
    });
    const attackRays = new THREE.LineSegments(attackGeometry, attackMaterial);
    root.add(attackRays);

    const glowGeometry = new THREE.SphereGeometry(1.9, 48, 48);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x5865f2,
      transparent: true,
      opacity: 0.026,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    root.add(glow);

    scene.add(new THREE.AmbientLight(0xaeb4ff, 1.2));
    const cyanLight = new THREE.PointLight(0x5865f2, 36, 18);
    cyanLight.position.set(3.5, 2.8, 4.5);
    scene.add(cyanLight);
    const violetLight = new THREE.PointLight(0x818cf8, 20, 16);
    violetLight.position.set(-4, -2, 2.5);
    scene.add(violetLight);

    let pointerX = 0;
    let pointerY = 0;
    const updatePointer = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.5;
      pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.35;
    };
    container.addEventListener("pointermove", updatePointer);

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animationStartedAt = performance.now();
    let animationFrame = 0;
    const render = () => {
      const elapsed = (performance.now() - animationStartedAt) / 1000;
      if (!reducedMotion) {
        root.rotation.y += (pointerX - root.rotation.y) * 0.025;
        root.rotation.x += (-pointerY - root.rotation.x) * 0.025;
        core.rotation.y = elapsed * 0.16;
        core.rotation.x = elapsed * 0.08;
        wire.rotation.y = -elapsed * 0.09;
        wire.rotation.z = elapsed * 0.05;
        ringGroup.rotation.y = elapsed * 0.07;
        particles.rotation.y = elapsed * 0.025;
        particles.rotation.x = Math.sin(elapsed * 0.16) * 0.08;
        attackRays.rotation.y = -elapsed * 0.12;
        attackRays.rotation.z = Math.sin(elapsed * 0.35) * 0.08;
        attackMaterial.opacity = 0.24 + Math.sin(elapsed * 2.1) * 0.1;
        core.scale.setScalar(1 + Math.sin(elapsed * 1.4) * 0.025);
      }
      renderer.render(scene, camera);
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", updatePointer);
      scene.traverse((object) => {
        if (
          !(
            object instanceof THREE.Mesh ||
            object instanceof THREE.Points ||
            object instanceof THREE.Line
          )
        )
          return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} className="size-full" aria-hidden="true" />;
}
