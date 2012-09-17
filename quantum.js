/*
*	QuantumJS
*	Two way data-binding and templating
*	
*	Process
*		Check the dom template, and list all loops (data-foreach)
*		wait for an event
*		Check if the root node exists in the DOM
*		If !exists, create the dom node
*		Apply data-binding
*	
*	
*	
*/

var quantumjs = function(controllerPrototype, dataScope) {
	var i;
	var root 					= this;
	this.dataScope				= dataScope;
	
	this.templatesForeach		= new Object();
	this.domLoops				= new Array();
	this.domroot				= $('[data-scope="'+dataScope+'"]');
	
	this.domTOC					= new Object();
	
	// create the template list, analyze and cache the loops
	this.initTemplate(this.domroot);
	
	// init the controller
	this.controllerPrototype 	= controllerPrototype;
	this.controllerInstance 	= new this.controllerPrototype(this);
	this.controllerInstance.init();
	
	// monitor events
	this.monitorEvents(this.domroot);
};
/*
* EVENTS
*/

/*
* Monitor events in a given DOM node
*/
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
/*
* Attach an event
*/
quantumjs.prototype.attachEvent = function(domElement, eventType, eventFunction) {
	var scope = this;
	$(domElement).bind(eventType, function() {
		scope.controllerInstance[eventFunction].apply(scope.controllerInstance)
	});
};

