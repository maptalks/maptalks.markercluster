attribute vec2 aPosition;
attribute vec2 aTexCoord;
attribute float aOpacity;

uniform vec2 resolution;
uniform vec2 dxDy;

varying vec2 vTexCoord;
varying float vOpacity;

void main() {
    vTexCoord = aTexCoord;
    vOpacity = aOpacity;
    vec2 position = (aPosition + dxDy) / resolution * 2.0 - 1.0;
    gl_Position = vec4(position, 0.0, 1.0);
}
