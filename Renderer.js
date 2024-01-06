import { vec3, mat3, mat4 } from './lib/gl-matrix-module.js';

import * as WebGL from './common/engine/WebGL.js';

import { BaseRenderer } from './common/engine/renderers/BaseRenderer.js';

import {
    getLocalModelMatrix,
    getGlobalViewMatrix,
    getProjectionMatrix,
    getGlobalModelMatrix,
    getModels,

} from './common/engine/core/SceneUtils.js';


import { Light } from './Light.js';

export class Renderer extends BaseRenderer {

    constructor(canvas) {
        super(canvas);
    }

    async initialize() {
        const gl = this.gl;

        const unlitVertexShader = await fetch(new URL('shader.vs', import.meta.url))
            .then(response => response.text());

        const unlitFragmentShader = await fetch(new URL('shader.fs', import.meta.url))
            .then(response => response.text());

        this.programs = WebGL.buildPrograms(gl, {
            unlit: {
                vertex: unlitVertexShader,
                fragment: unlitFragmentShader,
            },
        });

        gl.clearColor(1, 1, 1, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
    }

    render(scene, camera) {
        const gl = this.gl;

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const { program, uniforms } = this.programs.unlit;
        gl.useProgram(program);



        const cameraMatrix = getGlobalModelMatrix(camera);
        const cameraPosition = mat4.getTranslation(vec3.create(), cameraMatrix);
        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);


        gl.uniformMatrix4fv(uniforms.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, projectionMatrix);
        gl.uniform3fv(uniforms.uCameraPosition, cameraPosition);
       
        const lights = scene.filter(node => node.getComponentOfType(Light)); //NAVADEN JAVASCRIPTOV SEZNAM LUČI

   

         

        


        
        this.renderNode(lights,scene);


    }


    renderNode(lights,node, modelMatrix = mat4.create()) {
        const gl = this.gl;

        const { program, uniforms } = this.programs.unlit;

        const localMatrix = getLocalModelMatrix(node);
        modelMatrix = mat4.mul(mat4.create(), modelMatrix, localMatrix);
        gl.uniformMatrix4fv(uniforms.uModelMatrix, false, modelMatrix);

        const normalMatrix = mat3.normalFromMat4(mat3.create(), modelMatrix);
        gl.uniformMatrix3fv(uniforms.uNormalMatrix, false, normalMatrix);

        

        
     

            //const lightMatrix = getGlobalModelMatrix(lights[i]);
         //   const lightPosition = mat4.getTranslation(vec3.create(), lightMatrix);
            const modelPosition = mat4.getTranslation(vec3.create(), modelMatrix);
            const lightComponent = lights[0].getComponentOfType(Light);

            const lightMatrix = getGlobalModelMatrix(lights[0]);
            const lightPosition = mat4.getTranslation(vec3.create(), lightMatrix);

            gl.uniform3fv(uniforms.uLightPosition, lightPosition);
            gl.uniform1f(uniforms.uLightAmbient,lightComponent.ambient);
            gl.uniform1f(uniforms.uShininess, lightComponent.shininess);
            gl.uniform4fv(uniforms.uLightColor, lightComponent.color);
     
            //DRUGA LUČ
            
            const lightComponent2 = lights[1].getComponentOfType(Light);

            const lightMatrix2 = getGlobalModelMatrix(lights[1]);
            const lightPosition2 = mat4.getTranslation(vec3.create(), lightMatrix2);

            gl.uniform3fv(uniforms.uLightPosition2, lightPosition2);
            gl.uniform1f(uniforms.uLightAmbient2,lightComponent2.ambient);
            gl.uniform1f(uniforms.uShininess2, lightComponent2.shininess);
            gl.uniform4fv(uniforms.uLightColor2, lightComponent2.color);

  




           /* var light0PosLoc = gl.getUniformLocation(program, "Lights[0].Position");
            var light0LaLoc  = gl.getUniformLocation(program, "Lights[0].La");
            var light0LdLoc  = gl.getUniformLocation(program, "Lights[0].Ld");
            var light0LsLoc  = gl.getUniformLocation(program, "Lights[0].Ls");
            var light1PosLoc = gl.getUniformLocation(program, "Lights[1].Position");
            var light1LaLoc  = gl.getUniformLocation(program, "Lights[1].La");
            var light1LdLoc  = gl.getUniformLocation(program, "Lights[1].Ld");
            var light1LsLoc  = gl.getUniformLocation(program, "Lights[1].Ls");
            //Nearest[i] = gl.uniform3fv(uniforms.uLightPosition, lightPosition);*/
            //Nearest[i] = gl.uniform1f(uniforms.uLightAmbient, lights[i].ambient);
            //Nearest[i] = gl.uniform1f(uniforms.uShininess, lights[i].shininess);
            //Nearest[i] = gl.uniform4fv(uniforms.uLightColor, lights[i].color);
            //Nearest[i] = gl.uniform4fv(uniforms.lights, lights);


           

            


            



            

       
       // console.log(MinDistance);
            const models = getModels(node);
        for (const model of models) {
            for (const primitive of model.primitives) {
                this.renderPrimitive(primitive);
            }
        }



        for (const child of node.children) {
            this.renderNode(lights,child, modelMatrix);
        }



        



        


    }

    renderPrimitive(primitive) {
        const gl = this.gl;

        const { program, uniforms } = this.programs.unlit;

        const vao = this.prepareMesh(primitive.mesh);
        gl.bindVertexArray(vao);

        const material = primitive.material;
        gl.uniform4fv(uniforms.uBaseFactor, material.baseFactor);

        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(uniforms.uBaseTexture, 0);

        const glTexture = this.prepareImage(material.baseTexture.image);
        const glSampler = this.prepareSampler(material.baseTexture.sampler);

        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.bindSampler(0, glSampler);

        


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

        gl.activeTexture(gl.TEXTURE4);
        gl.uniform1i(uniforms.uOcclusionTexture, 4);

        const glTextureO = this.prepareImage(material.metalnessTexture.image);
        const glSamplerO = this.prepareSampler(material.metalnessTexture.sampler);

        gl.bindTexture(gl.TEXTURE_2D, glTextureO);
        gl.bindSampler(4, glSamplerO);



        
        gl.drawElements(gl.TRIANGLES, primitive.mesh.indices.length, gl.UNSIGNED_INT, 0);

        gl.bindVertexArray(null);
    }

}
