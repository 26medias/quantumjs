/*
*	QEngine
*	Simplified Data Management
*	
*	
*/

var qengine = function(controllerInstance, data) {
	var i,j;
	var scope 					= this;
	
	this.data = data;
	
	console.info("data",data);
	
	this.controllerInstance 	= controllerInstance;
	
	this.autoIncrements 		= {};	// Keep track of the autoIncrement values
	
	// process data
	for (j in this.data.data) {
		
		switch (typeof this.data.data[j]) {
			case "object":
				if (this.data.data[j] instanceof Array) {
					// create the quantumArray
					this.controllerInstance[j] = new quantumArray([j], this.controllerInstance);
				} else {
					// create the quantumObject
					this.controllerInstance[j] = new quantumObject([j], this.controllerInstance);
				}
				// load the data
				this.controllerInstance[j].load(this.data.data[j]);
			break;
			case "string":
			case "number":
				// create the quantumString
				this.controllerInstance[j] = new quantumString([j], this.controllerInstance);
				// load the data
				this.controllerInstance[j].load(this.data.data[j]);
			break;
			default:
				// we can only monitor arrays, objects and number/strings
				//console.log("OOPS",typeof(item));
			break;
		}
		
	}
	
	/*
		create methods
		foreach array node:
			_create()
			_select()
			_remove()
	*/
	for (j in this.data.structure) {
		this.processNode(this.data.structure[j], [j]);
	}
	
};
/*
	processNode()
	Browse the data structure in search of nodes, to create the functions
	Example:
		struct = [{
			name:			"Struct Name",
			level1:	[{
				name:		"Level1 name",
				level2:		[{
					name:		"Level2 name"	
				}]
			}]
		}];
	Generated Structure:
		struct_create();
		struct_remove();
		struct_select();
		struct_save_current();
		current_struct{name:"",level1:[]}
		
		struct_level1_create();
		struct_level1_remove();
		struct_level1_select();
		struct_level1_save_current();
		current_struct_level1{name:"",level2:[]}
		
		struct_level1_level2_create();
		struct_level1_level2_remove();
		struct_level1_level2_select();
		struct_level1_level2_save_current();
		current_struct_level1_level2{name:"",level2:[]}
*/
qengine.prototype.processNode = function(node, dataPath) {
	// node:		object node, from this.data.structure
	// dataPath:	current datapath, array style
	//console.group("processNode");
	//console.log("processNode(",node,dataPath,")");
	var i, j;
	var scope = this;
	switch (typeof node) {
		case "object":
			if (node instanceof Array) {
				// prepare data
				// basename used to prefix the methods (_save(), _select(), ...)
				var basename 	= dataPath.join("_");
				// opath is the string path used to represent the object with type (array = *)
				var opath		= this.getOpath(dataPath);
				// prepare the default data
				// autoincrements values will be handled by the _create() method
				var defaultData	= {};
				for (j in node[0]) {
					if (node[0][j] instanceof Array) {
						defaultData[j] = [];	// if the node is an array, then we don't want to include the default data yet. Let's leave it as an empty array.
					} else {
						defaultData[j] = node[0][j];
					}
				}
				// _save() method
				this.controllerInstance[basename+"_create"] = function(data) {
					//console.log("_create",data);
					// get parent node
					var parentNode 	= scope.controllerInstance.quantumjs.getDataFromPath(data.dataPath.split("."));
					// get current node, on which we need to push
					var node 		= parentNode[dataPath[dataPath.length-1]];
					
					// Do we need an autoincrement?
					// First, get the oPath (string path, encoding array structure using *: groups*.specs*) which is used to describe which fields are autoincremented
					var opath		= scope.getOpath(dataPath);
					// search if we have an autoIncrement value in the options
					//console.log("opath",opath, scope.data.options.autoincrements);
					for (j in defaultData) {	// for each field in the default data
						var isAutoIncrement = scope.str_contains(opath+"."+j, scope.data.options.autoincrements);	// create the oPath for this field and check if it's in the list of autoincremented fields
						if (isAutoIncrement) {
							// get the max value
							var max = 0;
							for (i=0;i<node.data.length;i++) {
								if (node.data[i].data[j].data > max) {
									max = node.data[i].data[j].data;
								}
							}
							//console.log("max >> ",max);
							defaultData[j] = max+1;	// increment the field in the default data
						}
					}
					
					//console.log(">",parentNode, node);
					// push the default data
					node.push(defaultData);
					//@todo: manage autoincrements
				};
				// _remove method();
				this.controllerInstance[basename+"_remove"] = function(data) {
					//console.log("remove >> ",basename+"_remove", data);
					//scope.controllerInstance.quantumjs.getContextFor(data.el.parent())
					//console.log("real Datapath",scope.controllerInstance.quantumjs.getContextFor(data.el.parent(), true).split("."));
					var objDataPath = scope.controllerInstance.quantumjs.getContextFor(data.el.parent(), true).split(".");
					//var objDataPath = data.dataPath.split(".");
					var parentObjDataPath = objDataPath.slice(0, objDataPath.length-2);
					//console.log("dataPaths",objDataPath, parentObjDataPath);
					// get parent node
					var parentNode 	= scope.controllerInstance.quantumjs.getDataFromPath(parentObjDataPath);
					//console.log("parentNode",parentNode);
					// get current node, on which we need to push
					var node 		= parentNode[dataPath[dataPath.length-1]];
					//console.log("node",node);
					// push the default data
					//console.log("Remove << ",objDataPath[objDataPath.length-1]);
					node.remove(objDataPath[objDataPath.length-1]);
					//node.remove(scope.controllerInstance.quantumjs.getContextFor(data.el.parent(), true).split("."));
					//console.log("args",scope.controllerInstance.quantumjs.getContextFor(data.el.parent(), true).split("."), objDataPath[objDataPath.length-1]);
					//@todo: manage autoincrements
				};
				//console.log("controllerInstance",this.controllerInstance);
				// search for subnode
				// process subnode
				for (j in node[0]) {
					if (node[0][j] instanceof Array) {
						var newDataPath = dataPath.slice();
						newDataPath.push(j);
						this.processNode(node[0][j], newDataPath);	// deactivated during the tests on the first level
					}
				}
			} else {
				// no method for objects
			}
		break;
		case "string":
		case "number":
			// no method for numbers and strings
		break;
		default:
			// we can only process arrays, objects and number/strings
		break;
	}
	//console.groupEnd();
};

