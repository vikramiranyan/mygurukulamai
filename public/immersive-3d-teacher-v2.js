(() => {
  'use strict';
  const THREE = window.THREE;
  if (!THREE || !window.WebGLRenderingContext) return;
  const mounts = new WeakMap();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const material = (color, roughness = 0.72, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  function createTeacher(scene) {
    const root = new THREE.Group(); root.position.y = -1.18; scene.add(root);
    const skin = material(0xc9825f), skinLight = material(0xf0b08a), hair = material(0x241b1c, 0.9), blouse = material(0x2d7665), sari = material(0xe995b0), gold = material(0xd6a72c, 0.42, 0.35), dark = material(0x172d2a), shoe = material(0x253f3a), mouthMat = material(0x7f3040);
    const hips = new THREE.Group(); hips.position.y = 1; root.add(hips);
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.72, 1.15, 24), sari); lower.position.y = -0.25; hips.add(lower);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.82, 6, 18), blouse); torso.scale.set(0.92, 1, 0.7); torso.position.y = 0.62; hips.add(torso);
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.55, 0.08), sari); sash.position.set(0.39, 0.55, 0.48); sash.rotation.z = -0.18; hips.add(sash);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.34, 18), skinLight); neck.position.y = 1.45; hips.add(neck);
    const head = new THREE.Group(); head.position.y = 1.9; hips.add(head);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 18), skinLight); face.scale.set(0.92, 1.05, 0.88); head.add(face);
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.66, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), hair); hairCap.position.y = 0.2; head.add(hairCap);
    const braid = new THREE.Group(); braid.position.set(-0.46, 0.02, -0.03); head.add(braid);
    for (let i = 0; i < 7; i += 1) { const bead = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.08, 0.16 - i * 0.012), 12, 10), hair); bead.position.y = -i * 0.16; bead.position.z = 0.02 + i * 0.008; braid.add(bead); }
    const eyeGeo = new THREE.SphereGeometry(0.085, 12, 10); const eyeL = new THREE.Mesh(eyeGeo, dark), eyeR = new THREE.Mesh(eyeGeo, dark); eyeL.position.set(-0.22, 0.05, 0.54); eyeR.position.set(0.22, 0.05, 0.54); head.add(eyeL, eyeR);
    const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), material(0x9d2945)); bindi.position.set(0, 0.29, 0.58); head.add(bindi);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.17, 12), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.02, 0.58); head.add(nose);
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 10), mouthMat); mouth.scale.set(1.35, 0.34, 0.42); mouth.position.set(0, -0.24, 0.57); head.add(mouth);
    const earringL = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 14), gold), earringR = earringL.clone(); earringL.position.set(-0.61, -0.02, 0.16); earringR.position.set(0.61, -0.02, 0.16); head.add(earringL, earringR);
    const armL = new THREE.Group(), armR = new THREE.Group(); armL.position.set(-0.53, 0.94, 0); armR.position.set(0.53, 0.94, 0); hips.add(armL, armR); armL.rotation.z = -0.22; armR.rotation.z = 0.22;
    const armGeo = new THREE.CapsuleGeometry(0.13, 0.7, 5, 12); const armMeshL = new THREE.Mesh(armGeo, blouse), armMeshR = new THREE.Mesh(armGeo, blouse); armMeshL.position.y = -0.38; armMeshR.position.y = -0.38; armL.add(armMeshL); armR.add(armMeshR);
    const handGeo = new THREE.SphereGeometry(0.17, 14, 10); const handL = new THREE.Mesh(handGeo, skinLight), handR = new THREE.Mesh(handGeo, skinLight); handL.position.y = -0.82; handR.position.y = -0.82; armL.add(handL); armR.add(handR);
    const legGeo = new THREE.CapsuleGeometry(0.16, 0.72, 5, 12); const legL = new THREE.Mesh(legGeo, dark), legR = new THREE.Mesh(legGeo, dark); legL.position.set(-0.2, -1.08, 0); legR.position.set(0.2, -1.08, 0); root.add(legL, legR);
    const shoeL = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), shoe), shoeR = shoeL.clone(); shoeL.scale.set(1.35, 0.55, 1.7); shoeR.scale.copy(shoeL.scale); shoeL.position.set(-0.2, -1.56, 0.13); shoeR.position.set(0.2, -1.56, 0.13); root.add(shoeL, shoeR);
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.38), material(0x5b66c9)); book.position.set(0.48, 0.32, 0.55); book.rotation.z = -0.15; hips.add(book);
    return { root, head, mouth, armL, armR, book };
  }
  function disposeObject(root) { root.traverse(object => { if (!object.isMesh) return; object.geometry?.dispose?.(); if (Array.isArray(object.material)) object.material.forEach(m => m?.dispose?.()); else object.material?.dispose?.(); }); }
  function init(container) {
    if (!container || mounts.has(container)) return mounts.get(container) || null;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { container.dataset.webglFallback = 'true'; return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.domElement.className = 'ga-3d-canvas'; renderer.domElement.setAttribute('aria-label', 'Animated 3D teacher'); container.replaceChildren(renderer.domElement);
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50); camera.position.set(0, 1.15, 6.2); camera.lookAt(0, 0.65, 0);
    scene.add(new THREE.HemisphereLight(0xfff6df, 0x35554c, 2.2)); const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 5, 5); scene.add(key); const rim = new THREE.PointLight(0xd8b5ff, 1.6, 8); rim.position.set(-3, 2, 2); scene.add(rim);
    const teacher = createTeacher(scene); const state = { destroyed: false, t: 0, active: true, lastNow: 0 }; mounts.set(container, state);
    const resize = () => { if (state.destroyed) return; const width = Math.max(120, container.clientWidth || 174), height = Math.max(150, container.clientHeight || 206); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    resize(); const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; resizeObserver?.observe(container);
    const visibilityObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => { state.active = entries[0]?.isIntersecting !== false; }, { threshold: 0 }) : null; visibilityObserver?.observe(container);
    const animate = now => {
      if (state.destroyed) return;
      if (!container.isConnected) { state.destroy(); return; }
      requestAnimationFrame(animate);
      if (!state.active || document.hidden || container.closest('.ga-guide')?.hidden) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - (state.lastNow || now)) / 1000)); state.lastNow = now; state.t += dt;
      const guide = container.closest('.ga-guide'); const speaking = Boolean(window.speechSynthesis?.speaking); const celebrating = Boolean(guide?.classList.contains('celebrate')); const motion = reducedMotion ? 0 : 1;
      teacher.root.position.y = -1.18 + Math.sin(state.t * 1.5) * 0.055 * motion; teacher.root.rotation.y = Math.sin(state.t * 0.65) * 0.045 * motion; teacher.head.rotation.y = Math.sin(state.t * 1.1) * 0.055 * motion;
      teacher.armR.rotation.z = 0.22 + (celebrating ? -0.95 : 0) + Math.sin(state.t * 3.2) * 0.08 * motion; teacher.armL.rotation.z = -0.22 + (celebrating ? 0.55 : 0) + Math.sin(state.t * 2.5 + 1) * 0.04 * motion; teacher.book.rotation.y = Math.sin(state.t * 1.8) * 0.08 * motion;
      teacher.mouth.scale.y = 0.34 + (speaking ? 0.32 + Math.abs(Math.sin(state.t * 13)) * 0.5 : 0); teacher.mouth.scale.x = 1.35 + (speaking ? Math.abs(Math.sin(state.t * 9)) * 0.35 : 0); renderer.render(scene, camera);
    };
    state.destroy = () => { if (state.destroyed) return; state.destroyed = true; resizeObserver?.disconnect(); visibilityObserver?.disconnect(); disposeObject(scene); renderer.dispose(); renderer.forceContextLoss?.(); mounts.delete(container); };
    requestAnimationFrame(animate);
    return state;
  }
  let scanQueued = false;
  function scan() { if (scanQueued) return; scanQueued = true; requestAnimationFrame(() => { scanQueued = false; document.querySelectorAll('.ga-character').forEach(init); }); }
  window.Gurukulam3DTeacher = { init, scan }; scan(); new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
