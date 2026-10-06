import * as THREE from 'three';
import { clamp } from '../utils/helpers.js';

const SAMPLE_WINDOW_MS = 120;
const STALE_MS = 60; // holding still this long before release means no fling
const YAW_PER_PX = 0.012;
const TILT_X_PER_PX = 0.006;

/**
 * Pointer interaction for the 3D canvas: hover highlight, selection, and dragging
 * the cluster like a plumb line. Uses pointer capture, ignores secondary buttons so
 * orbit/pan keep working, and always releases on pointercancel.
 *
 * `getSelectedIndex` returns the selected charm so highlights can be refreshed.
 */
export function attachInteraction({ canvas, camera, controls, cluster, getSelectedIndex, onSelect, onActivity }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pivot = cluster.anchorPos.clone();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -pivot.z);
  const hitPoint = new THREE.Vector3();

  let activePointer = null;
  let hoverBranch = null;
  let hoverQueued = false;
  let lastMove = null;

  let grab = null; // { startX, startY, thetaZOffset, targetYaw }
  let samples = [];

  function setRay(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
  }

  function pick(e) {
    setRay(e);
    const hits = raycaster.intersectObjects(cluster.getPickTargets(), false);
    return hits.length ? hits[0].object : null;
  }

  function refreshHighlights() {
    const selected = getSelectedIndex();
    cluster.branches.forEach((b) => {
      b.setHighlight(b.index === selected ? 'selected' : b === hoverBranch ? 'hover' : 'none');
    });
    cluster.version++;
    onActivity?.();
  }

  function planeAngle(e) {
    setRay(e);
    if (!raycaster.ray.intersectPlane(plane, hitPoint)) return null;
    // Angle of the pointer from the plumb line below the peg.
    return Math.atan2(hitPoint.x - pivot.x, -(hitPoint.y - pivot.y));
  }

  function onPointerDown(e) {
    if (e.button !== 0 || !e.isPrimary || activePointer !== null) return;
    const hit = pick(e);
    if (!hit) return;

    // Take the gesture away from OrbitControls before it starts.
    e.stopImmediatePropagation();
    e.preventDefault();
    controls.enabled = false;
    activePointer = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';

    const branch = hit.userData.branch;
    if (branch && branch.index !== getSelectedIndex()) onSelect(branch.index);

    cluster.beginGrab();
    const angle = planeAngle(e);
    grab = {
      startY: e.clientY,
      startX: cluster.sim.thetaX,
      lastClientX: e.clientX,
      thetaZOffset: angle === null ? 0 : cluster.sim.thetaZ - angle,
    };
    samples = [];
    onActivity?.();
  }

  function recordSample() {
    const now = performance.now();
    const t = cluster.dragTarget;
    samples.push({ now, x: t.x, y: t.y, z: t.z });
    while (samples.length && now - samples[0].now > SAMPLE_WINDOW_MS) samples.shift();
  }

  function onPointerMove(e) {
    if (activePointer !== null) {
      if (e.pointerId !== activePointer) return;
      const angle = planeAngle(e);
      const dx = e.clientX - grab.lastClientX;
      grab.lastClientX = e.clientX;

      const next = {
        x: grab.startX + (e.clientY - grab.startY) * TILT_X_PER_PX,
        y: cluster.dragTarget.y + dx * YAW_PER_PX,
      };
      if (angle !== null) next.z = angle + grab.thetaZOffset;
      cluster.setDragTarget(next);
      recordSample();
      return;
    }

    if (e.pointerType !== 'mouse') return;
    lastMove = e;
    if (hoverQueued) return;
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      if (activePointer !== null || !lastMove) return;
      const hit = pick(lastMove);
      const branch = hit ? hit.userData.branch : null;
      canvas.style.cursor = hit ? 'grab' : 'default';
      if (branch !== hoverBranch) {
        hoverBranch = branch;
        refreshHighlights();
      }
    });
  }

  function release(e) {
    if (activePointer === null || (e && e.pointerId !== activePointer)) return;
    const pointerId = activePointer;
    activePointer = null;
    if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
    controls.enabled = true;
    canvas.style.cursor = 'default';

    // Velocity from the last ~120 ms; a pause before release means no fling.
    let omega = { omegaX: 0, omegaY: 0, omegaZ: 0 };
    const now = performance.now();
    const last = samples[samples.length - 1];
    if (e?.type === 'pointerup' && last && now - last.now <= STALE_MS && samples.length > 1) {
      const first = samples[0];
      const span = (last.now - first.now) / 1000;
      if (span > 0.016) {
        omega = {
          omegaX: clamp((last.x - first.x) / span, -7, 7),
          omegaY: clamp((last.y - first.y) / span, -12, 12),
          omegaZ: clamp((last.z - first.z) / span, -7, 7),
        };
      }
    }
    cluster.endGrab(omega);
    grab = null;
    samples = [];
    onActivity?.();
  }

  function onPointerLeave() {
    lastMove = null;
    if (activePointer === null && hoverBranch) {
      hoverBranch = null;
      canvas.style.cursor = 'default';
      refreshHighlights();
    }
  }

  // Capture phase so we run before OrbitControls' own pointerdown handler.
  canvas.addEventListener('pointerdown', onPointerDown, { capture: true });
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('pointerleave', onPointerLeave);

  return {
    refreshHighlights,
    detach() {
      canvas.removeEventListener('pointerdown', onPointerDown, { capture: true });
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', release);
      canvas.removeEventListener('pointercancel', release);
      canvas.removeEventListener('lostpointercapture', release);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      if (activePointer !== null) release({ pointerId: activePointer, type: 'pointercancel' });
    },
  };
}
