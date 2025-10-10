precision mediump float;

uniform sampler2D spriteTexture;
uniform float layerOpacity;

varying vec2 vTexCoord;
varying float vOpacity;

void main() {
    vec4 color = texture2D(spriteTexture, vTexCoord);
    gl_FragColor = color * vOpacity * layerOpacity;
}
