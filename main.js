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
import { QuadTree, Rectangle } from './QuadTree.js';

// Select canvas and initialize renderer
const canvas = document.querySelector('canvas');
const renderer = new Renderer(canvas);
await renderer.initialize();

//
// LOAD MODELS
//
export let keys = [];
export let doors = [];
export let traps = [];
export let playerHeight = 0.3999999761581421;
let victory = 0; // 0 = nothing, -1 = defeat, 1 = victory


// Load the level model
const levelLoader = new GLTFLoader();
await levelLoader.load('common/models/Level.gltf');
export const scene = levelLoader.loadScene(levelLoader.defaultScene);
const levelNode = scene.find(node => node.getComponentOfType(Model));

// Calculate the QuadTree for the level
const levelBounds = new Rectangle(-(calculateDimensions(levelNode).w/2), -(calculateDimensions(levelNode).d/2), calculateDimensions(levelNode).w/2, calculateDimensions(levelNode).d/2);

export const quadTree = new QuadTree(levelBounds, 200);
extractTrianglesFromLevel(levelNode, playerHeight);

//quadTree.logNodeDetails();

// Set up the camera
export const camera = scene.find(node => node.getComponentOfType(Camera));
camera.addComponent(new FirstPersonController(camera, document.body, { distance : 2}));

const modelNode = scene.find(node => node.getComponentOfType(Model));
modelNode.addComponent(new Transform({
	scale : [1,1,1],
	translation : [0,0,0],
}));

// Add key models
const key1Loader = new GLTFLoader();
await key1Loader.load('common/models/Key1.gltf');
const sceneKey1 = key1Loader.loadScene(key1Loader.defaultScene);
const key1Node = sceneKey1.find(node => node.getComponentOfType(Model));

key1Node.addComponent(new Transform({
	scale : [1,1,1],
	translation : [0,0,0], // x, z, y
}));
key1Node.order = 1;

const key2Loader = new GLTFLoader();
await key2Loader.load('common/models/Key2.gltf');
const sceneKey2 = key2Loader.loadScene(key2Loader.defaultScene);
const key2Node = sceneKey2.find(node => node.getComponentOfType(Model));

key2Node.addComponent(new Transform({
	scale : [1,1,1],
	translation : [0,0,0], // x, z, y
}));
key2Node.order = 2;

const key3Loader = new GLTFLoader();
await key3Loader.load('common/models/Key2.gltf');
const sceneKey3 = key3Loader.loadScene(key3Loader.defaultScene);
const key3Node = sceneKey3.find(node => node.getComponentOfType(Model));

key3Node.addComponent(new Transform({
	scale : [1,1,1],
	translation : [0,0,0], // x, z, y
}));
key3Node.order = 3;

// Set the position of keys
key1Node.components[0].translation = [1, 0.3, 0]; // x, z, y
key2Node.components[0].translation = [1.5, 0.3, 1]; // x, z, y
key3Node.components[0].translation = [1.2, 0.3, 0]; // x, z, y
keys.push(key1Node);
keys.push(key2Node);
keys.push(key3Node);

// Calculate the bounding boxes for all keys
for (let key of keys) {
	calculateWorldBoundingBox(key, "key");
	key.pickedUp = false;
}

// Add the key to the level
scene.addChild(key1Node);
scene.addChild(key2Node);
scene.addChild(key3Node);

// Add door models
// Add key models
const door1Loader = new GLTFLoader();
await door1Loader.load('common/models/Door.gltf');
const sceneDoor1 = door1Loader.loadScene(door1Loader.defaultScene);
const door1Node = sceneDoor1.find(node => node.getComponentOfType(Model));

door1Node.addComponent(new Transform({
	scale : [1,1,1],
	translation : [0,0,0], // x, z, y
}));
door1Node.order = 1;
doors.push(door1Node);

for (let door of doors) {
    calculateWorldBoundingBox(door, "door");
    console.log(door);
    door.open = false;
    door.opening = false;
}

scene.addChild(door1Node);

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

