import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = { name?: string | null; subject?: string; speaking?: boolean; listening?: boolean; onAsk?: () => void };

function makeMaterial(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
}

export function TeacherCompanion({ name, subject, speaking = false, listening = false, onAsk }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const speakingRef = useRef(speaking);
  const listeningRef = useRef(listening);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { listeningRef.current = listening; }, [listening]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      mount.dataset.webglFallback = 'true';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0, 0);
    renderer.setSize(Math.max(mount.clientWidth, 180), Math.max(mount.clientHeight, 190), false);
    renderer.domElement.setAttribute('aria-label', 'Animated 3D teacher companion');
    renderer.domElement.className = 'teacher-companion-canvas';
    mount.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(25, 1, .1, 30);
    camera.position.set(0, 1.15, 5.8);
    camera.lookAt(0, .45, 0);
    scene.add(new THREE.HemisphereLight(0xfff6df, 0x35554c, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 5, 5);
    scene.add(key);

    const root = new THREE.Group();
    root.position.y = -1.2;
    scene.add(root);
    const skin = makeMaterial(0xf0b08a);
    const hair = makeMaterial(0x241b1c);
    const clothing = makeMaterial(0x2d7665);
    const scarf = makeMaterial(0xe995b0);
    const dark = makeMaterial(0x172d2a);
    const mouthMaterial = makeMaterial(0x7f3040);
    const body = new THREE.Group();
    body.position.y = 1;
    root.add(body);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(.56, .72, 1.15, 20), scarf);
    skirt.position.y = -.25;
    body.add(skirt);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.55, .82, 5, 16), clothing);
    torso.scale.set(.92, 1, .7);
    torso.position.y = .62;
    body.add(torso);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.19, .22, .34, 16), skin);
    neck.position.y = 1.45;
    body.add(neck);
    const head = new THREE.Group();
    head.position.y = 1.9;
    body.add(head);
    const face = new THREE.Mesh(new THREE.SphereGeometry(.62, 20, 15), skin);
    face.scale.set(.92, 1.05, .88);
    head.add(face);
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(.66, 20, 14, 0, Math.PI * 2, 0, Math.PI * .62), hair);
    hairCap.position.y = .2;
    head.add(hairCap);
    const eyeGeometry = new THREE.SphereGeometry(.085, 10, 8);
    const eyeLeft = new THREE.Mesh(eyeGeometry, dark);
    const eyeRight = new THREE.Mesh(eyeGeometry, dark);
    eyeLeft.position.set(-.22, .05, .54);
    eyeRight.position.set(.22, .05, .54);
    head.add(eyeLeft, eyeRight);
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(.12, 14, 8), mouthMaterial);
    mouth.scale.set(1.35, .34, .42);
    mouth.position.set(0, -.24, .57);
    head.add(mouth);
    const armLeft = new THREE.Group();
    const armRight = new THREE.Group();
    armLeft.position.set(-.53, .94, 0);
    armRight.position.set(.53, .94, 0);
    armLeft.rotation.z = -.22;
    armRight.rotation.z = .22;
    body.add(armLeft, armRight);
    const armGeometry = new THREE.CapsuleGeometry(.13, .7, 5, 10);
    const armMeshLeft = new THREE.Mesh(armGeometry, clothing);
    const armMeshRight = new THREE.Mesh(armGeometry, clothing);
    armMeshLeft.position.y = -.38;
    armMeshRight.position.y = -.38;
    armLeft.add(armMeshLeft);
    armRight.add(armMeshRight);
    const handGeometry = new THREE.SphereGeometry(.17, 12, 8);
    const handLeft = new THREE.Mesh(handGeometry, skin);
    const handRight = new THREE.Mesh(handGeometry, skin);
    handLeft.position.y = -.82;
    handRight.position.y = -.82;
    armLeft.add(handLeft);
    armRight.add(handRight);
    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .72, 5, 10), dark);
    legs.position.y = -1.08;
    root.add(legs);
    const book = new THREE.Mesh(new THREE.BoxGeometry(.5, .12, .38), makeMaterial(0x5b66c9));
    book.position.set(.48, .32, .55);
    body.add(book);

    let frame = 0;
    let last = 0;
    let destroyed = false;
    const resize = () => {
      if (destroyed) return;
      const width = Math.max(160, mount.clientWidth || 210);
      const height = Math.max(160, mount.clientHeight || 220);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : undefined;
    observer?.observe(mount);
    resize();
    const animate = (now: number) => {
      if (destroyed) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.min(.05, Math.max(.001, (now - (last || now)) / 1000));
      last = now;
      const time = now / 1000;
      const motion = reducedMotion ? 0 : 1;
      root.position.y = -1.2 + Math.sin(time * 1.5) * .055 * motion;
      root.rotation.y = Math.sin(time * .65) * .045 * motion;
      head.rotation.y = Math.sin(time * 1.1) * .055 * motion;
      armRight.rotation.z = .22 + (listeningRef.current ? -.18 : 0) + Math.sin(time * 3.2) * .08 * motion;
      armLeft.rotation.z = -.22 + Math.sin(time * 2.5 + 1) * .04 * motion;
      book.rotation.y = Math.sin(time * 1.8) * .08 * motion;
      mouth.scale.y = .34 + (speakingRef.current ? .32 + Math.abs(Math.sin(time * 13)) * .5 : 0);
      mouth.scale.x = 1.35 + (speakingRef.current ? Math.abs(Math.sin(time * 9)) * .35 : 0);
      renderer.render(scene, camera);
      void dt;
    };
    frame = requestAnimationFrame(animate);
    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
        else object.material.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss?.();
      mount.replaceChildren();
    };
  }, []);

  const state = listening ? 'Listening' : speaking ? 'Speaking' : 'Ready to help';
  return <aside className="teacher-companion" aria-label={`${name || 'Your teacher'} companion`}>
    <div className="teacher-companion-scene" ref={mountRef}>
      <div className="teacher-companion-fallback" aria-hidden="true">👩🏽‍🏫</div>
    </div>
    <div className="teacher-companion-copy">
      <span className="teacher-companion-status">{state}</span>
      <strong>{name || 'Your teacher'}</strong>
      <small>{subject ? `Here for ${subject}` : 'Ready for your next adventure'}</small>
      {onAsk && <button type="button" onClick={onAsk}>Ask me <span>→</span></button>}
    </div>
  </aside>;
}
