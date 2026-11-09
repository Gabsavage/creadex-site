// 3D viewer of the Créadex: the creature's GLB (the game's rigged mesh, made by
// creatures-rumble/tools/creature_factory) on its habitat. One habitat per type
// (data/habitats.json): while a type has no habitat model, a simple stage in its colors.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = new Map();
const progressOf = new Map(); // url -> listeners of its download progress (0..1)
const loadGltf = (url, onProgress) => {
  if (onProgress) { if (!progressOf.has(url)) progressOf.set(url, new Set()); progressOf.get(url).add(onProgress); }
  if (!cache.has(url)) {
    const tell = event => {
      if (!event.lengthComputable || !event.total) return;
      progressOf.get(url)?.forEach(f => f(event.loaded / event.total));
    };
    cache.set(url, loader.loadAsync(url, tell)
      .finally(() => progressOf.delete(url))
      .catch(error => { cache.delete(url); throw error; }));
  }
  return cache.get(url);
};
const textureLoader = new THREE.TextureLoader();
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);

export function createViewer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -8;
  sun.shadow.camera.right = sun.shadow.camera.top = 8;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(-6, 5, -8);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);
  let habitat = null, creature = null, mixer = null, actions = {}, current = null;
  let baseMap = null, shinyMap = null, material = null, token = 0;
  const clock = new THREE.Clock();

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  let running = true;
  renderer.setAnimationLoop(() => {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    mixer?.update(dt);
    controls.update();
    renderer.render(scene, camera);
  });

  // The placeholder habitat: a round island in the type's colors (replaced by the type's own
  // habitat model once it exists, see data/habitats.json).
  function stageHabitat(color) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.05, 0.45, 48),
      new THREE.MeshStandardMaterial({ color: mix(color, '#ffffff', 0.55), roughness: 0.9 }));
    top.position.y = -0.25;
    top.receiveShadow = true;
    const rock = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 1.8, 1.8, 10),
      new THREE.MeshStandardMaterial({ color: mix(color, '#2d3032', 0.45), roughness: 1, flatShading: true }));
    rock.position.y = -1.35;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.16, 0.1, 8, 64),
      new THREE.MeshStandardMaterial({ color: mix(color, '#ffffff', 0.15), roughness: 0.6 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.0;
    group.add(top, rock, ring);
    group.userData.placeholder = true;
    return group;
  }

  async function setHabitat(element, habitats, color) {
    if (habitat) { world.remove(habitat); habitat = null; }
    const spec = habitats?.[element];
    if (spec?.model) {
      try {
        const gltf = await loadGltf(spec.model);
        habitat = gltf.scene.clone(true);
        habitat.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = true; } });
        if (spec.scale) habitat.scale.setScalar(spec.scale);
      } catch (error) { console.warn('habitat', element, error); }
    }
    if (!habitat) habitat = stageHabitat(color);
    world.add(habitat);
  }

  function frame(height, reach = 0) {
    const h = Math.max(height, 2.5);
    const dist = Math.max(h, reach * 1.25) * 2.3 + 3.2;
    controls.target.set(0, h * 0.45, 0);
    camera.position.set(dist * 0.42, h * 0.75 + 1.4, dist);
    controls.minDistance = h * 1.2;
    controls.maxDistance = dist * 1.9;
    controls.update();
  }

  async function show({ model, shinyTexture, element, color, habitats, shiny = false, onProgress }) {
    const mine = ++token;
    if (creature) { world.remove(creature); creature = null; }
    mixer = null; actions = {}; current = null; baseMap = shinyMap = material = null;
    scene.fog = new THREE.Fog(mix(color, '#ffffff', 0.25), 30, 80);
    await setHabitat(element, habitats, color);
    frame(4); // until the model is in, never leave the camera inside the stage
    if (!model) return { actions: [] };
    const gltf = await loadGltf(model, onProgress);
    if (mine !== token) return null;
    creature = cloneSkinned(gltf.scene);
    // glTF +Z faces the camera (the factory's GLB: Blender -Y front exported to +Z)
    creature.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.material = o.material.clone();
        o.material.userData.baseMap = o.material.map; // each piece keeps its own (jellop: body, bell, heart)
        if (o.material.transparent) o.material.depthWrite = false; // jellop's bell (alpha blend)
        material = material || o.material;
      }
    });
    baseMap = material?.map || null;
    world.add(creature);
    const box = new THREE.Box3().setFromObject(creature);
    const reach = Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z);
    if (habitat?.userData.placeholder) habitat.scale.setScalar(Math.max(1, reach * 1.15 / 3.2));
    frame(box.max.y - Math.min(0, box.min.y), reach);
    mixer = new THREE.AnimationMixer(creature);
    for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
    play('Idle');
    if (shinyTexture) {
      textureLoader.loadAsync(shinyTexture).then(tex => {
        if (mine !== token) return;
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        if (baseMap) { tex.wrapS = baseMap.wrapS; tex.wrapT = baseMap.wrapT; tex.magFilter = baseMap.magFilter; tex.minFilter = baseMap.minFilter; }
        shinyMap = tex;
        setShiny(shiny);
      }).catch(() => {});
    }
    return { actions: Object.keys(actions) };
  }

  function play(name) {
    const next = actions[name];
    if (!next) return;
    const loops = name === 'Idle' || name === 'Walk';
    next.reset();
    next.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, loops ? Infinity : 1);
    next.clampWhenFinished = !loops;
    if (current && current !== next) next.crossFadeFrom(current, 0.2, false);
    next.play();
    current = next;
    if (!loops) {
      const back = event => {
        if (event.action !== next) return;
        mixer.removeEventListener('finished', back);
        if (current === next && name !== 'Faint') play('Idle');
      };
      mixer.addEventListener('finished', back);
    }
  }

  function setShiny(on) {
    // A shiny texture replaces the body's map only; without one the model keeps its own maps.
    if (!material || !shinyMap) return;
    creature?.traverse(o => {
      if (!o.isMesh || o.material.userData.baseMap !== baseMap) return;
      o.material.map = on ? shinyMap : baseMap;
      o.material.needsUpdate = true;
    });
  }

  function dispose() {
    running = false;
    observer.disconnect();
    renderer.setAnimationLoop(null);
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  resize();
  return { show, play, setShiny, dispose, hasShiny: () => !!shinyMap };
}
