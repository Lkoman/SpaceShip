import { quat, vec3, mat4 } from '../../../lib/gl-matrix-module.js';
import { Transform } from '../core/Transform.js';
import { QuadTree, Rectangle } from '../../../QuadTree.js';

// Import object arrays from main.js
import { calculateWorldBoundingBox, traps, keys, quadTree, doors, scene } from '../../../main.js';

export let victory = 0; // 0 = three hearts, -1 = two hearts, -2 = one heart, -3 = death, 1 = victory

export class FirstPersonController {

    constructor(node, domElement, {
        pitch = 0,
        yaw = 0,
        velocity = [0, 0, 0],
        acceleration = 4,
        maxSpeed = 0.5,
        decay = 0.99999,
        pointerSensitivity = 0.001,
    } = {}) {
        this.node = node;
        this.domElement = domElement;

        this.keys = {};
        this.eKeyJustPressed = false;
        this.isShiftPressed = false;

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
        // Collision detection with walls
        let collisionNormals = [];
        let currentPosition = vec3.clone(transform.translation);
        console.log(currentPosition[0] + ", " + currentPosition[2]);
        const numSteps = 5;
        const collisionTolerance = 0.05;
        let finalPositionSafe = true;
        let totalPenetrationDepth = 0; // Aggregate penetration depth

        // Step through time to predict collisions
        for (let step = 0; step < numSteps; step++) {
            let stepFraction = (step + 1) / numSteps;
            let nextPosition = this.calculateNextPosition(dt * stepFraction);

            const playerNode = quadTree.findLeafNode({ x: nextPosition[0], y: nextPosition[2] });
            if (playerNode) {
                for (let object of playerNode.objects) {
                    let collisionInfo = this.checkCollisionLevel(nextPosition[0], nextPosition[2], object);
                    if (collisionInfo.collision) {
                        collisionNormals.push(collisionInfo.normal);
                        totalPenetrationDepth += collisionInfo.penetrationDepth;
                    }
                }
            }
        }

        // Check if the total penetration depth is within the tolerance
        if (totalPenetrationDepth > collisionTolerance) {
            finalPositionSafe = false;
        }

        // Calculate the average normal if there are multiple collisions
        let averageNormal = vec3.create();
        if (collisionNormals.length > 0) {
            for (let normal of collisionNormals) {
                vec3.add(averageNormal, averageNormal, normal);
            }
            vec3.scale(averageNormal, averageNormal, 1 / collisionNormals.length);
        }

        // Apply a bounce if collision detected
        if (totalPenetrationDepth > 0) {
            let bounce = vec3.scale(vec3.create(), averageNormal, totalPenetrationDepth);
            vec3.add(currentPosition, currentPosition, bounce); // Apply bounce to current position
            vec3.copy(transform.translation, currentPosition);

            // Reset totalPenetrationDepth after applying bounce
            totalPenetrationDepth = 0;
        }

        // Calculate the final potential position based on adjusted velocity (after bounce)
        let finalPotentialPosition = vec3.clone(currentPosition);
        vec3.scaleAndAdd(finalPotentialPosition, currentPosition, this.velocity, dt);

        // Update the player's position only if it's safe
        if (finalPositionSafe) {
            vec3.copy(transform.translation, finalPotentialPosition);
        }

        // Collision detection with objects
        // Keys
        let nextPositionStep = this.calculateNextPosition(dt);
        let playerBox = this.calculateBoundingBoxPlayer(nextPositionStep);
        let holdPosition = vec3.create();
        vec3.scale(holdPosition, forward, 0.1);
        for (let key of keys) {
            // Check if a door needs to be opened
            for (let door of doors) {
                if (this.checkCollision(playerBox, door.boundingBoxBig)) {
                    if (door.open == false && key.order == door.order && this.keys['KeyE'] && key.pickedUp) {
                        this.openDoor(door, dt);
                    }
                }
            }
            if (this.checkCollision(playerBox, key.boundingBoxBig)) {
                //console.log("Collision with key detected!");

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

                        key.components[0].translation[0] = nextPositionStep[0] + holdPosition[0];
                        key.components[0].translation[2] = nextPositionStep[2] + holdPosition[2];
                        // Update bounding box to the new dropped position
                        calculateWorldBoundingBox(key);
                    }                
                }
                break;
            }
        }

        // Update positions of picked up keys
        for (let key of keys) {
            if (key.pickedUp) {
                // Attach key to the player every frame
                let currentHoldPosition = vec3.create();
                vec3.scale(currentHoldPosition, forward, 0.12);

                key.components[0].translation[0] = nextPositionStep[0] + currentHoldPosition[0];
                key.components[0].translation[2] = nextPositionStep[2] + currentHoldPosition[2];

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
        // Check if any key is currently picked up
        let isAnyKeyPickedUp = keys.some(key => key.pickedUp);

        // Doors
        // Collision detection with doors
        // Check if a door needs to be opened
        for (let door of doors) {
            if (door.opening == true) {
                this.openDoor(door, dt);
            }
        }
        let collisionWithDoor = false;
        for (let door of doors) {
            if (this.checkCollision(playerBox, door.boundingBox)) {
                collisionWithDoor = true;
                //console.log("Collision with door detected!" )
        
                // Calculate door normal based on door orientation
                let doorNormal = vec3.create(); // Initialize the doorNormal vector
                if (door.order == 1) {
                    vec3.set(doorNormal, 1, 0, 0); 
                } else if (door.order == 2) {
                    vec3.set(doorNormal, -1, 0, 0); 
                } else if (door.order == 3) {
                    vec3.set(doorNormal, 0, 0, -1); 
                }
    
                // Prevent movement in the direction of the door
                const dotProduct = vec3.dot(this.velocity, doorNormal);
                if (dotProduct > 0) {
                    const projection = vec3.scale(vec3.create(), doorNormal, dotProduct);
                    vec3.subtract(this.velocity, this.velocity, projection);
                }
            }
        }

        // Check if finalPositionSafe is true before moving the player
        if (finalPositionSafe) {
            // Calculate the final potential position based on adjusted velocity (after bounce)
            let finalPotentialPosition = vec3.clone(currentPosition);
            vec3.scaleAndAdd(finalPotentialPosition, currentPosition, this.velocity, dt);

            // Check if moving towards the door, if so, prevent the movement
            if (!collisionWithDoor || vec3.distance(finalPotentialPosition, transform.translation) < vec3.distance(currentPosition, transform.translation)) {
                vec3.copy(transform.translation, finalPotentialPosition);
            }
        }

        let sprintMultiplier = 1;
        if (this.isShiftPressed && !isAnyKeyPickedUp) {
            sprintMultiplier = 2; // Adjust this value for desired sprint speed
        }

        // Traps
        for (let trap of traps) {
            if (this.checkCollision(playerBox, trap.boundingBoxTraps)) {
                // If the player is colliding with the trap for the first time
                if (!trap.playerHasBeenHit) {
                    // DEATH
                    if (victory != 1) {
                        victory -= 1;
                        console.log(3 + victory + " hearts remaining");
                    }
                    trap.playerHasBeenHit = true;
                }
            } else {
                // If the player is not colliding with the trap, reset the flag
                trap.playerHasBeenHit = false;
            }
            if (trap.type == "spikes")
                this.trapMove(trap, dt);
        }
        // Update velocity
        vec3.scaleAndAdd(this.velocity, this.velocity, acc, dt * this.acceleration * sprintMultiplier);

        const velocityThreshold = 0.001;
        // If there is no user input, apply decay.
        if (!this.keys['KeyW'] && !this.keys['KeyS'] && !this.keys['KeyD'] && !this.keys['KeyA']) {
            const decay = Math.exp(dt * Math.log(1 - this.decay));
            vec3.scale(this.velocity, this.velocity, decay);

            // If velocity is below the threshold, set it to zero
            if (vec3.length(this.velocity) < velocityThreshold) {
                vec3.set(this.velocity, 0, 0, 0);
            }
        }

        // Limit speed to prevent accelerating to infinity and beyond
        // Add sprint multiplier if shift is pressed
        const speed = vec3.length(this.velocity);
        if (speed > this.maxSpeed) {
            vec3.scale(this.velocity, this.velocity, (this.maxSpeed / speed) * sprintMultiplier);
        }

        if (transform && finalPositionSafe) {
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
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            this.isShiftPressed = true;
        }
        this.keys[e.code] = true;
    }

    keyupHandler(e) {
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            this.isShiftPressed = false;
        }
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
        const playerSize = { width: 0.15, height: 0.399, depth: 0.15};
    
        return {
            min: {
                x: position[0] - playerSize.width / 2,  // X-axis
                z: 0.007, // Z-axis (Height)
                y: position[2] - playerSize.depth / 2   // Y-axis
            },
            max: {
                x: position[0] + playerSize.width / 2,  // X-axis
                z: playerSize.height, // Z-axis (Height)
                y: position[2] + playerSize.depth / 2   // Y-axis
            }
        };
    }
    
    checkCollision(playerBox, objectBox) {
        return (
            playerBox.min.x <= objectBox.max.x && playerBox.max.x >= objectBox.min.x && // Check X-axis overlap
            playerBox.min.y <= objectBox.max.y && playerBox.max.y >= objectBox.min.y && // Check Y-axis overlap
            playerBox.min.z <= objectBox.max.z && playerBox.max.z >= objectBox.min.z // Check Z-axis overlap
        );
    }

    checkCollisionLevel(playerX, playerY, object) {
        // Line segment points
        const x1 = object[3].x;
        const y1 = object[3].y;
        const x2 = object[4].x;
        const y2 = object[4].y;

        // Buffer area for walls
        const buffer = 0.15;

        // Calculate the line segment vector
        const lineVec = vec3.fromValues(x2 - x1, 0, y2 - y1);
        vec3.normalize(lineVec, lineVec);

        // Normal of the line segment (wall), initially pointing in one direction
        let normal = vec3.fromValues(-lineVec[2], 0, lineVec[0]);

        // Check which side of the line segment the player is on
        const side = Math.sign((x2 - x1) * (playerY - y1) - (y2 - y1) * (playerX - x1));
        if (side < 0) {
            // If the player is on the other side, invert the normal
            vec3.scale(normal, normal, -1);
        }
        // Function to calculate distance from point to line segment
        const distancePointLineSegment = (px, py, x1, y1, x2, y2) => {
            const A = px - x1;
            const B = py - y1;
            const C = x2 - x1;
            const D = y2 - y1;
    
            const dot = A * C + B * D;
            const len_sq = C * C + D * D;
            const param = len_sq !== 0 ? dot / len_sq : -1;
    
            let xx, yy;
    
            if (param < 0) {
                xx = x1;
                yy = y1;
            } else if (param > 1) {
                xx = x2;
                yy = y2;
            } else {
                xx = x1 + param * C;
                yy = y1 + param * D;
            }
    
            const dx = px - xx;
            const dy = py - yy;
            return Math.sqrt(dx * dx + dy * dy);
        };
    
        // Calculate distance from player to line segment
        const dist = distancePointLineSegment(playerX, playerY, x1, y1, x2, y2);

        // Determine if there is a collision and calculate penetration depth
        let isCollision = dist <= buffer;
        let penetrationDepth = isCollision ? buffer - dist : 0;

        return {
            collision: isCollision,
            normal: normal,
            penetrationDepth: penetrationDepth
        };
    }

    openDoor(door, dt) {
        // Assuming door has a property 'height' indicating its current height
        const openHeight = 0.5; // Maximum height to which the door opens
        if (victory <= -3) {
            return 0;
        }
        if (door.components[0].translation[1] < openHeight) {
            door.components[0].translation[1] += dt * 0.2; // doorOpeningSpeed is the speed at which the door opens
            door.opening = true;
            calculateWorldBoundingBox(door, "door");
            for (let key of keys) {
                if (key.order == door.order) {
                    scene.removeChild(key);
                    //keys.splice(0, keys.length, ...keys.filter(key => key.order == door.order));
                    break;
                }
            }
        } else {
            door.open = true;
            door.opening = false;

            if (door.order == 3 && victory == 0) {
                victory = 1;
            }
        }
    }

    trapMove(trap, dt) {
        if (trap.obratno) {
            if (trap.direction == false) {
                trap.components[2].translation[trap.axis] += dt * trap.speed2;
                calculateWorldBoundingBox(trap, "trap");
                if (trap.components[2].translation[trap.axis] >= trap.positionFrom) {
                    trap.direction = true;
                }
            }
            if (trap.direction == true) {
                trap.components[2].translation[trap.axis] -= dt * trap.speed1;
                calculateWorldBoundingBox(trap, "trap");
                if (trap.components[2].translation[trap.axis] <= trap.positionTo) {
                    trap.direction = false;
                }
            }
        } else {
            if (trap.direction == false) {
                trap.components[2].translation[trap.axis] -= dt * trap.speed1;
                calculateWorldBoundingBox(trap, "trap");
                if (trap.components[2].translation[trap.axis] <= trap.positionFrom) {
                    trap.direction = true;
                }
            }
            if (trap.direction == true) {
                trap.components[2].translation[trap.axis] += dt * trap.speed2;
                calculateWorldBoundingBox(trap, "trap");
                if (trap.components[2].translation[trap.axis] >= trap.positionTo) {
                    trap.direction = false;
                }
            }
        }
        //console.log("trap");
        //if (trap.axis == 2) console.log(trap.components[2].translation);
    }
}
