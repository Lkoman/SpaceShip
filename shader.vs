#version 300 es

layout (location = 0) in vec4 aPosition;
layout (location = 1) in vec2 aTexCoord;
layout (location = 2) in vec3 aNormal;
layout (location = 3) in vec3 aTangent;


uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

out vec2 vTexCoord;
out vec3 vNormal;
out vec3 vPosition;

out vec3 vTangent;
uniform float uTime;


void main() {

    vPosition = (uModelMatrix * aPosition).xyz;
    
    vTexCoord = aTexCoord;
    vNormal = uNormalMatrix * aNormal;
    vTangent = aTangent;

    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
}
