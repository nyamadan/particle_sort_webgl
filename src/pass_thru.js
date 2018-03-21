import THREE from 'three.js'

const VERTEX_SHADER = `
void main()	{
  gl_Position = vec4( position, 1.0 );
}
`;

const FRAGMENT_SHADER = `
uniform vec2 resolution;
uniform sampler2D texture;

void main()	{
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 color = texture2D( texture, uv ).xyz;

  gl_FragColor = vec4( color, 1.0 );
}
`;

export class PassThru {
  constructor(renderer) {
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();

    this.passThruShader = new THREE.ShaderMaterial({
      uniforms: {
        resolution: {type: "v2", value: null},
        texture: {type: "t", value: null}
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.passThruShader);
    this.scene.add(this.mesh);
  }

  /**
   * @param {THREE.WebGLRenderTarget} input
   * @param {THREE.WebGLRenderTarget} output
   */
  render(input, output = null) {
    this.mesh.material = this.passThruShader;
    this.mesh.material.uniforms.texture.value = input;
    if(output != null) {
      this.mesh.material.uniforms.resolution.value = new THREE.Vector2(output.width, output.height);
      this.renderer.render(this.scene, this.camera, output);
    } else {
      this.mesh.material.uniforms.resolution.value = new THREE.Vector2(this.renderer.domElement.width, this.renderer.domElement.height);
      this.renderer.render(this.scene, this.camera);
    }

    return output;
  }
}
