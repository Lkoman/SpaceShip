// Import necessary modules and components
import { ResizeSystem } from './common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from './common/engine/systems/UpdateSystem.js';
import { FirstPersonController } from './common/engine/controllers/FirstPersonController.js';
import { RotateAnimator } from './common/engine/animators/RotateAnimator.js';
import { LinearAnimator } from './common/engine/animators/LinearAnimator.js';
import * as EasingFunctions from './common/engine/animators/EasingFunctions.js';
import { quat, vec3, mat4 } from './lib/gl-matrix-module.js';
import { GLTFLoader } from './common/engine/loaders/GLTFLoader.js';
import { Camera, Model, Node, Transform } from './common/engine/core.js';

import { Renderer } from './Renderer.js';
import { Light } from './Light.js';
import { Wall } from './Wall.js';

// Select canvas and initialize renderer
const canvas = document.querySelector('canvas');
const renderer = new Renderer(canvas);
await renderer.initialize();

//
// LOAD MODELS
//
export let keys = [];
export let doors = [];
export let objects = []; // like cubes
export let walls = [];

// Load the level model
const levelLoader = new GLTFLoader();
await levelLoader.load('common/models/Level.gltf');
const scene = levelLoader.loadScene(levelLoader.defaultScene);
const levelNode = scene.find(node => node.getComponentOfType(Model));
console.log("Level node");
console.log(levelNode);

// Set up the camera
const camera = scene.find(node => node.getComponentOfType(Camera));
camera.addComponent(new FirstPersonController(camera, document.body, { distance : 2}));

// check outputs camera
const cameraTransform = camera.getComponentOfType(Transform);
const cameraWorldPosition = [cameraTransform.matrix[12], cameraTransform.matrix[13], cameraTransform.matrix[14]];
console.log('Camera World Position:', cameraWorldPosition);
console.log("camera");
console.log(camera);

const modelNode = scene.find(node => node.getComponentOfType(Model));
modelNode.addComponent(new Transform({
	scale : [1,1,1],
	translation : [0,0,0],
}));

let wall1 = new Wall( // x, z, y
	[2.12119, 0.636927, 0.283369], // leftUp
	[2.12119, -0.014845, 0.283369], // leftDown
	[2.12119, 0.644094, 2.20138], // rightUp
	[2.12119, -0.008538, 2.20138] // rightDown
);
walls.push(wall1);

// Add key models
const key1Loader = new GLTFLoader();
await key1Loader.load('common/models/Key1.gltf');
const sceneKey1 = key1Loader.loadScene(key1Loader.defaultScene);
const key1Node = sceneKey1.find(node => node.getComponentOfType(Model));

key1Node.addComponent(new Transform({
	scale : [1,1,1],
	translation : [0,0,0], // x, z, y
}));

const key2Loader = new GLTFLoader();
await key2Loader.load('common/models/Key2.gltf');
const sceneKey2 = key2Loader.loadScene(key2Loader.defaultScene);
const key2Node = sceneKey2.find(node => node.getComponentOfType(Model));

key2Node.addComponent(new Transform({
	scale : [1,1,1],
	translation : [0,0,0], // x, z, y
}));

// Set the position of keys
key1Node.components[0].translation = [0, 0.3, 0]; // x, z, y
key2Node.components[0].translation = [2, 0.3, 4]; // x, z, y
keys.push(key1Node);
keys.push(key2Node);

// Calculate the bounding boxes for all keys
for (let key of keys) {
	calculateWorldBoundingBox(key);
	key.pickedUp = false;
}

// Add the key to the level
scene.addChild(key1Node);
scene.addChild(key2Node);

//
// LIGHT COMPONENTS
//
const light = new Node();
light.addComponent(new Light({
	color : [1.0,1.0,1.0,1.0],
	ambient  : 0.0,
	shininess : 100,

}));

light.addComponent(new Transform());
light.addComponent(new LinearAnimator(light, { 
	startPosition : [0.7,0.3,-1],
	endPosition: [0.7,0.3,-1],
	duration : 2,
	loop : true,

}));

const light2 = new Node();
light2.addComponent(new Light({
	color : [1.0,1.0,1.0,1.0],
	ambient  : 0.0,
	shininess : 100,
}));

light2.addComponent(new Transform());
light2.addComponent(new LinearAnimator(light2, { 
	startPosition : [0.7,0.3,1.0],
	endPosition: [0.7,0.3,1.0],
	duration : 2,
	loop : true,

}));

scene.addChild(light);
scene.addChild(light2);

function update(time, dt) {
	scene.traverse(node => {
		for(const component of node.components)
		{
			component.update?.(time,dt);
		}
	})
}

function render() {
	renderer.render(scene, camera);
}

function resize({ displaySize : { width, height }}) {
	camera.getComponentOfType(Camera).aspect = width / height;
}

new ResizeSystem({canvas, resize}).start();

new UpdateSystem({update, render}).start();

export function calculateWorldBoundingBox(node) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    // Get the world matrix
    let worldMatrix = node.components[0].matrix;

    for (let vertex of node.components[1].primitives[0].mesh.vertices) {
		if (vertex.normal.length === 0 && vertex.tangent.length === 0 && vertex.texcoords.length === 0) {
			break;
        }

		// Original vertex position, node.components[0].translation = [x, z, y]
        let x = vertex.position[0], z = vertex.position[1], y = vertex.position[2];

        // Apply the world matrix to the vertex position
        let transformedX = worldMatrix[0] * x + worldMatrix[4] * y + worldMatrix[8] * z + worldMatrix[12];
        let transformedZ = worldMatrix[1] * x + worldMatrix[5] * y + worldMatrix[9] * z + worldMatrix[13];
        let transformedY = worldMatrix[2] * x + worldMatrix[6] * y + worldMatrix[10] * z + worldMatrix[14];

        // Update the min and max coordinates
        minX = Math.min(minX, transformedX);
        minY = Math.min(minY, transformedY);
        minZ = Math.min(minZ, transformedZ);
        maxX = Math.max(maxX, transformedX);
        maxY = Math.max(maxY, transformedY);
        maxZ = Math.max(maxZ, transformedZ);
    }
	/*node.dimensions = {
        w: maxX - minX,
        h: maxX - minX,
        d: maxY - minY
    };*/

	node.rezerva = (maxY - minY)*3;

	node.boundingBoxBig = {
		min: {x: minX - node.rezerva, z: minZ, y: minY - node.rezerva},
		max: {x: maxX + node.rezerva, z: maxZ, y: maxY + node.rezerva}
	};

    node.boundingBox = {
        min: {x: minX, y: minY, z: minZ},
        max: {x: maxX, y: maxY, z: maxZ}
    };
}

// Show "pick up with E" text above pickup-able objects
export function showPickupText(show) {
    //document.getElementById('pickup-text').style.display = show ? 'block' : 'none';
}
