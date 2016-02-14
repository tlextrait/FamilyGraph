/*
Copyright (c) 2016 Thomas Lextrait

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to use, 
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the 
Software, and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION 
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*
person {
	id: UUID 			(required)
	firstname: string
	lastname: string
	fullname: string
	generation: int 	(default: 0)
	gender: char
	father: UUID
	mother: UUID
	spouse: UUID
	children: UUID[]
}

node {
	personId: UUID
	x: int	(pixels)
	y: int	(pixels)
}

hub {
	topNodes: UUID		(person id)
	bottomNodes: UUID	(person id)
}
*/

var Family = {

	_data: [
		{"id":"1234567890","firstname":"John","lastname":"Doe","gender":"M","father":null,"mother":null},
		{"id":"1234567891","firstname":"Patricia","lastname":"Doe","gender":"F","father":null,"mother":null},
		{"id":"1234567892","firstname":"Stella","lastname":"Doe","gender":"F","father":"1234567890","mother":"1234567891"},
		{"id":"1234567893","firstname":"James","lastname":"Doe","gender":"M","father":"1234567890","mother":"1234567891"}
	],
	_persons: null,
	_personIndex: null,
	_generationIndex: null,	// array of arrays of indices in _persons[]
	_hubs: null,
	_nodes: null,
	_nodeIndex: null,
	_container: null,
	_config: {
		containerPadding: 20,
		personWidth: 150,
		personMargin: 9,	// an odd number is better if lineThickness is odd
		personHeight: 22,
		hubMargin: 2,
		lineThickness: 1,
		generationSpacing: null, // calculated
		standardPropertyNames: ['id','firstname','lastname','gender','father','mother','x','y','node1','node2','personId','generation','fullname','spouse','children']
	},

	load: function(container) {
		this._container = $(container);
		this._prepareConfig();
		this._preparePersons();

		this._checkOrphans();

		this._resolveSpouses();
		this._prepareGenerations();

		this._prepareNodes();
		this._prepareHubs();

		this._drawHubs();
		this._drawNodes();
	},

	_prepareConfig: function(){
		this._config.generationSpacing = this._config.personMargin + 
			2 * this._config.hubMargin + this._config.lineThickness;
	},

	_preparePersons: function(){
		// Prepare persons from data
		this._persons = [];
		$.each(this._data, function(index, data){
			var person = Family._newPersonObject(data);
			Family._persons.push(person);
		});

		// Index persons
		this._personIndex = [];
		$.each(this._persons, function(index, person){
			Family._personIndex[person.id] = index;
		});
	},

	/**
	* Checks that every person's parents exist
	* Note: must run only after persons have been indexed
	*/
	_checkOrphans: function(){
		if(this._personIndex.length <= 0){
			throw new Error("Can't check for orphans before person index is built.");
		}

		var orphaned = [];
		for(var i = 0; i < this._persons.length; i++){
			var p = this._persons[i];
			if(!p.hasValidParents()){
				orphaned.push(i);
			}
		}

		// @TODO REMOVE ORPHANS FROM _PERSONS HERE
		// THEN REBUILD INDEX AND START OVER

		if(orphaned.length > 0){
			throw new Error("Found " + orphaned.length + " orphans");
		}
	},

	_resolveSpouses: function(){
		var resolved = [];
		// Find people who have both a father and mother
		for(var i = 0; i < this._persons.length; i++){
			var person = this._persons[i];
			if(resolved[person.id] === true) continue;
			resolved[person.id] = true;

			if(person.father != null && person.mother != null){
				var f = this._getPersonByUUID(person.father);
				var m = this._getPersonByUUID(person.mother);
				f.spouse = m.id;
				m.spouse = f.id;
				this._updatePerson(f);
				this._updatePerson(m);
				resolved.push(f.id)
			}
		}
	},

	_prepareGenerations: function(){

		var indexed = []; // array of person indices already generation-indexed

		// Generation 0
		// find persons with no parents
		this._generationIndex = [];
		var gen0 = [];
		for(var i = 0; i < this._persons.length; i++){
			var p = this._persons[i];
			if(p.hasNoParents()){
				gen0.push(i);		// add to generation 0
				indexed.push(i);	// mark as indexed
				p.generation = 0;
				this._updatePerson(p);
			}
		}
		// @TODO sort gen0 so spouses are together and male on the left
		this._generationIndex[0] = gen0;

		// Build next generations
		// note: won't loop forever since there can be no orphans
		var maxGen = 100;
		var genCounter = 1;
		while(indexed.length < this._persons.length && genCounter < maxGen){
			var cGen = [];	// array of persons in current gen
			var personCountPrevGen = this._generationIndex[genCounter-1].length;

			for(var i = 0; i < this._persons.length; i++){
				if(indexed.indexOf(i) >= 0) continue; // already indexed
				var cPerson = this._persons[i];
				for(var a = 0; a < personCountPrevGen; a++){
					var cParent = this._getPersonByIndex(a);
					if(cPerson.hasParent(cParent.id)){
						cGen.push(i);
						indexed.push(i);
						cPerson.generation = genCounter;
						this._updatePerson(cPerson);
						cParent.children.push(cPerson.id);
						this._updatePerson(cParent);
						break;
					}
				}
			}
			this._generationIndex[genCounter] = cGen;
			genCounter++;
		}
		if(genCounter == maxGen - 1){
			throw new Error("Error while indexing generations, some persons may be orphaned.");
		}
	},

	_prepareNodes: function(){
		this._nodes = [];
		// loop through generations
		for(var gen = 0; gen < this._generationIndex.length; gen++){
			// loop through people in this gen
			for(var pi = 0; pi < this._generationIndex[gen].length; pi++){
				var x = this._config.containerPadding + 
					pi * (this._config.personWidth + this._config.personMargin);
				var y = this._config.containerPadding +
					gen * (this._config.personHeight + this._config.generationSpacing);
				var index = this._generationIndex[gen][pi];
				var person = this._getPersonByIndex(index);
				var node = this._newNodeObject(x, y, person.id);
				this._nodes.push(node);
			}
		}

		// Index nodes
		this._nodeIndex = [];
		$.each(this._nodes, function(index, node){
			Family._nodeIndex[node.personId] = index;
		});
	},

	_prepareHubs: function(){
		this._hubs = [];
		for(var i = 0; i < this._persons.length; i++){
			var p = this._persons[i];
			if(p.hasChildren() && (p.gender == "M" || p.spouse == null)){
				var hub = this._newHubObject([p.id], p.children);
				if(p.spouse != null){
					hub.topNodes.push(p.spouse);
				}
				this._hubs.push(hub);
				console.log(hub);
			}
		}
	},

	_drawHubs: function(){
		$.each(this._hubs, function(index, hub){
			var leftNode = hub.getLeftMostNode();
			var rightNode = hub.getRightMostNode();

			// Connect top nodes
			var ty = Family._getNodeForPerson(hub.topNodes[0]).y + Family._config.personHeight / 2;
			var tx1 = Family._getNodeForPerson(hub.topNodes[0]).x + Family._config.personWidth / 2;
			var tx2 = Family._getNodeForPerson(hub.topNodes[1]).x + Family._config.personWidth / 2;
			Family._drawLine(tx1, ty, tx2, ty);

			// Horizontal line
			var hz_y = Family._getNodeForPerson(hub.topNodes[0]).y + Family._config.personHeight + Family._config.generationSpacing / 2;
			var hz_x1 = leftNode.x + Family._config.personWidth / 2;
			var hz_x2 = rightNode.x + Family._config.personWidth / 2;
			Family._drawLine(hz_x1, hz_y, hz_x2, hz_y);

			// Top nodes vertical
			var tnvx = Family._getNodeForPerson(hub.topNodes[0]).x + Family._config.personWidth + Family._config.personMargin / 2;
			Family._drawLine(tnvx, ty, tnvx, hz_y);

			// Connect bottom nodes
			for(var b = 0; b < hub.bottomNodes.length; b++){
				var node = Family._getNodeForPerson(hub.bottomNodes[b]);
				var n_x = node.x + Family._config.personWidth / 2;
				var n_y = node.y + Family._config.personHeight / 2;
				Family._drawLine(n_x, hz_y, n_x, n_y);
			}
		});
	},

	_drawNodes: function(){
		$.each(this._nodes, function(index, node){
			var person = Family._getPersonByUUID(node.personId);
			var nodeElement = Family._newNodeElement(node.x, node.y, person.fullname);
			Family._container.append(nodeElement);
		});
	},

	_newNodeElement: function(x, y, text){
		return $("<div></div>")
			.addClass("panel panel-default")
			.text(text)
			.css({
				"top":y+"px",
				"left":x+"px",
				"position":"absolute",
				"width":"150px",
				"text-align":"center"
			});
	},

	_newNodeObject: function(x, y, personId){
		return { 
			x: x, 
			y: y, 
			personId: personId 
		};
	},

	_newPersonObject: function(data){
		var person = data;
		person.fullname = data.firstname + " " + data.lastname;
		person.generation = null;
		person.children = [];
		person.spouse = null;
		person.getSpouse = function(){
			return Family._getPersonByUUID(this.spouse);
		};
		person.getFather = function(){
			return Family._getPersonByUUID(this.father);
		};
		person.getMother = function(){
			return Family._getMotherByUUID(this.mother);
		};
		person.hasBothParents = function(){
			return this.mother != null && this.father != null;
		};
		person.hasNoParents = function(){
			return !this.hasBothParents();
		};
		person.hasValidParents = function(){
			return (this.father == null || Family._personExistsByUUID(this.father)) && 
				(this.mother == null || Family._personExistsByUUID(this.mother));
		};
		person.hasParent = function(uuid){
			return this.mother == uuid || this.father == uuid;
		};
		person.getNode = function(){
			return Family._getNodeForPerson(this.id);
		};
		person.hasChildren = function(){
			return this.children != null && this.children.length > 0;
		};
		return person;
	},

	_newHubObject: function(topNodes, bottomNodes){
		var hub = {
			topNodes: topNodes,
			bottomNodes: bottomNodes
		};
		hub.getAllNodes = function(){
			return this.topNodes.concat(this.bottomNodes);
		};
		hub.getLeftMostNode = function(){
			var all = this.getAllNodes();
			var min_x_node = Family._getNodeForPerson(all[0]);
			if(all.length <= 1) return min_x_node;
			for(var i = 1; i < all.length; i++){
				var node = Family._getNodeForPerson(all[i]);
				if(node.x < min_x_node.x){
					min_x_node = node;
				}
			}
			return min_x_node;
		};
		hub.getRightMostNode = function(){
			var all = this.getAllNodes();
			var max_x_node = Family._getNodeForPerson(all[0]);
			if(all.length <= 1) return max_x_node;
			for(var i = 1; i < all.length; i++){
				var node = Family._getNodeForPerson(all[i]);
				if(node.x > max_x_node.x){
					max_x_node = node;
				}
			}
			return max_x_node;
		};
		return hub;
	},

	_setPersonAtIndex: function(person, index){
		this._persons[index] = person;
	},

	_updatePersonAtIndex: function(index, key, value){
		var p = this._persons[index];
		p[key] = value;
		this._persons[index] = p;
	},

	_setPersonForUUID: function(person, uuid){
		this._persons[this._personIndex[uuid]] = person;
	},

	_updatePerson: function(person){
		this._setPersonForUUID(person, person.id);
	},

	_getPersonByIndex: function(index){
		return this._persons[index];
	},

	_getPersonByUUID: function(uuid){
		return this._getPersonByIndex(this._personIndex[uuid]);
	},

	_personExistsByUUID: function(uuid){
		return this._personIndex[uuid] != null;
	},

	_personCount: function(){
		return this._persons.length;
	},

	_getNodeForPerson: function(uuid){
		return this._nodes[this._nodeIndex[uuid]];
	},

	_drawLine: function(x1, y1, x2, y2) {
		var a = x1 - x2,
	        b = y1 - y2,
	        length = Math.sqrt(a * a + b * b);
	    var sx = (x1 + x2) / 2,
	        sy = (y1 + y2) / 2;
	    var x = sx - length / 2,
	        y = sy;
	    var angle = Math.PI - Math.atan2(-b, a);
	    var line = $("<div></div>").css({
	    	"border":Family._config.lineThickness + "px solid black",
	    	"width":length+"px",
	    	"height":"0px",
	    	"-moz-transform":"rotate(" + angle + "rad)",
	    	"-webkit-transform":"rotate(" + angle + "rad)",
	    	"-o-transform":"rotate(" + angle + "rad)",
	    	"-ms-transform":"rotate(" + angle + "rad)",
	    	"position":"absolute",
	    	"top":y+"px",
	    	"left":x+"px",
	    });
	    this._container.append(line);
	},

	// RFC4122 allows random and pseudo-random numbers
	// https://gist.github.com/duzun/d1bfb5406a362e06eccd
	_newUUID: function() {
		function s(n) { return h((Math.random() * (1<<(n<<2)))^Date.now()).slice(-n); }
	    function h(n) { return (n|0).toString(16); }
	    return  [
	        s(4) + s(4), s(4),
	        '4' + s(3),                    // UUID version 4
	        h(8|(Math.random()*4)) + s(3), // {8|9|A|B}xxx
	        // s(4) + s(4) + s(4),
	        Date.now().toString(16).slice(-10) + s(2) // Use timestamp to avoid collisions
	    ].join('-');
	},

};
