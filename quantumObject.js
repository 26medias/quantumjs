var quantumObject = function(dataPath, controllerInstance) {
	
	if (dataPath == undefined) {
		this.dataPath		= [];
	} else {
		this.dataPath = dataPath
	}
	if (controllerInstance != undefined) {
		this.dataPath.unshift(controllerInstance.quantumjs.dataScope);
	}
	
	this.data 		= new Object();
	return this;
}
quantumObject.prototype.load = function(objectReference) {
	var i;
	for (i in objectReference) {
		var item = objectReference[i];
		switch (typeof(item)) {
			case "object":
				if (item instanceof Array) {
					this.set(i, new quantumArray(this.extendDataPath(i)).load(item));
					//this.data[i] = new quantumArray(this.extendDataPath(i)).load(item);
				} else {
					this.set(i, new quantumObject(this.extendDataPath(i)).load(item));
					//this.data[i] = new quantumObject(this.extendDataPath(i)).load(item);
				}
			break;
			case "string":
			case "number":
				this.set(i, new quantumString(this.extendDataPath(i)).val(item));
				//this.data[i] = new quantumString(this.extendDataPath(i)).val(item);
			break;
			default:
				// we can only monitor arrays, objects and strings
				//console.log("OOPS",typeof(item));
			break;
		}
	}
	return this;
}
quantumObject.prototype.set = function(prop, item) {
	this.data[prop] = item;
	window.Arbiter.inform(this.dataPath.join("."), {
		val:	item
	});
	window.Arbiter.inform(this.dataPath.slice(0,2).join("."), {
		action:		"update",
		dataPath:	this.dataPath
	});
	return this;
}
quantumObject.prototype.extendDataPath = function(item) {
	var clone = this.dataPath.slice();
	clone.push(item);
	return clone;
}