/*
* Search for loops and save them in a template Object
*/
quantumjs.prototype.initTemplate = function(domroot,dataPath) {
	//console.group("initTemplate()");
	//console.log(domroot,dataPath);
	var i;
	var scope = this;
	
	if (domroot == undefined) {
		domroot = this.domroot;
	}
	if (dataPath == undefined) {
		dataPath = [];
	}
	
	var foreachLoops	= domroot.find("[data-foreach]").map(function() {
		if (dataPath.length ==0) {
			if ($(this).parents("[data-foreach]").length==0) {
				return this;
			}
		} else {
			if ($($(this).parents("[data-foreach]")[0]).is(domroot)) {
				return this;
			}
		}
	});
	//console.log("foreachLoops",foreachLoops);
	
	for (i=0;i<foreachLoops.length;i++) {
		// get loop var
		var quantumBaseName = $(foreachLoops[i]).attr("data-foreach");
		//console.log();
		var quantumVarName 	= (dataPath.length==0?"":(dataPath.join(".")+"."))+quantumBaseName;
		//if (this.controllerInstance[quantumVarName] != undefined) {
			// become the ancestor for this data, in order to receive the events
			//this.controllerInstance[quantumVarName].setAncestor(this);
			// become the identifier for this data, in order to track the data path to this var
			//this.controllerInstance[quantumVarName].setIdentifier(quantumVarName);
		//}
		// save the template
		this.templatesForeach[quantumVarName] = {
			template:	$(foreachLoops[i]).html(),
			container:	$(foreachLoops[i])
		};
		// subscribe to events
		//console.log("subscribe:",this.dataScope+"."+quantumVarName);
		window.Arbiter.subscribe(this.dataScope+"."+quantumVarName, function(data) {
			if (data.action == "update") {
				scope.onDataUpdate(data);
			}
		});
		
		
		// search for nested loops
		var nestedLoops = $(foreachLoops[i]).find("[data-foreach]");
		if (nestedLoops.length > 0) {
			var dataPathClone = dataPath.slice();
			dataPathClone.push(quantumBaseName);
			this.initTemplate($(foreachLoops[i]), dataPathClone);
		}
		
		// empty the container
		$(foreachLoops[i]).empty();
		
	}
	//console.debug("templatesForeach",this.templatesForeach);
	//console.groupEnd();
};
quantumjs.prototype.onDataUpdate = function(data) {
	var i;
	//console.group("onDataUpdate()");
	//console.dir(data);
	// check if the data exists
	var dataTree = this.getDataFromPath(data.dataPath);
	if (dataTree !== false) {
		//console.debug("onDataUpdate", dataTree);
		if (dataTree instanceof Array) {
			var dataTreeLength = dataTree.length;
			//console.log("dataTreeLength", dataTreeLength);
			//console.debug("dataTree", dataTree.slice().length);
			for (i=0;i<dataTreeLength;i++) {
				//console.log("i = ",i);
				var domStrPath 	= this.dataPathToDomPath(dataTree[i].dataPath);	// id of the loop template: tasks
				var domNodeId	= dataTree[i].dataPath.join(".");				// id of the node itself: tasks.0
				var domTpl		= this.templatesForeach[domStrPath];
				var domData		= this.getDataFromPath(dataTree[i].dataPath);
				//console.log("domTpl", domStrPath);
				//console.log("this.domTOC[domNodeId]",this.domTOC[domNodeId]);
				if (this.domTOC[domNodeId] == undefined) {
					
					// create the dom node
					//console.log("(create DOM node)", domNodeId);
					this.applyTemplate({
						domRoot:	data.domRoot!=undefined?data.domRoot:undefined,
						domNodeId:	domNodeId,
						domStrPath:	domStrPath,
						domTpl:		domTpl,
						domData:	domData
					});
				} else {
					// update the dom node
					console.log("(update DOM node)", domNodeId);
				}
				
			}
		} else {
			console.info("onDataUpdate not an array :(", data);
		}
	}
	//console.groupEnd();
	
};
quantumjs.prototype.applyTemplate = function(options) {
	//console.group("applyTemplate()");
	//console.dir(options);
	// find the right loop
	//console.debug("applyTemplate", options);
	//** /!\ ** find the domroot for nested loops 
	//var domRoot = this.findDomRoot(options.domStrPath, options.domNodeId);
	if (options.domRoot == undefined) {
		var domRoot = this.domroot.find('[data-foreach="'+options.domStrPath+'"]');
	} else {
		var domRoot = options.domRoot;
	}
	//console.log("domRoot ::", domRoot);
	if (this.domTOC[options.domNodeId] == undefined) {
		// create the node
		//console.log("creating domTOC", options.domNodeId);
		var domNode = $(options.domTpl.template);
		//console.log("domNode", domNode);
		domNode.find("[data-foreach]").empty();
		domNode = this.dataBind({
			domNode: 	domNode,			// empty loop item template
			domData:	options.domData,
			domNodeId:	options.domNodeId
		});
		//console.info("****** domNode",domNode);
		domRoot.append(domNode);
		this.domTOC[options.domNodeId] = domNode;
	} else {
		// update the node
		console.info("applyTemplate() update... (missing)");
	}
	//console.groupEnd();
}
quantumjs.prototype.dataBind = function(options) {
	var i;
	var j;
	var k;
	var domNode = options.domNode;
	//console.group("*** dataBind() ***");
	//console.debug("options", options);
	
	// search for binding containers
	
	var bindingContainers = domNode.find("[data-bind]");
	if (domNode.attr("data-bind") != undefined) {
		bindingContainers = bindingContainers.add(domNode);
	}
	for (i=0;i<bindingContainers.length;i++) {
		//console.log($(bindingContainers[i]).attr("data-bind"),this.toJSON($(bindingContainers[i]).attr("data-bind")));
		var conf = this.toJSON($(bindingContainers[i]).attr("data-bind"));
		//console.info("conf",conf);
		for (j in conf) {
			 switch (j) {
				case "attr":
					for (k in conf[j]) {
						$(bindingContainers[i]).attr(k, options.domData[conf[j][k]].data);
					}
				break;
				case "html":
					if (conf[j] instanceof Object) {
						//console.log("dataBind() prop ",conf[j],"is a function");
						// get function name
						
						for (k in conf[j]) {
							if (this.controllerInstance[k] instanceof Function) {
								//console.log("dataBind() prop ",conf[j],"is a function: ",k,"(",conf[j][k],")");
								// compute args
								var args = new Array();
								for (l=0;l<conf[j][k].length;l++) {
									args.push(options.domData[conf[j][k]].data);
								}
								var computedValue = this.controllerInstance[k].apply(this, args);
								//console.log("args",args);
								//console.log("computedValue",computedValue);
								$(bindingContainers[i]).html(computedValue);
							} else {
								//console.log("dataBind() prop ",conf[j],"is a NOT a function: ",k,"(",conf[j][k],")");
							}
						}
						
					} else {
						//console.log("dataBind() prop ",conf[j],"is *NOT* an object");
						//console.log("dataBind() prop",conf[j]," = ",options.domData[conf[j]].data);
						//console.log("###",options.domData,conf[j]);
						$(bindingContainers[i]).html(options.domData[conf[j]].data);
					}
					//
				break;
				default:
				console.log("dataBind() method "+j+" unsupported");
				break;
			}
		}
	}
	
	var nestedLoops = domNode.find("[data-foreach]");
	if (nestedLoops.length > 0) {
		// there are nested loops
		//console.log("nested loops found!", nestedLoops);
		for (i=0;i<nestedLoops.length;i++) {
			var nestedLoopId = $(nestedLoops[i]).attr("data-foreach");
			
			this.onDataUpdate({
				action:		"update",
				dataPath:	(options.domNodeId+"."+nestedLoopId).split("."),
				domRoot:	$(nestedLoops[i])
			});
		}
	}
	
	//console.groupEnd();
	return domNode;
};

