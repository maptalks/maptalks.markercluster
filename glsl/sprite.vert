attribute vec2 aPosition;
attribute vec2 aTexCoord;
attribute float aOpacity;

uniform vec2 resolution;

varying vec2 vTexCoord;
varying float vOpacity;

void main() {
    vTexCoord = aTexCoord;
    vOpacity = aOpacity / 255.0;
    vec2 position = aPosition / resolution * 2.0 - 1.0;
    gl_Position = vec4(position, 0.0, 1.0);
}
