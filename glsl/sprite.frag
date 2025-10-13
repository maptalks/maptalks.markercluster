precision mediump float;

uniform sampler2D sourceTexture;
uniform float layerOpacity;

varying vec2 vTexCoord;
varying float vOpacity;

void main() {
    vec4 color = texture2D(sourceTexture, vTexCoord);
    gl_FragColor = color * vOpacity * layerOpacity;
    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
