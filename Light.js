export class Light
{
	constructor ({
		color = [1.0, 1.0, 1.0,1.0],
	
		ambient = 0,
		shininess = 0,} = {}) {
		this.color = color;
		this.ambient = ambient;
		this.shininess = shininess;
	}
}