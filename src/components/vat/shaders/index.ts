import vat from './vat.glsl'

export const VAT_VERTEX_SHADER = /* glsl */`
varying vec2 vUv;

${vat}

void main() {
  vec3 vatPos = VAT_pos(uFrame);
  vec3 basePos = position;

  vec3 position = (uStoreDelta == 1) ? (basePos + vatPos) : vatPos;

  csm_Position = position;
  csm_Normal = VAT_nrm(uFrame);
  vUv = uv;
  vUv2 = uv2;
  vColor = color.rgb;
}
`

export const VAT_FRAGMENT_SHADER = /* glsl */`
void main() {
  // Material handles all color/rendering
}
`