quantumjs.prototype.inform = function(message) {
	/*
	if (message.type == "push") {
		//console.group("******** PUSH ********");
		//console.debug("push",message);
		//this.updateDOM(message);
		var dataName = message.path[message.path.length-1];
		if (this.templatesForeach[dataName] != undefined) {
			
			// get an instance of the quantumArray
			var dataInstance = this.controllerInstance[dataName];
			
			// check if the highest object exists
			var rootMap		= message.path.slice(message.path.length-2,message.path.length-1);
			console.log("> rootMap", rootMap, message);
			this.dataValue 	= this.parseDataPath(dataInstance,rootMap);
			console.log("> dataValue", this.dataValue);
			
			var firstChildId	= message.path[message.path.length-2];
		}
		
		//console.groupEnd();
	}
	//this.updateDOM(message);
	//console.debug("message",message);
	return this;*/
};
quantumjs.prototype.processDOM = function(domContainer, loopId, dataInstance) {
	
}
quantumjs.prototype.updateDOM = function(message) {
	//console.group("updateDOM()");
	//console.log(message);
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
				//console.log(">>>>>>>>>>>>>>> DOM EXISTS");
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
	//console.groupEnd();
	return this;
};
quantumjs.prototype.parseDom = function(options) {
	//console.group("parseDom()");
	//console.log("options", options);
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
	//console.log("databindingList", databindingList);
	for (i=0;i<databindingList.length;i++) {
		var bindingObject 		= this.toJSON($(databindingList[i]).attr("data-bind"));
		var bindingContainer	= databindingList[i];
		
		this.applyDataBinding({
			bindingObject:		bindingObject,
			bindingContainer:	bindingContainer,
			dataPath:			options.dataPath,
			qArray:				options.qArray
		});
	}
	//console.info("dom(",dom,")");
	// check if there are nested loops
	var nestedLoops = dom.find("[data-foreach]").map(function() {
		if ($(this).parents("[data-foreach]").length == 0) {
			return this;
		}
	});
	/*if (nestedLoops.length > 0) {
		
		//console.log("***",domTemplate);
		for (i=0;i<nestedLoops.length;i++) {
			//console.info("nestedLoops", nestedLoops[i]);
			var subParsed = this.parseSubDom({
				domLoop:	nestedLoops[i],
				dataPath:	options.dataPath,
				qArray:		options.qArray,
				dom:		dom
			});
			console.log("subParsed", subParsed);
		}
	}*/
	//console.log(dom);
	//console.groupEnd();
	return dom;
};
quantumjs.prototype.parseSubDom = function(options) {
	// domLoop, dataPath
	//console.group("[** nested parse **]");
	//console.log("options:",options);
	var dataPath 		= options.dataPath.slice();
	var qArray 			= (options.qArray.data[dataPath[0]]);
	dataPath 			= [$(options.domLoop).attr("data-foreach")];
	var loopId 			= options.qArray.identifier+"."+dataPath[0];
	
	var templateModel	= this.templatesForeach[loopId];
	var domTemplate = {
		template:		templateModel.template,
		container:		options.domLoop
	};
	//console.log("loopId:",loopId);
	//console.log("templateModel:",templateModel);
	//console.log("domTemplate:",domTemplate);
	/*console.log("this.parseDom:",{
		qArray:			qArray,
		domTemplate:	domTemplate,
		dataPath:		dataPath
	});
	*/
	
	//console.groupEnd();
	return this.parseDom({
		qArray:			qArray,
		domTemplate:	domTemplate,
		dataPath:		dataPath
	});
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
		console.log("subscribe: ",objectValue[propertyName].strpath);
		window.Arbiter.subscribe(objectValue[propertyName].strpath, function(data) {
			scope.applyDataStringBinding(objectValue, propertyName, data.val, outputMethod, bindingContainer, true);
		});
	}
};
quantumjs.prototype.applyDataBinding = function(options) {
	//console.log("applyDataBinding()",options);
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
					if (objectValue instanceof Array) {
						//console.log("array :(");
					} else {
						var propertyValue	= objectValue[propertyName].data;
						this.applyDataStringBinding(objectValue, propertyName, propertyValue, methods[i], options.bindingContainer);
					}
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

quantumjs.prototype.getDataFromPath = function(dataPath) {
	var i;
	var val = this.controllerInstance[dataPath[1]];
	for (i=2;i<dataPath.length;i++) {
		if (val.data != undefined && val.data[dataPath[i]] != undefined) {
			val = val.data[dataPath[i]];
		} else {
			return false;
		}
	}
	return val.data;
};
quantumjs.prototype.dataPathToDomPath = function(dataPath) {
	var i;
	var domPath = new Array();
	for (i=1;i<dataPath.length;i++) {
		if (isNaN(dataPath[i])) {
			domPath.push(dataPath[i]);
		} else {
		}
	}
	return domPath.join(".");
};

quantumjs.prototype.toJSON = function(str) {
	str = this.replace("'","\"", str);
	return JSON.parse(str);
};
quantumjs.prototype.replace = function(_search, _replace, _subject) {
	return _subject.replace(new RegExp(_search, 'g'),_replace);
};