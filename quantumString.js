var quantumString = function(ancestor, identifier) {
	this.ancestor 	= ancestor;
	this.identifier = identifier;
	this.data 		= "";
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
		return this;
	} else {
		return this.data;
	}
}
