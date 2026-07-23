import { useEffect, useRef } from "react";

type ReconstructionCanvasProps = {
  progress: number;
};

type Fragment = {
  column: number;
  row: number;
  delay: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  phase: number;
  depth: number;
  glint: number;
  clip: [number, number][];
};

type SignalParticle = {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
};

const columns = 16;
const rows = 20;

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smootherStep(value: number) {
  const normalized = clamp(value);
  return normalized * normalized * normalized * (normalized * (normalized * 6 - 15) + 10);
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

function createFragments(): Fragment[] {
  const random = createRandom(1847);
  return Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const directionX = column / (columns - 1) - 0.5;
    const directionY = row / (rows - 1) - 0.5;
    const shape = random();
    const clip: [number, number][] =
      shape < 0.43
        ? [
            [random() * 0.12, random() * 0.12],
            [0.88 + random() * 0.12, 0.12 + random() * 0.24],
            [0.18 + random() * 0.25, 0.88 + random() * 0.12]
          ]
        : shape < 0.88
          ? [
              [0.08 + random() * 0.2, random() * 0.12],
              [0.88 + random() * 0.12, 0.82 + random() * 0.18],
              [random() * 0.12, 0.68 + random() * 0.28]
            ]
          : [
              [random() * 0.12, 0.08 + random() * 0.14],
              [0.72 + random() * 0.28, random() * 0.12],
              [0.9 + random() * 0.1, 0.64 + random() * 0.3],
              [0.12 + random() * 0.22, 0.9 + random() * 0.1]
            ];
    return {
      column,
      row,
      delay: 0.02 + random() * 0.28 + Math.hypot(directionX, directionY) * 0.08,
      offsetX: directionX * (0.18 + random() * 0.32) + (random() - 0.5) * 0.22,
      offsetY: directionY * (0.16 + random() * 0.3) + (random() - 0.5) * 0.2,
      rotation: (random() - 0.5) * 1.25,
      scale: 0.68 + random() * 0.2,
      phase: random() * Math.PI * 2,
      depth: 0.72 + random() * 0.68,
      glint: random(),
      clip
    };
  });
}

function createSignalParticles(): SignalParticle[] {
  const random = createRandom(9204);
  return Array.from({ length: 46 }, () => ({
    x: random(),
    y: random(),
    length: 18 + random() * 68,
    speed: 0.025 + random() * 0.07,
    opacity: 0.05 + random() * 0.14
  }));
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  alpha = 1,
  scaleBoost = 1,
  offsetX = 0,
  offsetY = 0
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * scaleBoost;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.save();
  context.globalAlpha = alpha;
  context.drawImage(
    image,
    (width - drawWidth) / 2 + offsetX,
    (height - drawHeight) / 2 + offsetY,
    drawWidth,
    drawHeight
  );
  context.restore();
}

