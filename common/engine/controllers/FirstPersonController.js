import { quat, vec3, mat4 } from '../../../lib/gl-matrix-module.js';
import { Transform } from '../core/Transform.js';
import { Wall } from '../../../Wall.js';

// Import object arrays from main.js
import { showPickupText, calculateWorldBoundingBox, walls, keys } from '../../../main.js';

export class FirstPersonController {

    constructor(node, domElement, {
        pitch = 0,
        yaw = 0,
        velocity = [0, 0, 0],
        acceleration = 20,
        maxSpeed = 1,
        decay = 0.99999,
        pointerSensitivity = 0.002,
    } = {}) {
        this.node = node;
        this.domElement = domElement;

        this.keys = {};
        this.eKeyJustPressed = false;

        this.pitch = pitch;
        this.yaw = yaw;

        this.velocity = velocity;
        this.acceleration = acceleration;
        this.maxSpeed = maxSpeed;
        this.decay = decay;
        this.pointerSensitivity = pointerSensitivity;

        this.initHandlers();
    }

    initHandlers() {
        this.pointermoveHandler = this.pointermoveHandler.bind(this);
        this.keydownHandler = this.keydownHandler.bind(this);
        this.keyupHandler = this.keyupHandler.bind(this);

        const element = this.domElement;
        const doc = element.ownerDocument;

        doc.addEventListener('keydown', this.keydownHandler);
        doc.addEventListener('keyup', this.keyupHandler);

        element.addEventListener('click', e => element.requestPointerLock());
        doc.addEventListener('pointerlockchange', e => {
            if (doc.pointerLockElement === element) {
                doc.addEventListener('pointermove', this.pointermoveHandler);
            } else {
                doc.removeEventListener('pointermove', this.pointermoveHandler);
            }
        });
    }

    update(t, dt) {
        const transform = this.node.getComponentOfType(Transform);

        const playerRotation = quat.create();
        quat.rotateY(playerRotation, playerRotation, this.yaw);
        quat.rotateX(playerRotation, playerRotation, this.pitch);
        transform.rotation = playerRotation;

        // Calculate forward and right vectors
        const cos = Math.cos(this.yaw);
        const sin = Math.sin(this.yaw);
        const forward = [-sin, 0, -cos];
        const right = [cos, 0, -sin];

        // Map user input to the acceleration vector
        const acc = vec3.create();
        if (this.keys['KeyW']) {
            vec3.add(acc, acc, forward);
        }
        if (this.keys['KeyS']) {
            vec3.sub(acc, acc, forward);
        }
        if (this.keys['KeyD']) {
            vec3.add(acc, acc, right);
        }
        if (this.keys['KeyA']) {
            vec3.sub(acc, acc, right);
        }

        //
        // Collision detection
        //
        let nextPosition = this.calculateNextPosition(dt);
        let playerBox = this.calculateBoundingBoxPlayer(nextPosition);

        // Collision detection with objects
        // Walls
        /*for (let wall of walls) {
            let wallBox = // get the bounding box for the wall
            if (this.checkCollision(playerBox, wallBox)) {
                console.log("Collision with wall detected!");
                // Determine collision side and adjust movement
                if (nextPosition[0] < wallBox.min[0]) {
                    this.velocity[0] = Math.min(0, this.velocity[0]);// Collision on the player's right side
                } else if (nextPosition[0] > wallBox.max[0]) {
                    this.velocity[0] = Math.max(0, this.velocity[0]);// Collision on the player's left side
                }
                if (nextPosition[2] < wallBox.min[2]) {
                    this.velocity[2] = Math.min(0, this.velocity[2]);// Collision in front of the player
                } else if (nextPosition[2] > wallBox.max[2]) {
                    this.velocity[2] = Math.max(0, this.velocity[2]);// Collision behind the player
                }
                break; // Stop checking after first collision
            }
        }*/

        // Keys
        let holdPosition = vec3.create();
        vec3.scale(holdPosition, forward, 0.1);
        for (let key of keys) {
            if (this.checkCollision(playerBox, key.boundingBoxBig)) {
                //console.log("Collision with key detected!");
                showPickupText(true);

                if (this.eKeyJustPressed) {
                    this.eKeyJustPressed = false;

                    if (!key.pickedUp) {
                        // KEY PICKED UP
                        for (let key of keys) {
                            if (key.pickedUp) 
                                break;
                        }
                        key.pickedUp = true;
                    } else {
                        // KED DROPPED
                        key.pickedUp = false;

                        key.components[0].translation[0] = nextPosition[0] + holdPosition[0];
                        key.components[0].translation[2] = nextPosition[2] + holdPosition[2];
                        // Update bounding box to the new dropped position
                        calculateWorldBoundingBox(key);
                    }                
                }
                break;
            } else {
                showPickupText(false);
            }
        }

        // Update positions of picked up keys
        for (let key of keys) {
            if (key.pickedUp) {
                // Attach key to the player every frame
                let currentHoldPosition = vec3.create();
                vec3.scale(currentHoldPosition, forward, 0.12);

                key.components[0].translation[0] = nextPosition[0] + currentHoldPosition[0];
                key.components[0].translation[2] = nextPosition[2] + currentHoldPosition[2];

                // Update the key's rotation
                const keyRotation = quat.create();
                const zAxisRotation = quat.setAxisAngle(quat.create(), [0, 1, 0], Math.PI / 2);
                quat.multiply(keyRotation, keyRotation, zAxisRotation);
                quat.rotateY(keyRotation, keyRotation, this.yaw);
                key.components[0].rotation = keyRotation;

                // Calculate the keys new bounding box
                calculateWorldBoundingBox(key);
                break;
            }
        }

        // Update velocity
        vec3.scaleAndAdd(this.velocity, this.velocity, acc, dt * this.acceleration);

        // If there is no user input, apply decay.
        if (!this.keys['KeyW'] &&
            !this.keys['KeyS'] &&
            !this.keys['KeyD'] &&
            !this.keys['KeyA'])
        {
            const decay = Math.exp(dt * Math.log(1 - this.decay));
            vec3.scale(this.velocity, this.velocity, decay);
        }

        // Limit speed to prevent accelerating to infinity and beyond.
        const speed = vec3.length(this.velocity);
        if (speed > this.maxSpeed) {
            vec3.scale(this.velocity, this.velocity, this.maxSpeed / speed);
        }

        if (transform) {
            // Update translation based on velocity.
            vec3.scaleAndAdd(transform.translation,
                transform.translation, this.velocity, dt);

            // Update rotation based on the Euler angles.
            const rotation = quat.create();
            quat.rotateY(rotation, rotation, this.yaw);
            quat.rotateX(rotation, rotation, this.pitch);
            transform.rotation = rotation;
        }

        if (this.eKeyJustPressed) {
            this.eKeyJustPressed = false;
        }
    }

