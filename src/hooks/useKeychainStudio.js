import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CONFIG, HARDWARE_MATS, EMOJI_DATABASE } from '../constants/index.js';
import { extractFirstEmoji } from '../utils/helpers.js';
import { MasterKeychainCluster } from '../three/MasterKeychainCluster.js';
import {
  exportGLB,
  exportGLTF,
  exportOBJ,
  captureSnapshot
} from '../three/exporters.js';

export function useKeychainStudio() {
  const containerRef = useRef(null);
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    masterCluster: null,
    ambientLight: null,
    dirLight1: null,
    dirLight2: null,
    clock: null,
    animId: null
  });

  const [toast, setToast] = useState({ text: 'READY', visible: false });
  const toastTimerRef = useRef(null);

  const [bgMode, setBgMode] = useState('light');
  const [branches, setBranches] = useState([]);
  const [activeCharmIndex, setActiveCharmIndex] = useState(0);
  const [customEmojiInput, setCustomEmojiInput] = useState('👾');
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chainLinks, setChainLinks] = useState(4);
  const [clusterSpread, setClusterSpread] = useState(1.0);
  const [clusterSpreadText, setClusterSpreadText] = useState('COMPACT');
  const [thickness, setThickness] = useState(2);
  const [finish, setFinish] = useState('steel');
  const [exportAnimType, setExportAnimType] = useState('swing'); // 'swing' | 'spin' | 'both'

  const showToast = useCallback((msg) => {
    setToast({ text: msg, visible: true });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 1800);
  }, []);

  const syncStateFromCluster = useCallback((indexToSelect = null) => {
    const { masterCluster } = threeRef.current;
    if (!masterCluster) return;

    const bList = masterCluster.branches.map((b, i) => ({
      index: i,
      emoji: b.emoji,
      thickness: b.thickness,
      chainLinks: b.chainLinks
    }));
    setBranches(bList);

    const idx = indexToSelect !== null ? indexToSelect : activeCharmIndex;
    const clampedIdx = Math.max(0, Math.min(idx, bList.length - 1));
    setActiveCharmIndex(clampedIdx);

    const activeBranch = masterCluster.branches[clampedIdx];
    if (activeBranch) {
      setCustomEmojiInput(activeBranch.emoji);
      setChainLinks(activeBranch.chainLinks || 4);
      setThickness(activeBranch.thickness || 2);
    }
    setFinish(masterCluster.finish);
  }, [activeCharmIndex]);

  const selectCharm = useCallback((index) => {
    const { masterCluster } = threeRef.current;
    if (!masterCluster || !masterCluster.branches[index]) return;

    setActiveCharmIndex(index);
    const b = masterCluster.branches[index];
    setCustomEmojiInput(b.emoji);
    setChainLinks(b.chainLinks || 4);
    setThickness(b.thickness || 2);
    showToast(`SELECTED CHARM #${index + 1}: ${b.emoji}`);
  }, [showToast]);

  const applyNewEmoji = useCallback((rawChar) => {
    const { masterCluster } = threeRef.current;
    if (!masterCluster) return;

    const extracted = extractFirstEmoji(rawChar);
    const b = masterCluster.branches[activeCharmIndex];
    if (b) {
      setCustomEmojiInput(extracted);
      b.emoji = extracted;

      const matSpec = HARDWARE_MATS[masterCluster.finish] || HARDWARE_MATS.steel;
      const hwMaterial = new THREE.MeshStandardMaterial({
        color: matSpec.color,
        metalness: matSpec.metalness,
        roughness: matSpec.roughness,
        transparent: false,
        opacity: 1.0,
        depthWrite: true,
      });

      b.build(hwMaterial);
      masterCluster.updateMeshTransforms();
      syncStateFromCluster(activeCharmIndex);
      showToast(`UPDATED CHARM #${activeCharmIndex + 1}: ${extracted}`);
    }
  }, [activeCharmIndex, showToast, syncStateFromCluster]);

  const handleAddCharm = () => {
    const { masterCluster } = threeRef.current;
    if (!masterCluster) return;

    const pool = ['💎', '⭐', '🍕', '🎮', '🚀', '🦄', '🕹️', '⚡', '👑', '🌈'];
    const randomEmoji = pool[masterCluster.branches.length % pool.length];
    const newBranch = masterCluster.addCharm(randomEmoji, 2, 4);
    if (newBranch) {
      const newIdx = masterCluster.branches.length - 1;
      syncStateFromCluster(newIdx);
      showToast(`ATTACHED ${randomEmoji} TO MASTER RING`);
    }
  };

  const handleRemoveCharm = (idx) => {
    const { masterCluster } = threeRef.current;
    if (!masterCluster) return;

    if (masterCluster.removeCharm(idx)) {
      const nextIdx = activeCharmIndex >= masterCluster.branches.length
        ? masterCluster.branches.length - 1
        : activeCharmIndex;
      syncStateFromCluster(nextIdx);
      showToast('REMOVED CHARM FROM RING');
    }
  };

  const handleUpdateLinks = (newCount) => {
    const count = THREE.MathUtils.clamp(parseInt(newCount), 4, 10);
    const { masterCluster } = threeRef.current;
    if (!masterCluster) return;

    const b = masterCluster.branches[activeCharmIndex];
    if (!b) return;

    b.chainLinks = count;
    setChainLinks(count);

    const matSpec = HARDWARE_MATS[masterCluster.finish] || HARDWARE_MATS.steel;
    const hwMaterial = new THREE.MeshStandardMaterial({
      color: matSpec.color,
      metalness: matSpec.metalness,
      roughness: matSpec.roughness,
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
    });

    b.build(hwMaterial);
    masterCluster.updateMeshTransforms();
    syncStateFromCluster(activeCharmIndex);
    showToast(`CHARM #${activeCharmIndex + 1} CHAIN: ${count} LINKS`);
  };

  const handleUpdateSpread = (val) => {
    const spreadVal = parseFloat(val);
    CONFIG.clusterSpread = spreadVal;
    setClusterSpread(spreadVal);
    setClusterSpreadText(
      spreadVal < 0.9 ? 'TIGHT' : spreadVal > 1.15 ? 'WIDE' : 'COMPACT'
    );
    const { masterCluster } = threeRef.current;
    if (masterCluster) masterCluster.updateMeshTransforms();
  };

  const handleUpdateThickness = (t) => {
    const { masterCluster } = threeRef.current;
    if (!masterCluster) return;

    const b = masterCluster.branches[activeCharmIndex];
    if (b && t !== b.thickness) {
      b.thickness = t;
      setThickness(t);

      const matSpec = HARDWARE_MATS[masterCluster.finish] || HARDWARE_MATS.steel;
      const hwMaterial = new THREE.MeshStandardMaterial({
        color: matSpec.color,
        metalness: matSpec.metalness,
        roughness: matSpec.roughness,
        transparent: false,
        opacity: 1.0,
        depthWrite: true,
      });

      b.build(hwMaterial);
      masterCluster.updateMeshTransforms();
      syncStateFromCluster(activeCharmIndex);
      showToast('THICKNESS UPDATED');
    }
  };

  const handleUpdateFinish = (f) => {
    const { masterCluster } = threeRef.current;
    if (!masterCluster) return;

    if (f !== masterCluster.finish) {
      masterCluster.finish = f;
      setFinish(f);
      masterCluster.buildCluster();
      syncStateFromCluster(activeCharmIndex);
      showToast(`ALLOY: ${f.toUpperCase()}`);
    }
  };

  const handleCameraView = (cam) => {
    const { camera, controls } = threeRef.current;
    if (!camera || !controls) return;

    if (cam === 'front') {
      camera.position.set(0, 0.12, 2.95);
      controls.target.set(0, 0.10, 0);
    } else if (cam === 'iso') {
      camera.position.set(1.9, 0.85, 2.3);
      controls.target.set(0, 0.10, 0);
    } else if (cam === 'hardware') {
      camera.position.set(0, 0.92, 1.45);
      controls.target.set(0, 0.90, 0);
    }
    controls.update();
    showToast(`CAMERA: ${cam.toUpperCase()}`);
  };

  const handleSetSceneBackground = (mode) => {
    CONFIG.bgMode = mode;
    setBgMode(mode);
    const isLight = mode === 'light';
    const colHex = isLight ? 0xEBEBEB : 0x212121;
    const { scene, ambientLight, dirLight1 } = threeRef.current;

    if (scene) scene.background.setHex(colHex);
    if (containerRef.current) {
      containerRef.current.style.backgroundColor = isLight ? '#EBEBEB' : '#212121';
    }
    if (ambientLight) ambientLight.intensity = isLight ? 1.25 : 0.95;
    if (dirLight1) dirLight1.intensity = isLight ? 2.1 : 2.4;

    showToast(`SCENE BG: ${isLight ? '#EBEBEB' : '#212121'}`);
  };

  const handleSpinCluster = () => {
    const { masterCluster } = threeRef.current;
    if (masterCluster) {
      masterCluster.applySpin(9.0);
      showToast('SPUN CLUSTER 360°');
    }
  };

  const handleNudgeCluster = () => {
    const { masterCluster } = threeRef.current;
    if (masterCluster) {
      masterCluster.applyImpulse(0.85);
      showToast('SWUNG CLUSTER');
    }
  };

  const handleResetPose = () => {
    const { masterCluster } = threeRef.current;
    if (masterCluster) {
      masterCluster.resetPose();
      showToast('RESET CLUSTER TO REST POSE');
    }
  };

  const handleExportGLB = () => {
    const { masterCluster } = threeRef.current;
    exportGLB(masterCluster, showToast, exportAnimType);
  };

  const handleExportGLTF = () => {
    const { masterCluster } = threeRef.current;
    exportGLTF(masterCluster, showToast, exportAnimType);
  };

  const handleExportOBJ = () => {
    const { masterCluster } = threeRef.current;
    exportOBJ(masterCluster, showToast);
  };

  const handleCaptureSnapshot = () => {
    const { renderer, scene, camera } = threeRef.current;
    if (renderer && scene && camera) {
      captureSnapshot(renderer, scene, camera, showToast);
    }
  };

  // Initialize Three.js scene
  useEffect(() => {
    window.showToast = showToast;

    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || (window.innerWidth - 450);
    const h = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xEBEBEB);

    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 40);
    camera.position.set(0, 0.12, 2.95);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = false;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.0;
    controls.maxDistance = 5.0;
    controls.target.set(0, 0.10, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.1);
    dirLight1.position.set(2.8, 4.5, 3.5);
    dirLight1.castShadow = false;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xdbe4f2, 1.35);
    dirLight2.position.set(-3.0, 2.5, -2.5);
    dirLight2.castShadow = false;
    scene.add(dirLight2);

    const masterCluster = new MasterKeychainCluster(showToast);
    masterCluster.addCharm('👾', 2, 4); // Center Hero (4 links)
    masterCluster.addCharm('🥑', 2, 5); // Left Wing (5 links)
    masterCluster.addCharm('🔥', 2, 4); // Right Wing (4 links)
    scene.add(masterCluster.rootGroup);

    const clock = new THREE.Clock();

    threeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      masterCluster,
      ambientLight,
      dirLight1,
      dirLight2,
      clock,
      animId: null
    };

    syncStateFromCluster(0);

    // Pointer interactions
    let lastClientX = 0;
    let lastClientY = 0;
    let dragDeltaAccumX = 0;
    let dragDeltaAccumY = 0;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(masterCluster.rootGroup.children, true);

      if (hits.length > 0) {
        masterCluster.isGrabbed = true;
        controls.enabled = false;
        container.style.cursor = 'grabbing';

        lastClientX = e.clientX;
        lastClientY = e.clientY;
        dragDeltaAccumX = 0;
        dragDeltaAccumY = 0;

        masterCluster.dragTargetAngleX = masterCluster.thetaX;
        masterCluster.dragTargetAngleZ = masterCluster.thetaZ;

        let hitObj = hits[0].object;
        while (hitObj && hitObj.parent && hitObj.parent !== masterCluster.rootGroup) {
          hitObj = hitObj.parent;
        }
        if (hitObj) {
          masterCluster.branches.forEach((b, i) => {
            if (b.branchGroup === hitObj) selectCharm(i);
          });
        }
      }
    };

    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (masterCluster && masterCluster.isGrabbed) {
        const dx = e.clientX - lastClientX;
        const dy = e.clientY - lastClientY;
        lastClientX = e.clientX;
        lastClientY = e.clientY;

        dragDeltaAccumX = dx;
        dragDeltaAccumY = dy;

        masterCluster.thetaY += dx * 0.022;
        masterCluster.omegaY = dx * 0.45;

        masterCluster.dragTargetAngleZ = THREE.MathUtils.clamp(
          masterCluster.dragTargetAngleZ - dx * 0.005, 
          -1.15, 
          1.15
        );
        masterCluster.dragTargetAngleX = THREE.MathUtils.clamp(
          masterCluster.dragTargetAngleX + dy * 0.007, 
          -1.15, 
          1.15
        );

        return;
      }

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(masterCluster.rootGroup.children, true);
      container.style.cursor = hits.length > 0 ? 'grab' : 'default';
    };

    const onPointerUp = () => {
      if (masterCluster && masterCluster.isGrabbed) {
        masterCluster.isGrabbed = false;
        controls.enabled = true;
        container.style.cursor = 'default';

        masterCluster.omegaY = THREE.MathUtils.clamp(dragDeltaAccumX * 0.65, -12.0, 12.0);
        masterCluster.omegaZ = THREE.MathUtils.clamp(-dragDeltaAccumX * 0.28, -7.0, 7.0);
        masterCluster.omegaX = THREE.MathUtils.clamp(dragDeltaAccumY * 0.28, -7.0, 7.0);

        if (Math.abs(masterCluster.omegaY) > 0.8 || Math.abs(masterCluster.omegaX) > 0.4) {
          showToast('CLUSTER SPUN & RELEASED');
        }
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', onResize);

    const animate = () => {
      threeRef.current.animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.033);

      if (masterCluster) {
        masterCluster.updatePhysics(dt);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (threeRef.current.animId) cancelAnimationFrame(threeRef.current.animId);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const filteredEmojis = EMOJI_DATABASE.filter(item => {
    const matchCat = category === 'all' || item.cat === category;
    const matchSearch = !q || item.char.includes(q) || item.tags.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const activeBranch = branches[activeCharmIndex];

  return {
    containerRef,
    toast,
    bgMode,
    branches,
    activeCharmIndex,
    activeBranch,
    customEmojiInput,
    setCustomEmojiInput,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    chainLinks,
    clusterSpread,
    clusterSpreadText,
    thickness,
    finish,
    exportAnimType,
    setExportAnimType,
    filteredEmojis,
    // Action handlers
    selectCharm,
    applyNewEmoji,
    handleAddCharm,
    handleRemoveCharm,
    handleUpdateLinks,
    handleUpdateSpread,
    handleUpdateThickness,
    handleUpdateFinish,
    handleCameraView,
    handleSetSceneBackground,
    handleSpinCluster,
    handleNudgeCluster,
    handleResetPose,
    handleExportGLB,
    handleExportGLTF,
    handleExportOBJ,
    handleCaptureSnapshot
  };
}
