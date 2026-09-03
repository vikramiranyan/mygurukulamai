(() => {
  'use strict';

  const THREE = window.THREE;
  if (!THREE) return;

  const mounts = new WeakMap();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  function mat(color, roughness = 0.72, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  function roundedBox(width, height, depth, radius, material) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 3, bevelSize: radius * 0.18, bevelThickness: radius * 0.18 });
    geo.center();
    return new THREE.Mesh(geo, material);
  }

  function createTeacher(scene) {
    const root = new THREE.Group();
    root.position.y = -1.18;
    scene.add(root);

    const skin = mat(0xc9825f);
    const skinLight = mat(0xf0b08a);
    const hair = mat(0x241b1c, 0.9);
    const blouse = mat(0x2d7665);
    const sari = mat(0xe995b0);
    const gold = mat(0xd6a72c, 0.42, 0.35);
    const dark = mat(0x172d2a);
    const shoe = mat(0x253f3a);

    const hips = new THREE.Group();
    hips.position.y = 1.0;
    root.add(hips);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.72, 1.15, 32), sari);
    lower.position.y = -0.25;
    hips.add(lower);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.82, 8, 24), blouse);
    torso.scale.set(0.92, 1.0, 0.7);
    torso.position.y = 0.62;
    hips.add(torso);

    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.55, 0.08), sari);
    sash.position.set(0.39, 0.55, 0.48);
    sash.rotation.z = -0.18;
    hips.add(sash);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.34, 24), skinLight);
    neck.position.y = 1.45;
    hips.add(neck);

    const head = new THREE.Group();
    head.position.y = 1.9;
    hips.add(head);

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), skinLight);
    face.scale.set(0.92, 1.05, 0.88);
    head.add(face);

    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.66, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), hair);
    hairCap.position.y = 0.2;
    hairCap.rotation.x = -0.08;
    head.add(hairCap);

    const braid = new THREE.Group();
    braid.position.set(-0.46, 0.02, -0.03);
    braid.rotation.z = 0.06;
    head.add(braid);
    for (let i = 0; i < 7; i += 1) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.16 - i * 0.012, 18, 14), hair);
      bead.position.set(0, -i * 0.16, 0.02 + i * 0.008);
      braid.add(bead);
    }

    const eyeGeo = new THREE.SphereGeometry(0.085, 16, 12);
    const eyeL = new THREE.Mesh(eyeGeo, dark);
    const eyeR = new THREE.Mesh(eyeGeo, dark);
    eyeL.position.set(-0.22, 0.05, 0.54);
    eyeR.position.set(0.22, 0.05, 0.54);
    head.add(eyeL, eyeR);

    const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), mat(0x9d2945));
    bindi.position.set(0, 0.29, 0.58);
    head.add(bindi);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.17, 16), skin);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.02, 0.58);
    head.add(nose);

    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 12), mat(0x7f3040));
    mouth.scale.set(1.35, 0.34, 0.42);
    mouth.position.set(0, -0.24, 0.57);
    head.add(mouth);

    const earringL = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 8, 18), gold);
    const earringR = earringL.clone();
    earringL.position.set(-0.61, -0.02, 0.16);
    earringR.position.set(0.61, -0.02, 0.16);
    head.add(earringL, earringR);

    const armL = new THREE.Group();
    const armR = new THREE.Group();
    armL.position.set(-0.53, 0.94, 0);
    armR.position.set(0.53, 0.94, 0);
    armL.rotation.z = -0.22;
    armR.rotation.z = 0.22;
    hips.add(armL, armR);

    const armGeo = new THREE.CapsuleGeometry(0.13, 0.7, 6, 14);
    const armMeshL = new THREE.Mesh(armGeo, blouse);
    const armMeshR = new THREE.Mesh(armGeo, blouse);
    armMeshL.position.y = -0.38;
    armMeshR.position.y = -0.38;
    armL.add(armMeshL);
    armR.add(armMeshR);

    const handGeo = new THREE.SphereGeometry(0.17, 18, 14);
    const handL = new THREE.Mesh(handGeo, skinLight);
    const handR = new THREE.Mesh(handGeo, skinLight);
    handL.position.y = -0.82;
    handR.position.y = -0.82;
    armL.add(handL);
    armR.add(handR);

    const legGeo = new THREE.CapsuleGeometry(0.16, 0.72, 6, 14);
    const legL = new THREE.Mesh(legGeo, dark);
    const legR = new THREE.Mesh(legGeo, dark);
    legL.position.set(-0.2, -1.08, 0);
    legR.position.set(0.2, -1.08, 0);
    root.add(legL, legR);
    const shoeL = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), shoe);
    const shoeR = shoeL.clone();
    shoeL.scale.set(1.35, 0.55, 1.7);
    shoeR.scale.copy(shoeL.scale);
    shoeL.position.set(-0.2, -1.56, 0.13);
    shoeR.position.set(0.2, -1.56, 0.13);
    root.add(shoeL, shoeR);

    const book = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.38), mat(0x5b66c9));
    book.position.set(0.48, 0.32, 0.55);
    book.rotation.z = -0.15;
    hips.add(book);

    return { root, head, mouth, armL, armR, book };
  }

  function init(container) {
    if (mounts.has(container)) return mounts.get(container);
    if (!container || !window.WebGLRenderingContext) return null;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(container.clientWidth || 174, container.clientHeight || 206, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'ga-3d-canvas';
    renderer.domElement.setAttribute('aria-label', 'Animated 3D teacher');
    container.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, (container.clientWidth || 174) / (container.clientHeight || 206), 0.1, 50);
    camera.position.set(0, 1.15, 6.2);
    camera.lookAt(0, 0.65, 0);

    scene.add(new THREE.HemisphereLight(0xfff6df, 0x35554c, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 5, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0xd8b5ff, 1.6, 8);
    rim.position.set(-3, 2, 2);
    scene.add(rim);

    const teacher = createTeacher(scene);
    const state = { speaking: false, celebrating: false, destroyed: false, t: 0 };
    mounts.set(container, state);

    const resize = () => {
      if (state.destroyed) return;
      const width = Math.max(120, container.clientWidth || 174);
      const height = Math.max(150, container.clientHeight || 206);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const animate = () => {
      if (state.destroyed) return;
      requestAnimationFrame(animate);
      state.t += 0.016;
      const motion = reducedMotion ? 0 : 1;
      const talk = state.speaking ? 1 : 0;
      teacher.root.position.y = -1.18 + Math.sin(state.t * 1.5) * 0.055 * motion;
      teacher.root.rotation.y = Math.sin(state.t * 0.65) * 0.045 * motion;
      teacher.head.rotation.y = Math.sin(state.t * 1.1) * 0.055 * motion;
      teacher.armR.rotation.z = 0.22 + (state.celebrating ? -0.95 : 0) + Math.sin(state.t * 3.2) * 0.08 * motion;
      teacher.armL.rotation.z = -0.22 + (state.celebrating ? 0.55 : 0) + Math.sin(state.t * 2.5 + 1) * 0.04 * motion;
      teacher.book.rotation.y = Math.sin(state.t * 1.8) * 0.08 * motion;
      teacher.mouth.scale.y = 0.34 + (talk ? 0.32 + Math.abs(Math.sin(state.t * 13)) * 0.5 : 0);
      teacher.mouth.scale.x = 1.35 + (talk ? Math.abs(Math.sin(state.t * 9)) * 0.35 : 0);
      renderer.render(scene, camera);
    };
    animate();

    state.setSpeaking = (value) => { state.speaking = Boolean(value); };
    state.celebrate = () => {
      state.celebrating = true;
      window.setTimeout(() => { state.celebrating = false; }, 900);
    };
    state.destroy = () => {
      state.destroyed = true;
      observer.disconnect();
      renderer.dispose();
      mounts.delete(container);
    };
    return state;
  }

  function scan() {
    document.querySelectorAll('.ga-character').forEach(init);
  }

  window.Gurukulam3DTeacher = { init, scan };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, { once: true });
  else scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