    pointermoveHandler(e) {
        const dx = e.movementX;
        const dy = e.movementY;

        this.pitch -= dy * this.pointerSensitivity;
        this.yaw   -= dx * this.pointerSensitivity;

        const twopi = Math.PI * 2;
        const halfpi = Math.PI / 2;

        this.pitch = Math.min(Math.max(this.pitch, -halfpi), halfpi);
        this.yaw = ((this.yaw % twopi) + twopi) % twopi;
    }

    keydownHandler(e) {
        if (e.code === 'KeyE' && !this.keys[e.code]) {
            this.eKeyJustPressed = true;
        }
        this.keys[e.code] = true;
    }

    keyupHandler(e) {
        this.keys[e.code] = false;
    }

    calculateNextPosition(dt) {
        // Create a new vector to represent the next position
        let nextPosition = vec3.create();

        // Calculate the change in position
        let deltaPosition = vec3.create();
        vec3.scale(deltaPosition, this.velocity, dt);

        // Add the change in position to the current position
        vec3.add(nextPosition, this.node.getComponentOfType(Transform).translation, deltaPosition);

        return nextPosition;
    }

    calculateBoundingBoxPlayer(position) {
        // Define the player size
        const playerSize = { width: 0.2, height: 0.399, depth: 0.2};
    
        return {
            min: {
                x: position[0] - playerSize.width / 2,  // X-axis
                z: position[1] - playerSize.height / 2, // Z-axis (Height)
                y: position[2] - playerSize.depth / 2   // Y-axis
            },
            max: {
                x: position[0] + playerSize.width / 2,  // X-axis
                z: position[1] + playerSize.height / 2, // Z-axis (Height)
                y: position[2] + playerSize.depth / 2   // Y-axis
            }
        };
    }
    
    checkCollision(playerBox, objectBox) {
        return (
            playerBox.min.x <= objectBox.max.x && playerBox.max.x >= objectBox.min.x && // Check X-axis overlap
            playerBox.min.y <= objectBox.max.y && playerBox.max.y >= objectBox.min.y // Check Y-axis overlap        
        );
    }
}