export function ReconstructionCanvas({ progress }: ReconstructionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const fragments = createFragments();
    const signalParticles = createSignalParticles();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let fracturedImage: HTMLImageElement | null = null;
    let rebuiltImage: HTMLImageElement | null = null;
    let frame = 0;
    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let renderedProgress = progressRef.current;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(bounds.width, 1);
      height = Math.max(bounds.height, 1);
      pixelRatio = Math.min(window.devicePixelRatio, 1.6);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    Promise.all([
      loadImage("/onboarding/fractured-dark.png"),
      loadImage("/onboarding/reconstructed-shards.png")
    ]).then(([fractured, rebuilt]) => {
      fracturedImage = fractured;
      rebuiltImage = rebuilt;
    });

    const draw = (time: number) => {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const targetProgress = progressRef.current;
      renderedProgress = reducedMotion
        ? targetProgress > 0.25
          ? 1
          : 0
        : renderedProgress + (targetProgress - renderedProgress) * 0.065;
      const rawProgress = renderedProgress;
      const rebuildProgress = 0.06 + smootherStep((rawProgress - 0.08) / 0.84) * 0.94;

      const backgroundPulse = 0.035 + Math.sin(time * 0.0008) * 0.012;
      context.fillStyle = `rgba(67, 210, 255, ${backgroundPulse})`;
      signalParticles.forEach((particle) => {
        const travel = reducedMotion ? 0 : (time * particle.speed * 0.001 + rawProgress * 1.8) % 1;
        const y = ((particle.y + travel) % 1) * height;
        const x = particle.x * width;
        const gradient = context.createLinearGradient(x, y - particle.length, x, y);
        gradient.addColorStop(0, "rgba(85, 217, 255, 0)");
        gradient.addColorStop(1, `rgba(149, 232, 255, ${particle.opacity})`);
        context.fillStyle = gradient;
        context.fillRect(x, y - particle.length, 0.7, particle.length);
      });

      if (fracturedImage) {
        const breathing = reducedMotion ? 0 : Math.sin(time * 0.00014) * 0.008;
        const baseScale = 1.05 + rawProgress * 0.035 + breathing;
        const parallaxX = reducedMotion ? 0 : Math.sin(time * 0.0001) * 9;
        const parallaxY = reducedMotion ? 0 : Math.cos(time * 0.00013) * 6;
        drawCover(
          context,
          fracturedImage,
          width,
          height,
          0.78 - rebuildProgress * 0.56,
          baseScale,
          parallaxX,
          parallaxY
        );
      }

      if (rebuiltImage) {
        const image = rebuiltImage;
        const coverScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
        const coverWidth = image.naturalWidth * coverScale;
        const coverHeight = image.naturalHeight * coverScale;
        const coverX = (width - coverWidth) / 2;
        const coverY = (height - coverHeight) / 2;
        const cellWidth = width / columns;
        const cellHeight = height / rows;

        const ghostAlpha = Math.sin(Math.min(rebuildProgress, 1) * Math.PI) * 0.09;
        if (ghostAlpha > 0) {
          context.save();
          context.filter = "saturate(0.65) contrast(1.15)";
          drawCover(context, image, width, height, ghostAlpha, 1.002);
          context.restore();
        }

        fragments.forEach((fragment) => {
          const localProgress = smootherStep(
            (rebuildProgress - fragment.delay) / Math.max(1 - fragment.delay, 0.01)
          );
          if (localProgress <= 0.001) return;

          const destinationX = fragment.column * cellWidth;
          const destinationY = fragment.row * cellHeight;
          const sourceX = (destinationX - coverX) / coverScale;
          const sourceY = (destinationY - coverY) / coverScale;
          const sourceWidth = cellWidth / coverScale;
          const sourceHeight = cellHeight / coverScale;
          const drift = reducedMotion
            ? 0
            : Math.sin(time * 0.00055 + fragment.phase) * 4 * (1 - localProgress);
          const easingDistance = Math.pow(1 - localProgress, 1.35);
          const translatedX = fragment.offsetX * width * easingDistance * fragment.depth + drift;
          const translatedY =
            fragment.offsetY * height * easingDistance * fragment.depth - drift * 0.35;

          if (localProgress > 0.08 && localProgress < 0.88 && fragment.glint > 0.68) {
            context.save();
            context.globalAlpha = Math.sin(localProgress * Math.PI) * 0.13;
            context.strokeStyle = "rgba(120, 225, 255, 0.9)";
            context.lineWidth = 0.55;
            context.beginPath();
            context.moveTo(
              destinationX + cellWidth / 2 + translatedX,
              destinationY + cellHeight / 2 + translatedY
            );
            context.lineTo(destinationX + cellWidth / 2, destinationY + cellHeight / 2);
            context.stroke();
            context.restore();
          }

          context.save();
          context.translate(
            destinationX + cellWidth / 2 + translatedX,
            destinationY + cellHeight / 2 + translatedY
          );
          context.rotate(fragment.rotation * (1 - localProgress));
          const scale = fragment.scale + (1 - fragment.scale) * localProgress;
          context.scale(scale, scale);
          context.globalAlpha = 0.025 + Math.pow(localProgress, 1.55) * 0.42;
          context.beginPath();
          fragment.clip.forEach(([x, y], pointIndex) => {
            const pointX = (x - 0.5) * cellWidth * 1.16;
            const pointY = (y - 0.5) * cellHeight * 1.16;
            if (pointIndex === 0) context.moveTo(pointX, pointY);
            else context.lineTo(pointX, pointY);
          });
          context.closePath();
          context.clip();
          context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            -cellWidth / 2,
            -cellHeight / 2,
            cellWidth,
            cellHeight
          );
          if (fragment.glint > 0.82) {
            context.globalCompositeOperation = "screen";
            context.globalAlpha = Math.sin(localProgress * Math.PI) * 0.2;
            context.fillStyle = "rgba(147, 232, 255, 0.55)";
            context.fillRect(-cellWidth / 2, -cellHeight / 2, cellWidth, 0.7);
          }
          context.restore();
        });

        const completedAlpha = smootherStep((rawProgress - 0.88) / 0.12);
        if (completedAlpha > 0) {
          const completedBreathing = reducedMotion ? 0 : Math.sin(time * 0.00016) * 0.007;
          drawCover(
            context,
            image,
            width,
            height,
            completedAlpha * 0.28,
            1.018 + completedBreathing,
            reducedMotion ? 0 : Math.cos(time * 0.00011) * 7,
            reducedMotion ? 0 : Math.sin(time * 0.00009) * 5
          );
        }
      }

      if (rawProgress > 0.025 && rawProgress < 0.96) {
        const scanY = ((rawProgress * 1.22 + 0.05) % 1) * height;
        const scanGlow = context.createLinearGradient(0, scanY - 55, 0, scanY + 55);
        scanGlow.addColorStop(0, "rgba(76, 216, 255, 0)");
        scanGlow.addColorStop(0.48, "rgba(76, 216, 255, 0.045)");
        scanGlow.addColorStop(0.5, "rgba(180, 243, 255, 0.28)");
        scanGlow.addColorStop(0.52, "rgba(76, 216, 255, 0.045)");
        scanGlow.addColorStop(1, "rgba(76, 216, 255, 0)");
        context.fillStyle = scanGlow;
        context.fillRect(0, scanY - 55, width, 110);
      }

      const vignette = context.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.1,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.72
      );
      vignette.addColorStop(0, "rgba(2, 5, 10, 0.03)");
      vignette.addColorStop(0.62, "rgba(2, 5, 10, 0.2)");
      vignette.addColorStop(1, "rgba(2, 5, 10, 0.78)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);

      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="size-full" aria-hidden="true" />;
}
