import THREE from 'three'

import {PassThru} from './pass_thru.js'

const VERTEX_SHADER = `
void main()	{
  gl_Position = vec4( position, 1.0 );
}
`;

const FRAGMENT_SHADER = `
uniform vec2 resolution;
uniform vec2 halfDelta;

uniform sampler2D texture;

uniform float stepno;
uniform float offset;
uniform float stage;

void main()	{
  vec2 elem2d = floor(gl_FragCoord.xy);
  float elem1d = elem2d.x + elem2d.y * resolution.x;

  // 上と下のどちらのテクセルと比較するのか？
  float csign = (mod(elem1d, stage) < offset) ? 1.0 : -1.0;

  // ソートの向き
  float cdir  = (mod(floor(elem1d / stepno), 2.0) <= 0.5) ? 1.0 : -1.0;

  vec4 val0 = texture2D(texture, elem2d / resolution + halfDelta);

  float adr1d = csign * offset + elem1d;
  vec2 adr2d = vec2(mod(adr1d, resolution.x), floor(adr1d / resolution.x));

  vec4 val1 = texture2D(texture, adr2d / resolution + halfDelta);

  // y 成分をソートのキーとして使用
  vec4 cmin = (val0.z < val1.z) ? val0: val1; // 小さいほう
  vec4 cmax = (val0.z < val1.z) ? val1: val0; // 大きいほう

  // ソートの向きとデータサンプルの向きを比較して、どちらの値を採用するか決める
  vec4 dst = (csign == cdir) ? cmax : cmin;

  gl_FragColor = dst;
}
`;

export class BitonicSort {
  /**
   * @param {Number} cnt
   * @return {[Number, Number, Number]}
   */
  static generateSortParameter(cnt) {
    let step = cnt;
    let rank;
    for(rank = 0; rank < step; rank++) {
      step -= rank + 1;
    }

    let stepno = (1 << (rank + 1));
    let offset = (1 << (rank - step));
    let stage = 2 * offset;
    return [stepno, offset, stage];
  }

  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {Number} radix
   */
  constructor(renderer, radix = 512) {
    this.renderer = renderer;

    this.passThuru = new PassThru(this.renderer);

    this.radix = radix;
    this.resolution = new THREE.Vector2(this.radix, this.radix);

    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();

    this.bitonicSortShader = new THREE.ShaderMaterial({
      uniforms: {
        resolution: {type: "v2", value: this.resolution},
        halfDelta: {type: "v2", value: new THREE.Vector2(0.5 / this.resolution.x, 0.5 / this.resolution.y)},
        stepno: {type: "f", value: null},
        offset: {type: "f", value: null},
        stage: {type: "f", value: null},
        texture: {type: "t", value: null}
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.bitonicSortShader);
    this.scene.add(this.mesh);

    this.rtDataRef = new THREE.WebGLRenderTarget(this.radix, this.radix, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false,
      depthBuffer: false
    });
    this.rtDataRef.texture.generateMipmaps = false;
    this.rtDataOut = this.rtDataRef.clone();

    this.dataTexture = new THREE.DataTexture(new Float32Array(this.radix * this.radix * 4), this.radix, this.radix, THREE.RGBAFormat, THREE.FloatType);
  }

  /**
   * @param {Array} src
   */
  writeDataTexture(src) {
    let buffer = this.dataTexture.image.data;

    for (let i = 0, length = buffer.length; i < length; i++) {
      buffer[i] = src[i] || 0.0;
    }

    this.dataTexture.needsUpdate = true;
    this.passThuru.render(this.dataTexture, this.rtDataRef);
  }

  /**
   * @param {Number} stepno
   * @param {Number} offset
   * @param {Number} stage
   */
  render(stepno, offset, stage) {
    this.mesh.material.uniforms.texture.value = this.rtDataRef;
    this.mesh.material.uniforms.stepno.value = stepno;
    this.mesh.material.uniforms.offset.value = offset;
    this.mesh.material.uniforms.stage.value = stage;
    this.renderer.render(this.scene, this.camera, this.rtDataOut);
    [this.rtDataOut, this.rtDataRef] = [this.rtDataRef, this.rtDataOut];
  }

  exec() {
    for(let cnt = 0; true; cnt++) {
      let [stepno, offset, stage] = BitonicSort.generateSortParameter(cnt);

      if(stepno > this.radix * this.radix) {
        break;
      }

      this.render(stepno, offset, stage);
    }

    return this.rtDataRef;
  }

  /**
   * @return {Generator}
   */
  generator() {
    function * generator() {
      for(let cnt = 0; true; cnt++) {
        let [stepno, offset, stage] = BitonicSort.generateSortParameter(cnt);
      
        if(stepno > this.radix * this.radix) {
          break;
        }
      
        this.render(stepno, offset, stage);
        yield this.rtDataRef;
      }
    }

    return generator.apply(this);
  }
}
