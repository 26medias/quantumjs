var quantumArray = function(dataPath, controllerInstance) {
	//console.log("quantumArray",dataPath);
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
		case "number":
			this.data.push(new quantumString(this.extendDataPath(this.data.length)).val(item));
		break;
		default:
			// we can only monitor arrays, objects and strings
			//console.log("OOPS",typeof(item));
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
quantumArray.prototype.remove = function(idx) {
	var i;
	this.data.splice(idx,1);
	/*window.Arbiter.inform(this.dataPath.join("."), {
		val:	this.data
	});*/
	console.log("remove()",this.dataPath);
	window.Arbiter.inform(this.dataPath.slice(0,2).join("."), {
		action:		"remove",
		index:		idx,
		dataPath:	this.dataPath
	});
	/*window.Arbiter.inform(this.dataPath.slice(0,2).join("."), {
		action:		"update",
		dataPath:	this.dataPath
	});*/
}
quantumArray.prototype.extendDataPath = function(item) {
	var clone = this.dataPath.slice();
	clone.push(item);
	return clone;
}
quantumArray.prototype.search = function(q) {
	var i, j;
	for (i=0;i<this.data.length;i++) {
		//console.log(">",this.data[i]);
		var lineFlag = true;
		for (j in q) {
			if (this.data[i].data[j].data != q[j]) {
				lineFlag = false;
			}
		}
		if (lineFlag) {
			return {
				index:	i,
				data:	this.data[i].data
			};
		}
	}
}