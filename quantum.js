
var quantumjs = function(controllerPrototype, dataScope) {
	var root 					= this;
	this.dataScope				= dataScope;
	
	this.controllerPrototype 	= controllerPrototype;
	this.controllerInstance 	= new this.controllerPrototype();
	
	this.templatesForeach		= new Object();
	this.domLoops				= new Array();
	this.domroot				= $('[data-scope="'+dataScope+'"]');
	
};
quantumjs.prototype.loadQuantumObject = function(objectName, objectReference) {
	this.controllerInstance[objectName].load(objectReference);
};
quantumjs.prototype.loadQuantumArray = function(objectName, objectReference) {
	this.controllerInstance[objectName].load(objectReference);
};
quantumjs.prototype.monitor = function() {
	var i;
	// search for loops
	var foreachLoops	= this.domroot.find("[data-foreach]");
	
	for (i=0;i<foreachLoops.length;i++) {
		// get loop var
		var quantumVarName = $(foreachLoops[i]).attr("data-foreach");
		// become the ancestor for this data, in order to receive the events
		this.controllerInstance[quantumVarName].setAncestor(this);
		// become the identifier for this data, in order to track the data path to this var
		this.controllerInstance[quantumVarName].setIdentifier(quantumVarName);
		// save the template
		this.templatesForeach[quantumVarName] = {
			template:	$(foreachLoops[i]).html(),
			container:	$(foreachLoops[i])
		};
		// empty the container
		$(foreachLoops[i]).empty();
	}
};
quantumjs.prototype.inform = function(message) {
	
	if (message.type == "push") {
		//console.log(message);
		this.updateDOM(message);
	}
	//this.updateDOM(message);
	return this;
};
quantumjs.prototype.updateDOM = function(message) {
	// get data array name
	var dataName = message.path[message.path.length-1];
	// check if the data array exists
	if (this.templatesForeach[dataName] != undefined) {
		// get an instance of the quantumArray
		var dataInstance = this.controllerInstance[dataName];
		//console.log(dataInstance, message);
		// check if we already built the dom node
		var firstChildId	= message.path[message.path.length-2];
		// check if the loop item already exists in the DOM
		if (this.domLoops[firstChildId] != undefined) {
			
		} else {
			// register the loop item
			var parsedDOM				= this.parseDom({
				qArray:			dataInstance,
				domTemplate:	this.templatesForeach[dataName],
				dataPath:		message.path.slice(0,message.path.length-1)
			});
			console.log("parsedDOM: ",parsedDOM, this.templatesForeach[dataName].container);
			this.domLoops[firstChildId] = parsedDOM;
			this.templatesForeach[dataName].container.append(this.domLoops[firstChildId]);
			//this.domLoops[firstChildId] = this.parseDom(dataInstance, this.templatesForeach[dataName], message, message.path.slice(0,message.path.length-1));
			//this.domLoops[firstChildId].container.append(this.domLoops[firstChildId].template);
		}
	}
	return this;
};
quantumjs.prototype.parseDom = function(options) {
	
	
	var i;
	var dom 				= $(options.domTemplate.template);
	//console.log("dom before",dom);
	// find data-binding delarations
	var databindingList 	= dom.find("[data-bind]");
	for (i=0;i<databindingList.length;i++) {
		var bindingObject 		= this.toJSON($(databindingList[i]).attr("data-bind"));
		var bindingContainer	= databindingList[i];
		
		var parsedDom = this.applyDataBinding({
			bindingObject:		bindingObject,
			bindingContainer:	bindingContainer,
			dataPath:			options.dataPath,
			qArray:				options.qArray
		});
	}
	
	return dom;
};
quantumjs.prototype.applyDataBinding = function(options) {
	var i;
	var methods		= ["html","value"];
	for (i=0;i<methods.length;i++) {
		if (options.bindingObject[methods[i]] != undefined) {
			if (typeof(options.bindingObject[methods[i]]) == "string") {
				// get the value
				var objectValue 	= this.parseDataPath(options.qArray, options.dataPath);
				var propertyName 	= options.bindingObject[methods[i]];
				var propertyValue	= objectValue[propertyName].data;
				switch(methods[i]) {
					case "html":
					$(options.bindingContainer).html(propertyValue);
					break;
					case "value":
					$(options.bindingContainer).val(propertyValue);
					break;
				}
				
			} else {
				// function call
				var j;
				var bindingData = options.bindingObject[methods[i]];
				for (j in bindingData) {
					if (this.controllerInstance[j] != undefined) {
						console.log("calling '",j,"'");
						// create argument list
						var args = new Array();
						var k;
						for (k=0;k<bindingData[j].length;k++) {
							args.push(this.parseDataPath(options.qArray, options.dataPath)[bindingData[j][k]].data);
						}
						var computedValue = this.controllerInstance[j].apply(this, args);
						switch(methods[i]) {
							case "html":
							$(options.bindingContainer).html(computedValue);
							break;
							case "value":
							$(options.bindingContainer).val(computedValue);
							break;
						}
					} else {
						// unknown function call :(
						console.log("call to unknown '",j,"'");
					}
				}
			}
		}
	}
	return $(options.bindingContainer);
};

quantumjs.prototype.parseDataPath = function(qObject, dataPath) {
	var i;
	var val = qObject;
	for (i=dataPath.length-1;i>=0;i--) {
		val = val.data[dataPath[i]];
	}
	return val.data;
};
quantumjs.prototype.parseDom2 = function(localScope, templateObject, message, path) {
	var i;
	var dom = $(templateObject.template);
	//console.log(localScope, templateObject);
	
	// find data-binding delarations
	var databindingList = dom.find("[data-bind]");
	for (i=0;i<databindingList.length;i++) {
		var bindingObject = this.toJSON($(databindingList[i]).attr("data-bind"));
		this.applyDataBinding("html",bindingObject,dom,localScope,message,path);
		
	}
	
	return templateObject;
};
quantumjs.prototype.applyDataBinding2 = function(outputMethod, bindingObject, dom, localScope, message, path) {
	if (bindingObject[outputMethod] != undefined) {
		if (typeof(bindingObject[outputMethod]) == "string") {
			// string
			//console.log("binding string for ",outputMethod," on ",localScope);
			//console.log(">>>> ", localScope.data[]);
			//console.log(outputMethod, bindingObject, dom, localScope, message, path);
			//console.info(localScope.data, path[path.length-1], bindingObject[outputMethod]);
		} else {
			
		}
	}
};
quantumjs.prototype.toJSON = function(str) {
	str = this.replace("'","\"", str);
	return JSON.parse(str);
};
quantumjs.prototype.replace = function(_search, _replace, _subject) {
	return _subject.replace(new RegExp(_search, 'g'),_replace);
};