import { vec3, mat3, mat4 } from './lib/gl-matrix-module.js';
import * as WebGL from './common/engine/WebGL.js';
import { BaseRenderer } from './common/engine/renderers/BaseRenderer.js';
import { getLocalModelMatrix, getGlobalViewMatrix, getProjectionMatrix, getGlobalModelMatrix, getModels } from './common/engine/core/SceneUtils.js';
import { Light } from './Light.js';

export class Renderer extends BaseRenderer {

    constructor(canvas) {
        super(canvas);
    }

    // Initialize the renderer, load shaders
    async initialize() {
        const gl = this.gl;

        // Fetch and compile vertex and fragment shaders
        const unlitVertexShader = await fetch(new URL('shader.vs', import.meta.url)).then(response => response.text());
        const unlitFragmentShader = await fetch(new URL('shader.fs', import.meta.url)).then(response => response.text());

        // Build shader programs
        this.programs = WebGL.buildPrograms(gl, {
            unlit: {
                vertex: unlitVertexShader,
                fragment: unlitFragmentShader,
            },
        });

        // Set clear color and enable necessary WebGL capabilities
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
    }

    // Render the scene
    render(scene, camera) {
        const gl = this.gl;

        // Set viewport and clear the canvas
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Use the unlit shader program
        const { program, uniforms } = this.programs.unlit;
        gl.useProgram(program);

        // Set up camera and projection matrices
        const cameraMatrix = getGlobalModelMatrix(camera);
        const cameraPosition = mat4.getTranslation(vec3.create(), cameraMatrix);
        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);

        // Pass camera and projection matrices to the shader
        gl.uniformMatrix4fv(uniforms.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, projectionMatrix);
        gl.uniform3fv(uniforms.uCameraPosition, cameraPosition);

        // Get lights from the scene and render nodes
        const lights = scene.filter(node => node.getComponentOfType(Light));
        this.renderNode(lights, scene);
    }

    // Render a node in the scene
    renderNode(lights, node, modelMatrix = mat4.create()) {
        const gl = this.gl;
        const { program, uniforms } = this.programs.unlit;

        // Calculate model matrix for the node
        const localMatrix = getLocalModelMatrix(node);
        modelMatrix = mat4.mul(mat4.create(), modelMatrix, localMatrix);
        gl.uniformMatrix4fv(uniforms.uModelMatrix, false, modelMatrix);

        // Calculate normal matrix for lighting calculations
        const normalMatrix = mat3.normalFromMat4(mat3.create(), modelMatrix);
        gl.uniformMatrix3fv(uniforms.uNormalMatrix, false, normalMatrix);

        // Set light properties and position
        const lightComponent = lights[0].getComponentOfType(Light);
        const lightMatrix = getGlobalModelMatrix(lights[0]);
        const lightPosition = mat4.getTranslation(vec3.create(), lightMatrix);
        gl.uniform3fv(uniforms.uLightPosition, lightPosition);
        gl.uniform1f(uniforms.uLightAmbient, lightComponent.ambient);
        gl.uniform1f(uniforms.uShininess, lightComponent.shininess);
        gl.uniform4fv(uniforms.uLightColor, lightComponent.color);

        // Repeat light setup for second light
        const lightComponent2 = lights[1].getComponentOfType(Light);
        const lightMatrix2 = getGlobalModelMatrix(lights[1]);
        const lightPosition2 = mat4.getTranslation(vec3.create(), lightMatrix2);
        gl.uniform3fv(uniforms.uLightPosition2, lightPosition2);
        gl.uniform1f(uniforms.uLightAmbient2, lightComponent2.ambient);
        gl.uniform1f(uniforms.uShininess2, lightComponent2.shininess);
        gl.uniform4fv(uniforms.uLightColor2, lightComponent2.color);

        //Repeat light setup for third light - red


            const lightComponent3 = lights[2].getComponentOfType(Light);
            const lightMatrix3 = getGlobalModelMatrix(lights[2]);
            const lightPosition3 = mat4.getTranslation(vec3.create(), lightMatrix3);
            gl.uniform3fv(uniforms.uLightPosition3, lightPosition3);
            gl.uniform1f(uniforms.uLightAmbient3,lightComponent3.ambient);
            gl.uniform1f(uniforms.uShininess3, lightComponent3.shininess);
            gl.uniform4fv(uniforms.uLightColor3, lightComponent3.color);

            //Repeat light setup for fourth light - blue
            const lightComponent4 = lights[3].getComponentOfType(Light);
            const lightMatrix4 = getGlobalModelMatrix(lights[3]);
            const lightPosition4 = mat4.getTranslation(vec3.create(), lightMatrix4);
            gl.uniform3fv(uniforms.uLightPosition4, lightPosition4);
            gl.uniform1f(uniforms.uLightAmbient4,lightComponent4.ambient);
            gl.uniform1f(uniforms.uShininess4, lightComponent4.shininess);
            gl.uniform4fv(uniforms.uLightColor4, lightComponent4.color);

  



        

        // Render each primitive in the model
        const models = getModels(node);
        for (const model of models) {
            for (const primitive of model.primitives) {
                this.renderPrimitive(primitive);
            }
        }

        // Render child nodes recursively
        for (const child of node.children) {
            this.renderNode(lights, child, modelMatrix);
        }
    }

    // Render a primitive object
    renderPrimitive(primitive) {
        const gl = this.gl;
        const { program, uniforms } = this.programs.unlit;

        // Prepare and bind vertex array object
        const vao = this.prepareMesh(primitive.mesh);
        gl.bindVertexArray(vao);

        // Set up material properties and textures
        const material = primitive.material;
        gl.uniform4fv(uniforms.uBaseFactor, material.baseFactor);

        // Base texture setup
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(uniforms.uBaseTexture, 0);
        const glTexture = this.prepareImage(material.baseTexture.image);
        const glSampler = this.prepareSampler(material.baseTexture.sampler);
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.bindSampler(0, glSampler);

        // Additional texture setups (normal, emission, roughness) follow similar pattern
        gl.activeTexture(gl.TEXTURE1);
        gl.uniform1i(uniforms.uNormalTexture, 1);

        const glTextureN = this.prepareImage(material.normalTexture.image);
        const glSamplerN = this.prepareSampler(material.normalTexture.sampler);

        gl.bindTexture(gl.TEXTURE_2D, glTextureN);
        gl.bindSampler(1, glSamplerN);

        gl.activeTexture(gl.TEXTURE2);
        gl.uniform1i(uniforms.uEmissionTexture, 2);

        const glTextureE = this.prepareImage(material.emissionTexture.image);
        const glSamplerE = this.prepareSampler(material.emissionTexture.sampler);

        gl.bindTexture(gl.TEXTURE_2D, glTextureE);
        gl.bindSampler(2, glSamplerE);

        gl.activeTexture(gl.TEXTURE3);
        gl.uniform1i(uniforms.uRoughnessTexture, 3);

        const glTextureR = this.prepareImage(material.roughnessTexture.image);
        const glSamplerR = this.prepareSampler(material.roughnessTexture.sampler);

        gl.bindTexture(gl.TEXTURE_2D, glTextureR);
        gl.bindSampler(3, glSamplerR);

        // Draw the primitive
        gl.drawElements(gl.TRIANGLES, primitive.mesh.indices.length, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
    }
}
