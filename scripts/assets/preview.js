import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { pittsburgh1892 } from '../../src/data/worlds/pittsburgh-1892';

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('canvas'),
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e5e1d6');
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
const hemispheric = new THREE.HemisphereLight('#e6e8da', '#847157', 2.3);
scene.add(hemispheric);
const key = new THREE.DirectionalLight('#ffe5b5', 3.1);
key.position.set(-15, 30, 18);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {
  left: -30,
  right: 30,
  top: 30,
  bottom: -30,
  near: 1,
  far: 80,
});
key.shadow.normalBias = 0.045;
key.shadow.bias = -0.0001;
scene.add(key);
const fill = new THREE.DirectionalLight('#cfdbdc', 0.7);
fill.position.set(12, 14, -15);
scene.add(fill);
const cameras = {
  overview: pittsburgh1892.scene.overviewCamera,
  ...Object.fromEntries(pittsburgh1892.pois.map((poi) => [poi.id, poi.camera])),
};
function setCamera(name) {
  const { position, target } = cameras[name];
  camera.position.fromArray(position);
  controls.target.fromArray(target);
  camera.lookAt(controls.target);
  controls.update();
}
setCamera('overview');
document
  .querySelector('select')
  .addEventListener('change', (event) => setCamera(event.target.value));
const gltf = await new GLTFLoader().loadAsync('/models/pittsburgh-1892.glb');
gltf.scene.traverse((node) => {
  if (node.isMesh) {
    node.castShadow = node.material.name !== 'water';
    node.receiveShadow = true;
  }
});
scene.add(gltf.scene);
window.assetReview = { renderer, scene, camera, setCamera, gltf, ready: true };
const metrics = await (
  await fetch('/models/pittsburgh-1892.metrics.json')
).json();
document.querySelector('footer').textContent =
  `${metrics.triangles.toLocaleString()} triangles · ${metrics.materialBatches} material batches · ${(metrics.bytes / 1024 / 1024).toFixed(2)} MiB · No textures or external resources · Drag to orbit`;
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
