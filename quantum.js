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
	var scope 					= this;
	this.dataScope				= dataScope;
	
	this.templatesForeach		= new Object();
	this.domLoops				= new Array();
	this.domroot				= $('[data-scope="'+dataScope+'"]');
	
	this.domTOC					= new Object();	// associating dataPaths with their correponding DOM elements
	
	this.listened				= new Array();	// list of nested nodes. Avoid listening to the same element's events twice or more.
	this.binded					= new Array();	// list of binded nodes. Avoid binding the same element twice or more.
	
	
	
	// create the template list, analyze and cache the loops
	this.initTemplate(this.domroot);
	
	
	// init the controller
	this.controllerPrototype 	= controllerPrototype;
	this.controllerPrototype.prototype.set = function(dataPath, value) {
		return scope.set(dataPath, value);
	};
	this.controllerPrototype.prototype.getRef = function(dataPath) {
		return scope.getRef(dataPath);
	};
	this.controllerInstance 	= new this.controllerPrototype(this);
	
	
	this.controllerInstance.init();
	
	//console.log("-------------------");
	// monitor events
	this.monitorEvents(this.domroot);
	
	// bind lone elements
	// find elements
	//console.log("scope.binded",scope.binded);

	var bindable = this.domroot.find("[data-bind]");
	for (i=0;i<bindable.length;i++) {
		if (!scope.contains(bindable[i], scope.binded)) {
			//console.log("bindable[i]",bindable[i]);
			scope.prepareDataBinding(bindable[i], {});
			/*scope.applyDataBinding({
				binding:	"val"
			});*/
		}
	}
	
};
/*
* EVENTS
*/


quantumjs.prototype.contains = function(needle, haystack) {
	var found = false;
	var i;
	var l = haystack.length;
	for (i=0;i<l;i++) {
		if ($(haystack[i]).is(needle)) {
			found = true;
		}
	}
	return found;
};

/*
* Monitor events in a given DOM node
*/
quantumjs.prototype.monitorEvents = function(domRoot, options) {
	//console.group("monitorEvents");
	//console.log("domRoot",domRoot);
	//console.info("options",options);
	//console.info("isSubLoop",isSubLoop);
	var scope = this;
	var i;
	var j;
	
	var eventItems = domRoot.find("[data-event]").map(function() {
		//console.log("parents()",$(this)," || ",$(this).parents("[data-foreach]"));
		//if ($(this).parents("[data-foreach]").length <= 2) {
			if (!scope.contains(this, scope.listened)) {
				scope.listened.push(this);
				return this;
			}
		//}
	});
	//console.log("eventItems",eventItems);
	//console.log("eventItems",eventItems);
	for (i=0;i<eventItems.length;i++) {
		var bindingEvents 		= this.toJSON($(eventItems[i]).attr("data-event"));
		//console.log("bindingEvents",bindingEvents, $(eventItems[i]));
		for (j in bindingEvents) {
			//console.log("bindingEvents",bindingEvents[j]);
			//if (this.controllerInstance[bindingEvents[j]] != undefined && typeof(this.controllerInstance[bindingEvents[j]]) == "function") {
				this.attachEvent(eventItems[i], j, bindingEvents[j], options!=undefined?options.domNodeId:undefined);
			//}
		}
	}
	//console.groupEnd();
};
/*
* Attach an event
*/
quantumjs.prototype.attachEvent = function(domElement, eventType, eventFunction, eventArgs) {
	//console.group("attachEvent");
	//console.log(domElement, eventType, eventFunction, eventArgs);
	var scope = this;
	var eventArgsObject;
	if (!eventArgs) {
		eventArgs = this.dataScope;
	}
	//console.log("eventArgs",eventArgs);
	// convert eventArgs to data if !undefined
	if (eventArgs != undefined) {
		eventArgsObject = this.getDataFromPath(eventArgs.split("."));
	}
	/*
	options = $.extend(options, {
		dataPath:	this.dataScope,
		data:		this.controllerInstance
	});*/
	$(domElement).bind(eventType, function() {
		//console.log("[event]",this, scope.getContextFor($(this).parent(), true));
		// scope.getContextFor($(this).parent(), true)
		//console.log("[event]",{el: $(domElement), dataPath: eventArgs, data:eventArgsObject});
		
		// check if parentNode is an array.
		// If it's an array, then the data and datapath can be wrong if a node has been deleted, so we need to update them
		// 1. Get parent node
		var parentNode = scope.getDataFromPath(scope.getParentPath(eventArgs).split("."));
		// 2. if it's an array, we update the path and the data
		if (parentNode instanceof Array) {
			// 3. Update the Path and the data
			eventArgs 		= scope.getContextFor($(this).parent(), true);	// get string DataPath
			eventArgsObject	= scope.getDataFromPath(eventArgs.split("."));	// get the data from the dataPath
			//console.log("[event]",{el: $(domElement), dataPath: eventArgs, data:eventArgsObject});
		}
		scope.controllerInstance[eventFunction].apply(scope.controllerInstance, [{el: $(domElement), dataPath: eventArgs, data:eventArgsObject}])
	});
	//console.log($(domElement), eventArgs, eventArgsObject);
	//console.groupEnd();
};