// AABB for objects
export function calculateWorldBoundingBox(node, object) {
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
        let transformedX = worldMatrix[0] * x + worldMatrix[4] * z + worldMatrix[8] * y + worldMatrix[12];
        let transformedZ = worldMatrix[1] * x + worldMatrix[5] * z + worldMatrix[9] * y + worldMatrix[13];
        let transformedY = worldMatrix[2] * x + worldMatrix[6] * z + worldMatrix[10] * y + worldMatrix[14];

        // Update the min and max coordinates
        minX = Math.min(minX, transformedX);
        minY = Math.min(minY, transformedY);
        minZ = Math.min(minZ, transformedZ);
        maxX = Math.max(maxX, transformedX);
        maxY = Math.max(maxY, transformedY);
        maxZ = Math.max(maxZ, transformedZ);
    }

	// Bounding box that is used with traps
    if (object == "trap") {
        node.boundingBoxTraps = {
            min: {x: minX - minX*0.01 , y: minY - minY*0.01, z: minZ - minZ*0.01},
            max: {x: maxX + maxX*0.01, y: maxY - maxY*0.01, z: maxZ + maxZ*0.01}
        };
    }

	// Bounding box that is used with objects that can be picked up (bigger for easier pick up)
    if (object == "key") {
        if (node.rezerva == undefined) {
            node.rezerva = Math.max((maxX - minX)*3.5, (maxZ - minZ)*3.5, (maxY - minY)*3.5);
        }
    } else if (object == "door") {
        if (node.rezerva == undefined) {
            node.rezerva = Math.max((maxX - minX)*1.05, (maxZ - minZ)*1.05, (maxY - minY)*1.05);
        }
        node.boundingBox = {
            min: {x: minX - minX*0.05 , y: minY - minY*0.05, z: minZ - minZ*0.05},
            max: {x: maxX + maxX*0.05, y: maxY - maxY*0.05, z: maxZ + maxZ*0.05}
        };
    }
	node.boundingBoxBig = {
		min: {x: minX - node.rezerva, z: minZ, y: minY - node.rezerva},
		max: {x: maxX + node.rezerva, z: maxZ, y: maxY + node.rezerva}
	};
}

export function calculateDimensions(node) {
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
        let transformedX = worldMatrix[0] * x + worldMatrix[4] * z + worldMatrix[8] * y + worldMatrix[12];
        let transformedZ = worldMatrix[1] * x + worldMatrix[5] * z + worldMatrix[9] * y + worldMatrix[13];
        let transformedY = worldMatrix[2] * x + worldMatrix[6] * z + worldMatrix[10] * y + worldMatrix[14];

        // Update the min and max coordinates
        minX = Math.min(minX, transformedX);
        minY = Math.min(minY, transformedY);
        minZ = Math.min(minZ, transformedZ);
        maxX = Math.max(maxX, transformedX);
        maxY = Math.max(maxY, transformedY);
        maxZ = Math.max(maxZ, transformedZ);
    }

	return {
		w: (maxX - minX),
		h: (maxZ - minZ),
		d: (maxY - minY)
	};
}

function extractTrianglesFromLevel(levelNode, playerHeight) {
    let mesh = levelNode.components[1].primitives[0].mesh;
    let lineVertex1, lineVertex2;
    const triangles = [];
    for (let i = 0; i < mesh.indices.length; i += 3) {
        if (getVertexByIndex(mesh, mesh.indices[i]) === false) {
            return triangles;
        }
        let vertex1 = getVertexByIndex(mesh, mesh.indices[i]);
        let vertex2 = getVertexByIndex(mesh, mesh.indices[i + 1]);
        let vertex3 = getVertexByIndex(mesh, mesh.indices[i + 2]);

        // Get the min and max Z values of the triangle
        let minZ = Math.min(vertex1.z, vertex2.z, vertex3.z);
        let maxZ = Math.max(vertex1.z, vertex2.z, vertex3.z);

        // Check if any part of the triangle is within the player's height range
        if ((minZ < 0.0061957621946930885 && maxZ > 0.0061957621946930885) || 
            (minZ < playerHeight && maxZ > playerHeight) ||
            (minZ > 0.0061957621946930885 && maxZ <= playerHeight)) {
            [lineVertex1, lineVertex2] = calculateInterpolation(vertex1, vertex2, vertex3, minZ, maxZ, playerHeight);
            triangles.push([vertex1, vertex2, vertex3, lineVertex1, lineVertex2, minZ]);
            quadTree.insert([vertex1, vertex2, vertex3, lineVertex1, lineVertex2, minZ]);
        }
    }
}

