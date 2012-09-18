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
			switch (data.action) {
				case "update":
					scope.onDataUpdate(data);
				break;
				case "val":
					//scope.onDataUpdate(data);
					console.log("val?=",data.val);
				break;
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
	//if (data.dataPath) {
	//	console.log("data",data.dataPath.join("."), dataTree);
	//}
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
			console.info("onDataUpdate not an array :(", data, dataTree);
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
		//console.info("applyTemplate() update... (missing)");
	}
	//console.groupEnd();
}
quantumjs.prototype.handleSubscription = function(subscriptionId, domNode, callbackMethod) {
	window.Arbiter.subscribe(subscriptionId, function(data) {
		
		domNode[dataMethod](k, data.val);
	});
};
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
						(function(eventId, domNode,attrName,data) {
							window.Arbiter.subscribe(eventId, function(data) {
								domNode.attr(attrName, data.val);
							});
						})(options.domNodeId+"."+conf[j][k], $(bindingContainers[i]), k);
						
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
								
								/*(function(eventId, domNode,attrName,data) {
									window.Arbiter.subscribe(eventId, function(data) {
										domNode.html(data.val);
									});
								})(options.domNodeId+"."+conf[j], $(bindingContainers[i]));
								*/
							} else {
								//console.log("dataBind() prop ",conf[j],"is a NOT a function: ",k,"(",conf[j][k],")");
							}
						}
						
					} else {
						(function(eventId, domNode,attrName,data) {
							window.Arbiter.subscribe(eventId, function(data) {
								domNode.html(data.val);
							});
						})(options.domNodeId+"."+conf[j], $(bindingContainers[i]));
						
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