qengine.prototype.getOpath = function(dataPath, currentPath, dataNode) {
	// dataPath:		current dataPath (as an array)
	// currentPath:		current oPath, building a new level on each recursive call of the function
	// dataNode:		current dataNode (on the data structure from this.data.structure)
	
	var i, j;
	// if dataPath.length == 0, then we reached the end ofg the datapath, so we can return the oPath
	if (dataPath.length == 0) {
		return currentPath.join(".");
	}
	if (!currentPath) {
		currentPath = [];
	}
	if (!dataNode) {
		dataNode = this.data.structure;
	}
	//console.info("getOpath()", dataPath, currentPath, dataNode);
	if (dataNode[dataPath[0]] instanceof Array) {
		currentPath.push(dataPath[0]+"*");	// mark Array with a *
	} else {
		currentPath.push(dataPath[0]);
	}
	// move inside the dataNode
	dataNode = dataNode[dataPath[0]];
	// loop
	return this.getOpath(dataPath.slice(1), currentPath, dataNode[0]);
};

qengine.prototype.getAutoIncrementValue = function(opath) {
	// opath:		Current oPath, as a string or an array (converted to an array in the function)
	var i, j;
	// split the opath in an array (easier to manipulate)
	if (typeof opath == "string") {
		opath = opath.split(".");
	}
	if (opath[0].substr(-1, 1) == "*") { // the current node is an array
		
	} else {	// current node is not an array
		
	}
	console.log("getAutoIncrementValue()",opath);
};
qengine.prototype.contains = function(needle, haystack) {
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

qengine.prototype.str_contains = function(needle, haystack) {
	var found = false;
	var i;
	var l = haystack.length;
	for (i=0;i<l;i++) {
		if (haystack[i] == needle) {
			found = true;
		}
	}
	return found;
};