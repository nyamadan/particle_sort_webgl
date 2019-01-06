import 'babel-polyfill'
import './OrbitControls'

import THREE from 'three'
import Stats from 'stats.js'

import {ParticleRenderer} from './particle_renderer.js'

let stats = new Stats();
stats.domElement.setAttribute('style', 'position: absolute; right: 0; top: 0; z-index: 2;');
document.body.appendChild(stats.domElement);

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.querySelector('#container').appendChild(renderer.domElement);

let gl = renderer.getContext();
if (!gl.getExtension("OES_texture_float")) {
  throw new Error("No OES_texture_float support for float textures!");
}

let particleRenderer = new ParticleRenderer(renderer);

let $particles = document.querySelector('#particles');
$particles.textContent = particleRenderer.radix2.toString(10);

let $sortEnable = document.querySelector('#sort-enable');
window.addEventListener('resize', function() {
  particleRenderer.adjustCamera();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function render() {
  stats.begin();
  particleRenderer.render(!!$sortEnable.checked);
  stats.end();
  
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
