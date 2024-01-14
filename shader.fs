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

uniform vec3 uLightPosition3;
uniform float uLightAmbient3;
uniform float uShininess3;
uniform vec4 uLightColor3;

uniform vec3 uLightPosition4;
uniform float uLightAmbient4;
uniform float uShininess4;
uniform vec4 uLightColor4;

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

    vec3 L3 = normalize(uLightPosition3 - vPosition);

    vec3 L4 = normalize(uLightPosition4 - vPosition);

    vec3 V = normalize(uCameraPosition - vPosition);

    vec3 R = reflect(-L, N);
    vec3 R2 = reflect(-L2, N);
    vec3 R3 = reflect(-L3, N);
    vec3 R4 = reflect(-L4, N);

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
    float distance3 = length(uLightPosition3 - vPosition);
    float distance4 = length(uLightPosition4 - vPosition);

    float attenuation1 = 1.0 / (1.0 + 0.5 * distance1 * distance1);
    float attenuation2 = 1.0 / (1.0 + 0.5 * distance2 * distance2);
    float attenuation3 = 1.0 / (1.0 + 5.0 * distance3 * distance3);
    float attenuation4 = 1.0 / (1.0 + 5.0 * distance4 * distance4);

    float lambert = max(dot(N, L), 0.0) * attenuation1;



    float lambert2 =  max(dot(N, L2), 0.0) * attenuation2;

    float lambert3 =  max(dot(N, L3), 0.0) * attenuation3;
 
    float lambert4 =  max(dot(N, L4), 0.0) * attenuation4;



    float phong = pow(max(dot(V, R), 0.0), uShininess) * attenuation1;
    float phong2 = pow(max(dot(V, R2), 0.0), uShininess2) * attenuation2;

    float phong3 = pow(max(dot(V, R3), 0.0), uShininess3) * attenuation3;
    float phong4 = pow(max(dot(V, R4), 0.0), uShininess4) * attenuation4;

    vec4 Lcolor = uLightColor;
    vec4 Lcolor2 = uLightColor2;
    vec4 Lcolor3 = uLightColor3;
    vec4 Lcolor4 = uLightColor4;

    vec4 baseColor = texture(uBaseTexture, vTexCoord);
    
    vec4 lambertFactor = vec4(vec3(lambert), 1) * vec4(Lcolor);
    vec4 lambertFactor2 = vec4(vec3(lambert2), 1) * vec4(Lcolor2);
    vec4 lambertFactor3 = vec4(vec3(lambert3), 1) * vec4(Lcolor3);
    vec4 lambertFactor4 = vec4(vec3(lambert4), 1) * vec4(Lcolor4);

    vec4 lambertCombined = (lambertFactor + lambertFactor2 + lambertFactor3 + lambertFactor4) * vec4(OcclusionTexture,0);

    vec4 ambientFactor = vec4(vec3(uLightAmbient), 0);
    vec4 ambientFactor2 = vec4(vec3(uLightAmbient2), 0);

    vec4 ambientFactorComb = ambientFactor + ambientFactor2;

    vec4 phongFactor = vec4(vec3(phong), 0) * Lcolor;
    vec4 phongFactor2 = vec4(vec3(phong2), 0) * Lcolor2;
     vec4 phongFactor3 = vec4(vec3(phong3), 0) * Lcolor3;
     vec4 phongFactor4 = vec4(vec3(phong4), 0) * Lcolor4;

    vec4 phongCombined = (phongFactor + phongFactor2 + phongFactor3 + phongFactor4) * 0.1;

    oColor = ((uBaseFactor * (baseColor) * (lambertCombined + ambientFactorComb) + phongCombined)+ vec4(EmmisionTexture, 1));
}
