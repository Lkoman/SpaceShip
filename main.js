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

// Select canvas and initialize renderer
const canvas = document.querySelector('canvas');
const renderer = new Renderer(canvas);
await renderer.initialize();

//
// LOAD MODELS
//
let keys = [];
let doors = [];
let objects = []; // like cubes
let walls = [];

// Load the level model
const levelLoader = new GLTFLoader();
await levelLoader.load('common/models/Level.gltf');
const scene = levelLoader.loadScene(levelLoader.defaultScene);

// Set up the camera
const camera = scene.find(node => node.getComponentOfType(Camera));
camera.addComponent(new FirstPersonController(camera, document.body, { distance : 2}));

const modelNode = scene.find(node => node.getComponentOfType(Model));

modelNode.addComponent(new Transform({ 
	translation : [0,0,0],
	scale : [1,1,1],
}));

const key1Loader = new GLTFLoader();
await key1Loader.load('common/models/Key1.gltf');
const scene2 = key1Loader.loadScene(key1Loader.defaultScene);
const key1Node = scene2.find(node => node.getComponentOfType(Model));

key1Node.addComponent(new Transform({ 
	translation : [0,0.05,0.2],
	scale : [1,1,1],
}));

// Add the key to the level
scene.addChild(key1Node);

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