quantumjs.prototype.getContextFor = function(el, getPathOnly) {
	var j;
	var l = this.domTOC.length;
	for (j in this.domTOC) {
		if (el.is(this.domTOC[j])) {
			if (getPathOnly) {
				return j;		// if getPathOnly === true, then we only return the string path
			} else {
				return this.domTOC[j];	// get the dom element
			}
		}
	}
};

/*
* Search for loops and save them in a template Object
*/
quantumjs.prototype.initTemplate = function(domroot,dataPath) {
	//console.group("initTemplate()");
	//console.log(domroot,dataPath);
	var i,j;
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
			//console.log("Arbiter",data);
			switch (data.action) {
				case "update":
					//console.log("onDataUpdate",data);
					scope.onDataUpdate(data);
				break;
				case "remove":
					//console.info("*******************************************************");
					//console.log("<remove>",data);
					// getting the loop node
					var loopContainer 	= $(scope.domTOC[data.dataPath.join(".")]);	// get the loop node
					var loopChildren 	= loopContainer.children();	// get the childrens
					var deadNode 		= $(scope.domTOC[data.dataPath.join(".")+"."+data.index]);	// get the node to remove
					for (j=0;j<loopChildren.length;j++) {
						delete scope.domTOC[data.dataPath.join(".")+"."+j];	// remove all the children from the TOC
					}
					//console.debug("scope.domTOC",scope.domTOC);
					// remove the DOM node
					deadNode.remove();
					// recalculate the domPath/DOM association
					var loopChildren 	= loopContainer.children();	// get the childrens
					for (j=0;j<loopChildren.length;j++) {
						scope.domTOC[data.dataPath.join(".")+"."+j] = $(loopChildren[j]);	// rewrite the TOC
					}
					//console.debug("scope.domTOC",scope.domTOC);
					// recalculate the dataPath from the objects
					scope.recalculateDataPath(data.dataPath);
					//console.log("scope.domTOC",scope.domTOC);
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
quantumjs.prototype.recalculateDataPath = function(dataPath) {
	var i, j;
	//console.log("recalculateDataPath",dataPath);
	var data = this.getDataFromPath(dataPath);
	if (data instanceof Array) {
		//console.log("data is Array",data);
		for (i=0;i<data.length;i++) {
			var rdataPath = dataPath.slice();
			rdataPath.push(i);
			// fix dataPath
			data[i].dataPath = rdataPath;
			// recursive 
			this.recalculateDataPath(rdataPath);
		}
	} else if (typeof data == "object") {
		//console.log("data is Object",data);
		for (j in data) {
			//console.log(">>",j, data[j], data);
			var rdataPath = dataPath.slice();
			rdataPath.push(j);
			data[j].dataPath = rdataPath;
			this.recalculateDataPath(rdataPath);
		}
	}
	//console.log("data",data);
};
quantumjs.prototype.onDataUpdate = function(data) {
	var i;
	//console.group("onDataUpdate()");
	//console.dir(data);
	// check if the data exists
	var dataTree = this.getDataFromPath(data.dataPath);
	//console.log("dataTree",dataTree);
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
				//console.log("dataTree[i]",dataTree[i]);
				var domStrPath 	= this.dataPathToDomPath(dataTree[i].dataPath);	// id of the loop template: tasks
				var domNodeId	= dataTree[i].dataPath.join(".");				// id of the node itself: tasks.0
				var domTpl		= this.templatesForeach[domStrPath];
				var domData		= this.getDataFromPath(dataTree[i].dataPath);
				//console.log("domTpl", domStrPath);
				//console.log("this.domTOC["+domNodeId+"]",this.domTOC[domNodeId], dataTree[i]);
				if (this.domTOC[domNodeId] == undefined) {
					
					// create the dom node
					/*console.log("(create DOM node)", domNodeId,{
						domRoot:	data.domRoot!=undefined?data.domRoot:undefined,
						domNodeId:	domNodeId,
						domStrPath:	domStrPath,
						domTpl:		domTpl,
						domData:	domData
					});*/
					this.applyTemplate({
						domRoot:	data.domRoot!=undefined?data.domRoot:undefined,
						domNodeId:	domNodeId,
						domStrPath:	domStrPath,
						domTpl:		domTpl,
						domData:	domData
					});
				} else {
					// update the dom node
					//console.log("(update DOM node)", domNodeId, this.domTOC[domNodeId]);
				}
				
			}
		} else {
			//console.info("onDataUpdate not an array :(", data, dataTree);
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
	var domRoot 		= false;
	var domRootUpdate 	= false;
	if (options.domRoot == undefined) {
		domRoot = this.domroot.find('[data-foreach="'+options.domStrPath+'"]');
	} else {
		domRoot = options.domRoot;
	}
	
	//console.log("---domRoot",domRoot, options);
	if(options.domRoot == undefined) {
		//console.info("DomRoot is: ",this.domTOC, options.domNodeId);
		var domRootId;
		domRootId		= options.domNodeId.split(".");
		domRootId		= domRootId.slice(0, domRootId.length-1);
		domRootId		= domRootId.join(".");
		//console.log(">>>",domRootId, this.domTOC[domRootId]);
		domRootUpdate 	= this.domTOC[domRootId];
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
		// register the domRoot (to insert more data later if needed)
		var domNodeIdArray 		= options.domNodeId.split(".");
		var domRootId			= domNodeIdArray.slice(0,domNodeIdArray.length-1).join(".");
		if (domRoot.length > 0) {
			this.domTOC[domRootId] 	= domRoot;
		}
		//console.log("######### domRoot", this.domTOC, domRoot, options.domNodeId, domNodeIdArray, domRootId);
		
		//console.log(">>>> domRoot(",domRoot,")");
		
		// check if we can find dynamicaly the domRoot
		if (this.domTOC[domRootId] == undefined) {
			// go back one level
			var previousLevel 	= domRootId.split(".");
			var lastLevel		= previousLevel.slice(previousLevel.length-1)[0];
			previousLevel		= previousLevel.slice(0,previousLevel.length-1);
			previousLevel		= previousLevel.join(".");
			//console.log("##### lastLevel",lastLevel);
			//console.log("##### previousLevel",previousLevel);
			//console.log("##### this.domTOC[previousLevel]",this.domTOC[previousLevel]);
			//console.log("##### this.domTOC[previousLevel]",$(this.domTOC[previousLevel]).find('[data-foreach="'+lastLevel+'"]'));
			//console.log("######## this.domTOC[domRootId]",domRootId);
			this.domTOC[domRootId] 	= $(this.domTOC[previousLevel]).find('[data-foreach="'+lastLevel+'"]');
			domRoot					= this.domTOC[domRootId];
			//domRoot					= $(this.domTOC[previousLevel]).find('[data-foreach="'+lastLevel+'"]');
			//this.domTOC[domRoot]	= domRoot;
			//domRoot = this.domTOC[previousLevel];
			//console.log("## previousLevel",previousLevel,this.domTOC[previousLevel].find('[data-foreach="'+lastLevel+'"]'));
		}
		
		
		
		if (domRoot != false && domRoot.length > 0) {
			//console.log("UPDATE(domRoot)!!!", domRoot, domNode);
			domRoot.append(domNode);
		} else {
			if (domRootUpdate != false) {
				//console.log("UPDATE(domRootUpdate)!!!", domRootUpdate, domNode);
				domRootUpdate.append(domNode);
			}
		}
		
		this.monitorEvents(domNode, {
			domNodeId:	options.domNodeId
		});
		/*this.monitorEvents(domNode, {
			domNodeId:	this.getParentPath(options.domNodeId)
		});*/
		
		this.domTOC[options.domNodeId] = domNode;
	} else {
		// update the node
		//console.info("applyTemplate() update... (missing)");
	}
	//console.groupEnd();
}
quantumjs.prototype.getParentPath = function(datapath) {
	var pathArray 		= datapath.split(".");
	var parentPath		= pathArray.slice(0,pathArray.length-1);
	parentPath			= parentPath.join(".");
	return parentPath;
};
quantumjs.prototype.dataBind = function(options) {
	var i;
	var j;
	var k;
	var scope = this;
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
		
		this.prepareDataBinding(bindingContainers[i], {
			domData:	options.domData,
			domNodeId:	options.domNodeId
		});
		
	}
	
	// handle nested loops
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
quantumjs.prototype.prepareDataBinding = function(bindingContainer, options) {
	var i;
	var j;
	var k;
	var scope = this;
	//console.log("prepareDataBinding", bindingContainer, options);
	// make sure the element is not already binded
	if (scope.contains(bindingContainer, scope.binded)) {
		return false;
	}
	scope.binded.push(bindingContainer);
	
	var conf = this.toJSON($(bindingContainer).attr("data-bind"));
	//console.info("conf",conf, bindingContainer);
	// 1. compute the value
	// 2. check which method to apply
	
	for (j in conf) {
		var computedValue = "";
		if (conf[j] instanceof Object) {
			for (k in conf[j]) {
				// if the value is an array, then it's a function call
				if (conf[j][k] instanceof Array) {
					//console.log("computed",k, this.controllerInstance[k]);
					if (this.controllerInstance[k] instanceof Function) {
						// valid function call
						
						// this was the way I was calling, using an array of argments, but it's not practical to use it that way, since you need to know in advance the position of each argument.
						/*var args = new Array();
						for (l=0;l<conf[j][k].length;l++) {
							args.push(options.domData[conf[j][k][l]].data);
						}
						console.log("args",args);
						computedValue = this.controllerInstance[k].apply(this, [args]);*/
						
						// New way to call the computed values:
						// Creating an object, and sending the object
						var args= {};
						for (l=0;l<conf[j][k].length;l++) {
							args[conf[j][k][l]] = options.domData[conf[j][k][l]].data;
						}
						//console.log("args",args);
						computedValue = this.controllerInstance[k].call(this, args);
						
						// generate event ids based on the arguments
						// since it's a function, we need to reload if any of the argument changes
						var eventIds = new Array();
						for (l=0;l<conf[j][k].length;l++) {
							eventIds.push(options.domNodeId+"."+conf[j][k][l]);
						}
						this.applyDataBinding({
							binding:	j,
							domNode: 	$(bindingContainer),
							val:		computedValue,
							eventIds:	eventIds,
							//eventId:	options.domNodeId+"."+conf[j][k],
							func:		this.controllerInstance[k],
							args:		conf[j][k],
							domData:	options.domData
						});
						//$(bindingContainers[i]).html(computedValue);
					} else {
						// invalid function call
						console.log("dataBind() prop ",conf[j],"is a NOT a function: ",k,"(",conf[j][k],")");
						computedValue = "";
					}
				} else {
					// data-binding value
					//console.info("##",options.domData, conf[j][k]);
					computedValue = options.domData[conf[j][k]].data;
					this.applyDataBinding({
						binding:	j,
						domNode: 	$(bindingContainer),
						val:		computedValue,
						key:		k,
						eventId:	options.domNodeId+"."+conf[j][k]
					});
				}
			}
		} else {
			//console.info("STRING");
			// string
			//console.log(j,conf[j]);
			//console.log("",options.domData);
			// no domData -> out of a loop
			if (!options.domData) {
				computedValue = this.getDataFromPath(conf[j].split("."));
				this.applyDataBinding({
					binding:	j,
					domNode: 	$(bindingContainer),
					val:		computedValue,
					eventId:	conf[j]
				});
			} else {
				computedValue = this.getDataFromPath((options.domNodeId+"."+conf[j]).split("."));
				this.applyDataBinding({
					binding:	j,
					domNode: 	$(bindingContainer),
					val:		computedValue,
					eventId:	options.domNodeId+"."+conf[j]
				});
			}
			
		}
	}
};
quantumjs.prototype.applyDataBinding = function(options) {
	var i;
	var scope = this;
	//console.debug("applyDataBinding", options)
	if (options.eventIds == undefined) {
		options.eventIds = [options.eventId];
	}
	switch (options.binding) {
		case "html":
			options.domNode.html(options.val);
			for (i=0;i<options.eventIds.length;i++) {
				window.Arbiter.subscribe(options.eventIds[i], function(data) {
					var computedValue = "";
					if (options.func != undefined) {
						computedValue = scope.getComputedValue(options);
					} else {
						computedValue = data.val;
					}
					options.domNode.html(computedValue);
				});
			}
		break;
		case "attr":
			options.domNode.attr(options.key,options.val);
			
			for (i=0;i<options.eventIds.length;i++) {
				window.Arbiter.subscribe(options.eventIds[i], function(data) {
					var computedValue = "";
					if (options.func != undefined) {
						computedValue = scope.getComputedValue(options);
					} else {
						computedValue = data.val;
					}
					options.domNode.attr(options.key, computedValue);
				});
			}
		break;
		case "val":
			options.domNode.val(options.val);
			
			for (i=0;i<options.eventIds.length;i++) {
				window.Arbiter.subscribe(options.eventIds[i], function(data) {
					var computedValue = "";
					if (options.func != undefined) {
						computedValue = scope.getComputedValue(options);
					} else {
						computedValue = data.val;
					}
					options.domNode.val(computedValue);
				});
			}
		break;
		default:
			console.info("binding type (",options.binding,") is not supported");
		break;
	}
};

quantumjs.prototype.getComputedValue = function(options) {
	var i;
	// old way to call, using apply(). Switching to call()
	/*
	var args = new Array();
	for (i=0;i<options.args.length;i++) {
		args.push(options.domData[options.args[i]].data);
	}
	return options.func.apply(this, args);*/
	// new way to call the computed values, using an object and call()
	var args = {};
	for (i=0;i<options.args.length;i++) {
		//args.push(options.domData[options.args[i]].data);
		args[options.args[i]] = options.domData[options.args[i]].data;
	}
	//console.log(">>>>>>>> args",args);
	return options.func.call(this, args);
	//console.log("getComputedValue",args);
	
};

quantumjs.prototype.getDataFromPath = function(dataPath) {
	var i;	
	var val = this.controllerInstance[dataPath[1]];
	//console.log(">>>>val()",val);
	for (i=2;i<dataPath.length;i++) {
		if (val.data != undefined && val.data[dataPath[i]] != undefined) {
			val = val.data[dataPath[i]];
		} else {
			return false;
		}
	}
	if (dataPath.length==1) {
		return this.controllerInstance;
	} else {
		return val.data;
	}
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
quantumjs.prototype.set = function(dataPath, value) {
	var i;
	var dataPathArray = dataPath.slice().split(".");
	var val = this.controllerInstance[dataPathArray[1]];
	for (i=2;i<dataPathArray.length;i++) {
		if (val.data != undefined && val.data[dataPathArray[i]] != undefined) {
			val = val.data[dataPathArray[i]];
		} else {
			return false;
		}
	}
	val.val(value);
	return val;
};
quantumjs.prototype.getRef = function(dataPath) {
	var i;
	var dataPathArray = dataPath.slice().split(".");
	var val = this.controllerInstance[dataPathArray[1]];
	for (i=2;i<dataPathArray.length;i++) {
		if (val.data != undefined && val.data[dataPathArray[i]] != undefined) {
			val = val.data[dataPathArray[i]];
		} else {
			return false;
		}
	}
	return val;
};
quantumjs.prototype.replace = function(_search, _replace, _subject) {
	return _subject.replace(new RegExp(_search, 'g'),_replace);
};