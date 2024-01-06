#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform sampler2D uBaseTexture;
uniform sampler2D uNormalTexture;
uniform sampler2D uEmissionTexture;
uniform sampler2D uRoughnessTexture;
uniform sampler2D uMetalnessTexture;

uniform vec4 uBaseFactor;
uniform vec3 uLightPosition;
uniform float uLightAmbient;
uniform float uShininess;
uniform vec4 uLightColor;

uniform vec3 uLightPosition2;
uniform float uLightAmbient2;
uniform float uShininess2;
uniform vec4 uLightColor2;

uniform vec3 uCameraPosition;

in vec3 vPosition;
in vec2 vTexCoord;
in vec3 vNormal;
in vec3 vTangent;

out vec4 oColor;

void main() {

    vec3 N = normalize(vNormal);

    vec3 L = normalize(uLightPosition - vPosition);
    vec3 L2 = normalize(uLightPosition2 - vPosition);

    vec3 V = normalize(uCameraPosition - vPosition);
    vec3 R = reflect(-L, N);
    vec3 R2 = reflect(-L2, N);

    vec3 T = normalize(vTangent);
    vec3 B = normalize(cross(N, T));

    mat3 Matrika = mat3(N,T,B);
    
    vec3 NormalTexture = vec3(texture(uNormalTexture, vTexCoord).xyz);

    vec3 normal = normalize(NormalTexture * 2.0 - 1.0);

    vec3 EmmisionTexture = vec3(texture(uEmissionTexture, vTexCoord).xyz);

    vec3 OcclusionTexture = vec3(texture(uMetalnessTexture, vTexCoord).xyz);

    vec3 NT = normalize(normal);
    N = normalize(NT);

 
    float distance1 = length(uLightPosition - vPosition);
    float distance2 = length(uLightPosition2 - vPosition);

    float attenuation1 = 1.0 / (1.0 + 0.5 * distance1 * distance1);
    float attenuation2 = 1.0 / (1.0 + 0.5 * distance2 * distance2);

    float lambert = max(dot(N, L), 0.0) * attenuation1;



    float lambert2 =  max(dot(N, L2), 0.0) * attenuation2;
 



    float phong = pow(max(dot(V, R), 0.0), uShininess) * attenuation1;
    float phong2 = pow(max(dot(V, R2), 0.0), uShininess2) * attenuation2;

    vec4 Lcolor = uLightColor;
    vec4 Lcolor2 = uLightColor2;

    vec4 baseColor = texture(uBaseTexture, vTexCoord);
    
    vec4 lambertFactor = vec4(vec3(lambert), 1) * vec4(Lcolor);
    vec4 lambertFactor2 = vec4(vec3(lambert2), 1) * vec4(Lcolor2);

    vec4 lambertCombined = (lambertFactor + lambertFactor2) * vec4(OcclusionTexture,0);

    vec4 ambientFactor = vec4(vec3(uLightAmbient), 0);
    vec4 ambientFactor2 = vec4(vec3(uLightAmbient2), 0);

    vec4 ambientFactorComb = ambientFactor + ambientFactor2;

    vec4 phongFactor = vec4(vec3(phong), 0) * Lcolor;
    vec4 phongFactor2 = vec4(vec3(phong2), 0) * Lcolor2;

    vec4 phongCombined = (phongFactor + phongFactor2) * 0.1;

    oColor = ((uBaseFactor * (baseColor) * (lambertCombined + ambientFactorComb) + phongCombined)+ vec4(EmmisionTexture, 1));
}
