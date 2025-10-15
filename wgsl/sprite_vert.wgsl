struct VertexInput {
  @location($i) aPosition: vec2f,
  @location($i) aTexCoord: vec2f,
  @location($i) aOpacity: f32,
};

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location($o) vTexCoord: vec2f,
  @location($o) vOpacity: f32,
};

struct MyAppUniforms {
  resolution: vec2f,
  dxDy: vec2f,
};

@group(0) @binding($b) var<uniform> uniforms: MyAppUniforms;

@vertex
fn main(vertexInput: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  output.vTexCoord = vertexInput.aTexCoord;
  output.vOpacity = vertexInput.aOpacity / 255.0;

  let position = (vertexInput.aPosition + uniforms.dxDy) / uniforms.resolution * 2.0 - 1.0;
  output.Position = vec4f(position, 0.0, 1.0);

  return output;
}
