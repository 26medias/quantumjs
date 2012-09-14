var quantumString = function(ancestor, identifier) {
	this.ancestor 	= ancestor;
	this.identifier = identifier;
	this.data 		= "";
	this.strpath	= this.findStrPath(this.ancestor);
	//console.info(this.strpath);
	return this;
}
quantumString.prototype.val = function(item) {
	if (item) {
		this.data = item;
		if (this.ancestor) {
			this.ancestor.inform({
				type:		"update",
				path: 		[this.identifier],
				message:	item
			});
		}
		console.log("informing",this.strpath);
		window.Arbiter.inform(this.strpath, {
			val:	item
		});
		return this;
	} else {
		return this.data;
	}
}
quantumString.prototype.findStrPath = function(ancestor,str) {
	if (str == undefined) {
		str = this.identifier;
	}
	if (ancestor.identifier != undefined) {
		str = ancestor.identifier+"."+str;
		return this.findStrPath(ancestor.ancestor, str);
	} else {
		return str;
	}
}