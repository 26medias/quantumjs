var quantumString = function(dataPath, controllerInstance) {
	
	if (dataPath == undefined) {
		this.dataPath		= [];
	} else {
		this.dataPath = dataPath;
	}
	if (controllerInstance != undefined) {
		this.dataPath.unshift(controllerInstance.quantumjs.dataScope);
	}
	
	this.data 		= "";
	return this;
}
quantumString.prototype.val = function(item) {
	if (item) {
		this.data = item;
		console.log(" >> informing:",this.dataPath.join("."),this.dataPath);
		window.Arbiter.inform(this.dataPath.join("."), {
			action:		"val",
			val:		item
		});
		window.Arbiter.inform(this.dataPath.slice(0,2).join("."), {
			action:		"update",
			dataPath:	this.dataPath
		});
		return this;
	} else {
		return this.data;
	}
}
quantumString.prototype.extendDataPath = function(item) {
	var clone = this.dataPath.slice();
	clone.push(item);
	return clone;
}