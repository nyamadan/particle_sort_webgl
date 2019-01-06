import THREE from 'three'
import {BitonicSort} from './bitonic_sort_webgl.js'
import {Transform} from './transform.js'

const VERTEX_SHADER_PARTICLE = `
uniform sampler2D txPosition;

void main() {
  gl_PointSize = PARTICLE_SIZE;
  gl_Position = texture2D( txPosition, uv );
}
`;

const FRAGMENT_SHADER_PARTICLE = `
uniform sampler2D txParticle;

void main() {
  vec4 color = texture2D( txParticle, gl_PointCoord);
  gl_FragColor = color;
}
`;

export class ParticleRenderer {
  constructor(renderer) {
    this.radix = 512;
    this.radix2 = this.radix * this.radix;
    
    this.particleSize = 10;
    
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.autoUpdate = false;
    
    this.projScreenMatrix = new THREE.Matrix4();
    this.transformMatrix = new THREE.Matrix4();
    
    this.camera = new THREE.PerspectiveCamera();
    this.camera.position.set(0.0, 0.0, 25.0);
    this.adjustCamera();

    this.controls = new THREE.OrbitControls(this.camera,this.renderer.domElement);

    this.geometry = this._createParticleGeometry();

    this.material = this._createParticleRenderMaterial();
    this.uniforms = this.material.uniforms;

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.dtPosition = this._createRandomPositionDataTexture();
    this.transfom = new Transform(this.renderer);
    this.bitonicSort = new BitonicSort(this.renderer, this.radix);
  }

  adjustCamera() {
    this.camera.fov = 60.0;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.near = 0.5;
    this.camera.far = 100.0;
    this.camera.updateProjectionMatrix();
  }

  _createParticleRenderMaterial() {
    let loader = new THREE.TextureLoader();
    let texture = loader.load('./particle.png', () => {
      texture.flipY = false;
    });

    return new THREE.ShaderMaterial( {
      defines: {
        PARTICLE_SIZE: this.particleSize.toFixed(3)
      },
      uniforms: {
        txPosition: { type: 't', value: null },
        txParticle: { type: 't', value: texture }
      },
      vertexShader: VERTEX_SHADER_PARTICLE,
      fragmentShader: FRAGMENT_SHADER_PARTICLE,
      transparent: true
    });
  }

  _createRandomPositionDataTexture() {
    let texture = new THREE.DataTexture(
      this._createRandomValue(),
      this.radix,
      this.radix,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;
    return texture;
  }

  _createRandomValue() {
    let scale = new THREE.Vector3(10.0, 10.0, 10.0);
    let offset = new THREE.Vector3(-5.0, -5.0, -5.0);
    let length = this.radix2;

    let buffer = new Float32Array(length * 4);
    
    for(let i = 0; i < length; i++) {
      let i4 = 4 * i;
      buffer[i4    ] = Math.random() * scale.x + offset.x;
      buffer[i4 + 1] = Math.random() * scale.y + offset.y;
      buffer[i4 + 2] = Math.random() * scale.z + offset.z;
      buffer[i4 + 3] = 1.0;
    }
    
    return buffer;
  }
  
  _createParticleGeometry() {
    let geometry = new THREE.BufferGeometry();
    let length = this.radix2;
    
    let vertices = new THREE.BufferAttribute( new Float32Array( length * 3 ), 3 );
    let uv = new THREE.BufferAttribute( new Float32Array( length * 2 ), 2 );
    geometry.addAttribute( 'position', vertices );
    geometry.addAttribute( 'uv', uv );
    
    let half_pixel_width = 0.5 / this.radix;
    
    for( let i = 0; i < length; i++ ) {
      var x = (i % this.radix) / this.radix;
      var y = ~~(i / this.radix) / this.radix;
      
      vertices.array[ i * 3     ] = 0.0;
      vertices.array[ i * 3 + 1 ] = 0.0;
      vertices.array[ i * 3 + 2 ] = 0.0;
      
      uv.array[ i * 2     ] = x + half_pixel_width;
      uv.array[ i * 2 + 1 ] = y + half_pixel_width;
    }
    
    return geometry;
  }
  
  render(zSort = true) {
    this.scene.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

    this.projScreenMatrix.multiplyMatrices( this.camera.projectionMatrix, this.camera.matrixWorldInverse );
    this.transformMatrix.multiplyMatrices( this.projScreenMatrix, this.points.matrixWorld );
    this.transfom.render(this.dtPosition, this.transformMatrix, this.bitonicSort.rtDataRef);

    if(zSort) {
      this.bitonicSort.exec();
    }

    this.uniforms.txPosition.value = this.bitonicSort.rtDataRef;

    this.renderer.render(this.scene, this.camera);
  }
}
