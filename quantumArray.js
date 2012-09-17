var quantumArray = function(dataPath, controllerInstance) {
	if (dataPath == undefined) {
		this.dataPath		= [];
	} else {
		this.dataPath = dataPath
	}
	if (controllerInstance != undefined) {
		this.dataPath.unshift(controllerInstance.quantumjs.dataScope);
	}
	
	this.data 		= new Array();
	return this;
}
quantumArray.prototype.load = function(objectReference) {
	var len = objectReference.length;
	var i;
	for (i=0;i<len;i++) {
		this.push(objectReference[i]);
	}
	return this;
}
quantumArray.prototype.push = function(item) {
	switch (typeof(item)) {
		case "object":
			if (item instanceof Array) {
				this.data.push(new quantumArray(this.extendDataPath(this.data.length)).load(item));
			} else {
				this.data.push(new quantumObject(this.extendDataPath(this.data.length)).load(item));
			}
		break;
		case "string":
			this.data.push(new quantumString(this.extendDataPath(this.data.length)).val(item));
		break;
		default:
			// we can only monitor arrays, objects and strings
		break;
	}
	window.Arbiter.inform(this.dataPath.join("."), {
		val:	item
	});
	window.Arbiter.inform(this.dataPath.slice(0,2).join("."), {
		action:		"update",
		dataPath:	this.dataPath
	});
	return this;
}
quantumArray.prototype.extendDataPath = function(item) {
	var clone = this.dataPath.slice();
	clone.push(item);
	return clone;
}