import { useEffect, useRef } from "react";
import * as THREE from "three";

type DefenseTunnelProps = {
  phase: number;
};

export function DefenseTunnel({ phase }: DefenseTunnelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08090d, 0.038);
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 80);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const streamCount = 210;
    const streamPositions = new Float32Array(streamCount * 2 * 3);
    const streamColors = new Float32Array(streamCount * 2 * 3);
    const palette = [
      new THREE.Color(0xaeb4ff),
      new THREE.Color(0x5865f2),
      new THREE.Color(0xfb7185)
    ];

    for (let index = 0; index < streamCount; index += 1) {
      const offset = index * 6;
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.2 + Math.pow(Math.random(), 0.7) * 10;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.62;
      const z = -42 + Math.random() * 48;
      const length = 0.35 + Math.random() * 2.8;
      streamPositions.set([x, y, z, x * 1.015, y * 1.015, z + length], offset);
      const color = palette[index % palette.length]
        .clone()
        .multiplyScalar(0.55 + Math.random() * 0.45);
      streamColors.set([color.r, color.g, color.b, color.r, color.g, color.b], offset);
    }

    const streamGeometry = new THREE.BufferGeometry();
    streamGeometry.setAttribute("position", new THREE.BufferAttribute(streamPositions, 3));
    streamGeometry.setAttribute("color", new THREE.BufferAttribute(streamColors, 3));
    const streamMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending
    });
    const streams = new THREE.LineSegments(streamGeometry, streamMaterial);
    scene.add(streams);

    const rings = new THREE.Group();
    for (let index = 0; index < 12; index += 1) {
      const curve = new THREE.EllipseCurve(0, 0, 2.8 + index * 0.08, 1.7 + index * 0.05);
      const points = curve.getPoints(96).map((point) => new THREE.Vector3(point.x, point.y, 0));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: index % 3 === 0 ? 0x949cf7 : 0x343746,
        transparent: true,
        opacity: index % 3 === 0 ? 0.16 : 0.07,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.LineLoop(geometry, material);
      ring.position.z = -index * 4;
      rings.add(ring);
    }
    scene.add(rings);

    const nodeGeometry = new THREE.BufferGeometry();
    const nodePositions = new Float32Array(280 * 3);
    for (let index = 0; index < 280; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.8 + Math.random() * 9;
      nodePositions.set(
        [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.65, -36 + Math.random() * 42],
        index * 3
      );
    }
    nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    const nodes = new THREE.Points(
      nodeGeometry,
      new THREE.PointsMaterial({
        color: 0xc9cdfb,
        size: 0.025,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      })
    );
    scene.add(nodes);

    let pointerX = 0;
    let pointerY = 0;
    const updatePointer = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", updatePointer, { passive: true });

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
    const startedAt = performance.now();
    let frame = 0;
    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const targetSpeed = 0.04 + phaseRef.current * 0.024;
      if (!reducedMotion) {
        streams.position.z = (elapsed * targetSpeed * 28) % 8;
        nodes.position.z = (elapsed * targetSpeed * 18) % 7;
        rings.position.z = (elapsed * targetSpeed * 14) % 4;
        camera.position.x += (pointerX * 0.7 - camera.position.x) * 0.025;
        camera.position.y += (-pointerY * 0.45 - camera.position.y) * 0.025;
        camera.rotation.z = Math.sin(elapsed * 0.16) * 0.008;
        streams.rotation.z = Math.sin(elapsed * 0.08) * 0.025;
      }
      renderer.render(scene, camera);
      if (!reducedMotion) frame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", updatePointer);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Line || object instanceof THREE.Points)) return;
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
