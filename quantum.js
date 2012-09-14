console.debug = function(label, data) {
	console.group(label);
	console.dir(data);
	console.groupEnd();
};
var quantumjs = function(controllerPrototype, dataScope) {
	var i;
	var root 					= this;
	this.dataScope				= dataScope;
	
	this.controllerPrototype 	= controllerPrototype;
	this.controllerInstance 	= new this.controllerPrototype();
	
	this.templatesForeach		= new Object();
	this.domLoops				= new Array();
	this.domroot				= $('[data-scope="'+dataScope+'"]');
	
	this.monitorEvents(this.domroot);
};
quantumjs.prototype.loadQuantumObject = function(objectName, objectReference) {
	this.controllerInstance[objectName].load(objectReference);
};
quantumjs.prototype.loadQuantumArray = function(objectName, objectReference) {
	this.controllerInstance[objectName].load(objectReference);
};
quantumjs.prototype.monitorEvents = function(domRoot) {
	var i;
	var j;
	var eventItems = domRoot.find("[data-event]").map(function() {
		if ($(this).parents("[data-foreach]").length==0) {
			return this;
		}
	});
	for (i=0;i<eventItems.length;i++) {
		var bindingEvents 		= this.toJSON($(eventItems[i]).attr("data-event"));
		for (j in bindingEvents) {
			if (this.controllerInstance[bindingEvents[j]] != undefined && typeof(this.controllerInstance[bindingEvents[j]]) == "function") {
				this.attachEvent(eventItems[i], j, bindingEvents[j]);
			}
		}
	}
};
quantumjs.prototype.attachEvent = function(domElement, eventType, eventFunction) {
	var scope = this;
	$(domElement).bind(eventType, function() {
		scope.controllerInstance[eventFunction].apply(scope.controllerInstance)
	});
};
quantumjs.prototype.monitor = function() {
	var i;
	// search for loops
	var foreachLoops	= this.domroot.find("[data-foreach]").map(function() {
		if ($(this).parents("[data-foreach]").length==0) {
			return this;
		}
	});
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
	
	/*if (message.type == "push") {
		//console.group("******** PUSH ********");
		//console.debug("push",message);
		this.updateDOM(message);
		//console.groupEnd();
	}*/
	this.updateDOM(message);
	//console.debug("message",message);
	return this;
};
quantumjs.prototype.updateDOM = function(message) {
	// get data array name
	var dataName = message.path[message.path.length-1];
	// check if the data array exists
	if (this.templatesForeach[dataName] != undefined) {
		// get an instance of the quantumArray
		var dataInstance = this.controllerInstance[dataName];
		
		// check if the highest object exists
		var rootMap		= message.path.slice(message.path.length-2,message.path.length-1);
		this.dataValue 	= this.parseDataPath(dataInstance,rootMap);
		/*console.debug("datapath", {
			dataInstance:this.cloneObject(dataInstance),
			dataValue: 	this.cloneObject(this.dataValue),
			map:		rootMap
		});*/
		
		// check if we already built the dom node
		var firstChildId	= message.path[message.path.length-2];
		
		// check if the loop item already exists in the DOM
		if (this.dataValue !== false) {
			if (this.domLoops[firstChildId] != undefined) {
				// dom loop already exists
				// Arbiter Events are taking care of updating the data
				console.log(">>>>>>>>>>>>>>> DOM EXISTS");
			} else {
				// register the loop item
				/*console.debug("parsedDOM", {
					qArray:			dataInstance,
					domTemplate:	this.templatesForeach[dataName],
					dataPath:		message.path.slice(0,message.path.length-1)
				});*/
				var parsedDOM				= this.parseDom({
					qArray:			dataInstance,
					domTemplate:	this.templatesForeach[dataName],
					dataPath:		message.path.slice(0,message.path.length-1)
				});
				//console.log("!parsedDOM passed", parsedDOM);
				
				this.domLoops[firstChildId] = parsedDOM;
				this.templatesForeach[dataName].container.append(this.domLoops[firstChildId]);
			}
		}
	}
	return this;
};
quantumjs.prototype.parseDom = function(options) {
	
	var i;
	var dom 				= $(options.domTemplate.template);
	//console.log("dom before",dom);
	// find data-binding delarations
	var databindingList 	= dom.find("[data-bind]").map(function() {
		// data-foreach should not appear in the parent dom, as the template is the data-foreach's child, and therefor should not appear int he dom
		if ($(this).closest("[data-foreach]").length == 0) {
			return this;
		}
	});
	console.log("databindingList", databindingList);
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
quantumjs.prototype.applyDataStringBinding = function(objectValue, propertyName, propertyValue, outputMethod, bindingContainer, skipSubscribe) {
	var scope = this;
	if (objectValue != undefined && objectValue != "") {
		switch(outputMethod) {
			case "html":
			$(bindingContainer).html(propertyValue);
			break;
			case "value":
			$(bindingContainer).val(propertyValue);
			break;
		}
	}
	if (skipSubscribe !== true) {
		window.Arbiter.subscribe(objectValue[propertyName].strpath, function(data) {
			scope.applyDataStringBinding(objectValue, propertyName, data.val, outputMethod, bindingContainer, true);
		});
	}
};
quantumjs.prototype.applyDataBinding = function(options) {
	var scope = this;
	var i;
	var methods		= ["html","value"];
	for (i=0;i<methods.length;i++) {
		if (options.bindingObject[methods[i]] != undefined) {
			if (typeof(options.bindingObject[methods[i]]) == "string") {
				// get the value
				var objectValue 	= this.parseDataPath(options.qArray, options.dataPath);
				var propertyName 	= options.bindingObject[methods[i]];
				if (objectValue != undefined && objectValue != "") {
					var propertyValue	= objectValue[propertyName].data;
					this.applyDataStringBinding(objectValue, propertyName, propertyValue, methods[i], options.bindingContainer);
				}
				//**
				
				
			} else {
				// function call
				var j;
				var bindingData = options.bindingObject[methods[i]];
				for (j in bindingData) {
					if (this.controllerInstance[j] != undefined) {
						//console.log("calling '",j,"'");
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

quantumjs.prototype.cloneObject = function(obj) {
	return $.extend({},{data:obj}).data;
}

quantumjs.prototype.parseDataPath = function(qObject, dataPath) {
	var i;
	var val = qObject;
	for (i=dataPath.length-1;i>=0;i--) {
		if (val.data != undefined && val.data[dataPath[i]] != undefined) {
			val = val.data[dataPath[i]];
		} else {
			return false;
		}
	}
	return val.data;
};

quantumjs.prototype.toJSON = function(str) {
	str = this.replace("'","\"", str);
	return JSON.parse(str);
};
quantumjs.prototype.replace = function(_search, _replace, _subject) {
	return _subject.replace(new RegExp(_search, 'g'),_replace);
};