struct FragmentInput {
  @location($i) vTexCoord: vec2f,
  @location($i) vOpacity: f32,
};

struct MyAppUniforms {
  layerOpacity: f32,
};

@group(0) @binding($b) var<uniform> uniforms: MyAppUniforms;
@group(0) @binding($b) var sourceTexture: texture_2d<f32>;
@group(0) @binding($b) var sourceTextureSampler: sampler;

@fragment
fn main(fragmentInput: FragmentInput) -> @location(0) vec4f {
  let color = textureSample(sourceTexture, sourceTextureSampler, fragmentInput.vTexCoord);
  return color * fragmentInput.vOpacity * uniforms.layerOpacity;
    // return vec4f(1.0, 0.0, 0.0, 1.0);
}
