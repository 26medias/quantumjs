var quantumArray = function(ancestor, identifier) {
	this.token		= Math.floor((Math.random()*Math.random()*Math.random())*100000000);
	this.ancestor 	= ancestor;
	this.identifier = identifier;
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
				this.data.push(new quantumArray(this, this.data.length).load(item));
			} else {
				this.data.push(new quantumObject(this, this.data.length).load(item));
			}
		break;
		case "string":
			var qString = new quantumString(this, this.data.length);
			this.data.push(qString);
			qString.val(item);
		break;
		default:
			// we can only monitor arrays, objects and strings
		break;
	}
	if (this.ancestor != undefined) {
		this.ancestor.inform({
			type:		"push",
			path: 		[this.data.length-1,this.identifier],
			message:	item
		});
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
quantumArray.prototype.inform = function(message) {
	if (this.ancestor) {
		if (this.identifier != undefined) {
			message.path.push(this.identifier);
		}
		this.ancestor.inform(message);
	} else {
		// no ancestor. This array is not monitored
	}
	return this;
}
