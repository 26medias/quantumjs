var quantumObject = function(ancestor, identifier) {
	this.ancestor 	= ancestor;
	this.identifier = identifier;
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
					this.data[i] = new quantumArray(this, i).load(item);
				} else {
					this.data[i] = new quantumObject(this, i).load(item);
				}
			break;
			case "string":
				this.data[i] = new quantumString(this, i).val(item)
			break;
			default:
				// we can only monitor arrays, objects and strings
			break;
		}
	}
	return this;
}
quantumArray.prototype.setAncestor = function(ancestor) {
	this.ancestor 	= ancestor;
	return this;
}
quantumArray.prototype.setIdentifier = function(identifier) {
	this.identifier 	= identifier;
	return this;
}
quantumObject.prototype.inform = function(message) {
	if (this.ancestor) {
		if (this.identifier != undefined) {
			message.path.push(this.identifier);
		}
		this.ancestor.inform(message);
	} else {
		// no ancestor. This object is not monitored
	}
	return this;
}
