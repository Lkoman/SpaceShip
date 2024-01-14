export class QuadTree {
    constructor(boundary, capacity) {
        this.boundary = boundary; // AABB of this quadrant
        this.capacity = capacity; // Maximum number of objects (triangles) this node can hold
        this.objects = []; // Objects (triangles) in this quadrant
        this.divided = false; // Whether this node has been subdivided
        this.buffer = 0; // Buffer to extend the boundary by when checking for intersection
    }

    // Insert an object (triangle)
    insert(triangle) {
        // If the node is divided, try inserting the triangle into the child nodes
        if (this.divided) {
            if (this.topRight.boundary.intersects(triangle, this.buffer)) {
                return this.topRight.insert(triangle);
            }
            if (this.topLeft.boundary.intersects(triangle, this.buffer)) {
                return this.topLeft.insert(triangle);
            }
            if (this.bottomRight.boundary.intersects(triangle, this.buffer)) {
                return this.bottomRight.insert(triangle);
            }
            if (this.bottomLeft.boundary.intersects(triangle, this.buffer)) {
                return this.bottomLeft.insert(triangle);
            }
            // If the triangle doesn't fit into any child, keep it in the parent node
        }

        // Subdivide the node if it exceeds capacity and hasn't been divided yet
        if (!this.divided && this.objects.length >= this.capacity) {
            this.subdivide();
            // Try inserting again after subdivision
            return this.insert(triangle);
        }

        // If not subdivided, add the triangle to the current node
        this.objects.push(triangle);
        return true;
    }

    // Subdivide the node into four child quadrants
    subdivide() {
        // Calculate midpoints for subdividing
        const midX = (this.boundary.minX + this.boundary.maxX) / 2;
        const midY = (this.boundary.minY + this.boundary.maxY) / 2;

        // Create new boundaries for the child quadrants
        const bl = new Rectangle(midX, this.boundary.minY, this.boundary.maxX, midY); // Top Right
        const tl = new Rectangle(this.boundary.minX, this.boundary.minY, midX, midY); // Top Left
        const br = new Rectangle(midX, midY, this.boundary.maxX, this.boundary.maxY); // Bottom Right
        const tr = new Rectangle(this.boundary.minX, midY, midX, this.boundary.maxY); // Bottom Left

        // Create child QuadTrees with the new boundaries
        this.topRight = new QuadTree(tr, this.capacity);
        this.topLeft = new QuadTree(tl, this.capacity);
        this.bottomRight = new QuadTree(br, this.capacity);
        this.bottomLeft = new QuadTree(bl, this.capacity);
        this.divided = true;

        // Distribute existing objects into the new quadrants
        let objectsToRedistribute = this.objects;
        this.objects = [];
        objectsToRedistribute.forEach(obj => {
            this.insert(obj); // Use the updated insert logic to redistribute objects
        });

        this.divided = true;
    }

/*    // Query for potential collisions
    query(range, found = []) {
        if (!this.boundary.intersects(range)) {
            return found;
        }

        for (const obj of this.objects) {
            if (range.intersects(obj)) {
                found.push(obj);
            }
        }

        if (this.divided) {
            this.topRight.query(range, found);
            this.topLeft.query(range, found);
            this.bottomRight.query(range, found);
            this.bottomLeft.query(range, found);
        }

        return found;
    }*/

    // Find the leaf node that contains the given point
    findLeafNode(point) {
        // Check if the point is outside of this node's boundary
        if (!this.boundary.contains(point, this.buffer)) {
            return null;
        }

        // If this node is not divided, return this node
        if (!this.divided) {
            return this;
        }

        // Otherwise, recursively query the child nodes
        return this.topRight.findLeafNode(point) ||
               this.topLeft.findLeafNode(point) ||
               this.bottomRight.findLeafNode(point) ||
               this.bottomLeft.findLeafNode(point);
    }

    // Retrieve all nodes that intersect with the given bounding box
    queryIntersectingNodes(boundingBox, found = []) {
        // Create a new bounding box with added buffer
        const bufferedBoundingBox = {
            min: {
                x: boundingBox.min.x - 0.5,
                y: boundingBox.min.y - 0.5
            },
            max: {
                x: boundingBox.max.x + 0.5,
                y: boundingBox.max.y + 0.5
            }
        };
    
        if (!this.boundary.intersectsRectangle(bufferedBoundingBox)) {
            return found;
        }
    
        if (!this.divided) {
            found.push(this);
        } else {
            this.topRight.queryIntersectingNodes(bufferedBoundingBox, found);
            this.topLeft.queryIntersectingNodes(bufferedBoundingBox, found);
            this.bottomRight.queryIntersectingNodes(bufferedBoundingBox, found);
            this.bottomLeft.queryIntersectingNodes(bufferedBoundingBox, found);
        }
    
        return found;
    }
    

    // Počisti celoten QuadTree
    clearEntireQuadTree() {
        this.objects = [];

        // Rekurzivno počisti vse child nodes
        if (this.divided) {
            this.topRight.clear();
            this.topLeft.clear();
            this.bottomRight.clear();
            this.bottomLeft.clear();

            // Divided da spet na false
            this.divided = false;
        }
    }

    logNodeDetails(indent = 0) {
        // Create an indentation string for better readability
        const indentStr = ' '.repeat(indent);
    
        // Calculate width and depth for logging purposes
        const width = this.boundary.maxX - this.boundary.minX;
        const depth = this.boundary.maxY - this.boundary.minY;
    
        // Log the details of this node
        console.log(`${indentStr}Node: minX=${this.boundary.minX}, minY=${this.boundary.minY}, maxX=${this.boundary.maxX}, maxY=${this.boundary.maxY}, width=${width}, depth=${depth}, divided=${this.divided}, objects=${this.objects.length}`);
    
        // If the node is divided, log the details of its children
        if (this.divided) {
            this.topRight.logNodeDetails(indent + 2);
            this.topLeft.logNodeDetails(indent + 2);
            this.bottomRight.logNodeDetails(indent + 2);
            this.bottomLeft.logNodeDetails(indent + 2);
        }
    }
}

export class Rectangle {
    constructor(minX, minY, maxX, maxY) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    // Check if a 2D point is inside this rectangle
    contains(point, buffer) {
        let extendedMinX = this.minX + buffer/2;
        let extendedMinY = this.minY + buffer/2;
        let extendedMaxX = this.maxX - buffer/2;
        let extendedMaxY = this.maxY - buffer/2;

        return point.x >= extendedMinX && point.x <= extendedMaxX &&
               point.y >= extendedMinY && point.y <= extendedMaxY;
    }

    // Check if this rectangle intersects with the triangle
    intersects(triangle, buffer) {
        // Extend the rectangle boundaries by the buffer
        let extendedMinX = this.minX - buffer;
        let extendedMinY = this.minY - buffer;
        let extendedMaxX = this.maxX + buffer;
        let extendedMaxY = this.maxY + buffer;

        // Check if any of the three vertices of the triangle are inside the extended rectangle
        for (let i = 0; i < 3; i++) {
            let vertex = triangle[i];
            if (vertex.x >= extendedMinX && vertex.x <= extendedMaxX && vertex.y >= extendedMinY && vertex.y <= extendedMaxY) {
                return true;
            }
        }
        return false;
    }

    // Check if this rectangle intersects with another rectangle (boundingBox)
    intersectsRectangle(boundingBox) {
        return !(
            boundingBox.min.x > this.maxX || boundingBox.max.x < this.minX ||
            boundingBox.min.y > this.maxY || boundingBox.max.y < this.minY
        );
    }

}