function getVertexByIndex(mesh, index) {
	if (mesh.vertices[index].normal.length == 0 && mesh.vertices[index].tangent.length == 0 && mesh.vertices[index].texcoords.length == 0) {
		return false;
	}
    return {
        x: mesh.vertices[index].position[0],
        z: mesh.vertices[index].position[1],
        y: mesh.vertices[index].position[2]
	};
}

// Calculate line for collision with interpolation
function calculateInterpolation(vertex1, vertex2, vertex3, minZ, maxZ, playerHeight) {
    let lineVertex1, lineVertex2;
    let alone, sameSide1, sameSide2; // vertexi, razdeljeni na dve skupini (odvisno od heighta playerja)
    let dX1, dY1, dZ1, dX2, dY2, dZ2, dZplayer1, dZplayer2;
    let groupZgoraj = [], groupSpodaj = [];

    // Check the position of the triangle
    // Rabimo izračunat vertexa ki sta na isti strani heighta playerja in vertex, ki je na drugi strani heighta playerja
    if (vertex1.z > playerHeight) {
        groupZgoraj.push(vertex1);
    } else groupSpodaj.push(vertex1);

    if (vertex2.z > playerHeight) {
        groupZgoraj.push(vertex2);
    } else groupSpodaj.push(vertex2);

    if (vertex3.z > playerHeight) {
        groupZgoraj.push(vertex3);
    } else groupSpodaj.push(vertex3);

    if (groupZgoraj.length == 1) { // zgoraj je sam en vertex, spodaj dva (nad/pod playerHeight)
        alone = groupZgoraj[0];
        sameSide1 = groupSpodaj[0];
        sameSide2 = groupSpodaj[1];

        dX1 = alone.x - sameSide1.x;
        dY1 = alone.y - sameSide1.y;
        dZ1 = alone.z - sameSide1.z;

        dX2 = alone.x - sameSide2.x;
        dY2 = alone.y - sameSide2.y;
        dZ2 = alone.z - sameSide2.z;

        dZplayer1 = playerHeight - sameSide1.z;
        dZplayer2 = playerHeight - sameSide2.z;

        lineVertex1 = {x: sameSide1.x + dX1 * dZplayer1 / dZ1, y: sameSide1.y + dY1 * dZplayer1 / dZ1, z: playerHeight};
        lineVertex2 = {x: sameSide2.x + dX2 * dZplayer2 / dZ2, y: sameSide2.y + dY2 * dZplayer2 / dZ2, z: playerHeight};
    }
    else { // zgoraj sta dva vertexa, spodaj en (nad/pod playerHeight)
        alone = groupSpodaj[0];
        sameSide1 = groupZgoraj[0];
        sameSide2 = groupZgoraj[1];

        dX1 = sameSide1.x - alone.x;
        dY1 = sameSide1.y - alone.y;
        dZ1 = sameSide1.z - alone.z;

        dX2 = sameSide2.x - alone.x;
        dY2 = sameSide2.y - alone.y;
        dZ2 = sameSide2.z - alone.z;

        dZplayer1 = sameSide1.z - playerHeight;
        dZplayer2 = sameSide2.z - playerHeight;

        lineVertex1 = {x: alone.x + dX1 * dZplayer1 / dZ1, y: alone.y + dY1 * dZplayer1 / dZ1, z: playerHeight};
        lineVertex2 = {x: alone.x + dX2 * dZplayer2 / dZ2, y: alone.y + dY2 * dZplayer2 / dZ2, z: playerHeight};
    }

    return [lineVertex1, lineVertex2];
}

/*function calculateAABB(triangle) {
    let minX = Math.min(triangle[0].x, triangle[1].x, triangle[2].x);
    let minY = Math.min(triangle[0].y, triangle[1].y, triangle[2].y);
    let maxX = Math.max(triangle[0].x, triangle[1].x, triangle[2].x);
    let maxY = Math.max(triangle[0].y, triangle[1].y, triangle[2].y);

    // The depth here is actually the extent of the triangle along the y-axis.
    let depth = maxY - minY;
    let width = maxX - minX;
    if (depth === 0) {
        depth = 0.05;
    }
    if (width == 0) {
        width = 0.05;
    }

	let aabb = new Rectangle(minX, minY, width, depth);

    // Using the updated Rectangle class with the 'depth' property.
    return aabb;
}*/