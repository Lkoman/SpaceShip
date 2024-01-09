export class Wall {
    constructor(leftUp, leftDown, rightUp, rightDown, height) {
      this.leftUp = leftUp;
      this.leftDown = leftDown;
      this.rightUp = rightUp;
      this.rightDown = rightDown;
      this.height = height;
    }
  
    // Method to calculate the bounding box for the wall
    getBoundingBox() {
        const minX = Math.min(this.leftUp[0], this.leftDown[0], this.rightUp[0], this.rightDown[0]);
        const maxX = Math.max(this.leftUp[0], this.leftDown[0], this.rightUp[0], this.rightDown[0]);

        // Since we are ignoring the Z-axis (height), we focus on the Y-axis (index 2)
        const minY = Math.min(this.leftUp[2], this.leftDown[2], this.rightUp[2], this.rightDown[2]);
        const maxY = Math.max(this.leftUp[2], this.leftDown[2], this.rightUp[2], this.rightDown[2]);
        
        return { min: [minX, null, minY], max: [maxX, null, maxY] };
    }
}
