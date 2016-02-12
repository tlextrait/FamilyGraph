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
	gender: string
	father: UUID
	mother: UUID
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
	_lines: [
		{"node1":"1234567890","node2":"1234567892"},
		{"node1":"1234567890","node2":"1234567893"}
	],
	_nodes: [
		{"personId":"1234567890","y":100,"x":100},
		{"personId":"1234567891","y":100,"x":255},
		{"personId":"1234567892","y":200,"x":100},
		{"personId":"1234567893","y":200,"x":255}
	],
	_nodeIndex: null,
	_container: null,
	_config: {
		"containerPadding":20,
		"personWidth":150,
		"personMargin":5,
		"personHeight":25
	},

	load: function(container) {
		this._container = $(container);
		this._preparePersons();
		this._indexPersons();

		this._checkOrphans();

		this._prepareGenerations();

		this._prepareNodes();
		this._prepareLines();

		this._drawLines();
		this._drawNodes();
	},

	_preparePersons: function(){
		this._persons = [];
		$.each(this._data, function(index, data){
			var person = data;
			person.fullname = data.firstname + " " + data.lastname;
			person.generation = null;
			Family._persons.push(person);
		});
	},

	_indexPersons: function(){
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
			alert("Can't check for orphans before person index is built.");
		}

		var orphaned = [];
		for(var i = 0; i<this._persons.length; i++){
			var p = this._getPersonByIndex(i);
			if(
				(p.father != null && !this._personExistsByUUID(p.father)) || 
				(p.mother != null && !this._personExistsByUUID(p.mother))
			){
				orphaned.push(i);
			}
		}

		// @TODO REMOVE ORPHANS FROM _PERSONS HERE
		// THEN REBUILD INDEX AND START OVER

		if(orphaned.length > 0){
			alert("Found " + orphaned.length + " orphans");
		}else{
			alert("no o");
		}
	},

	_prepareGenerations: function(){

		var indexed = []; // array of person indices already indexed

		// index generations
		// find persons with no parents, generation 0
		this._generationIndex = [];
		var gen0 = [];
		for(var i = 0; i<this._persons.length; i++){
			var p = this._getPersonByIndex(i);
			if(p.father == null && p.mother == null){
				gen0.push(i);		// add to generation 0
				indexed.push(i);	// mark as indexed
				p.generation = 0;	// update generation info
				this._setPersonAtIndex(p, i); // save person
			}
		}
		this._generationIndex[0] = gen0;

		// Build next generations
		// note: won't loop forever since there can be no orphans
		while(indexed.length < this._persons.length){
			var genCounter = 1;
			var cGen = [];	// array of persons in current gen
			for(var i = 0; i<this._persons.length; i++){
				if(indexed.indexOf(i) >= 0) continue; // already indexed
				var personCountPrevGen = this._generationIndex[genCounter-1].length;
				var cPerson = this._getPersonByIndex(i);
				for(var a = 0; a<personCountPrevGen; a++){
					var cParent = this._getPersonByIndex(a);
					if(cPerson.mother == cParent.id || cPerson.father == cParent.id){
						cGen.push(i);
						indexed.push(i);
						cPerson.generation = genCounter;
						this._setPersonAtIndex(cPerson, i);
						break;
					}
				}
			}
			this._generationIndex[genCounter] = cGen;
		}
	},

	_prepareNodes: function(){
		this._nodes = [];

		// @TODO build nodes

		// Index nodes
		this._nodeIndex = [];
		$.each(this._nodes, function(index, node){
			Family._nodeIndex[node.personId] = index;
		});
	},

	_prepareLines: function(){
		//this._lines = [];

		// @TODO prepare lines
	},

	_drawLines: function(){
		$.each(this._lines, function(index, line){
			var node1 = Family._getNodeForPerson(line.node1);
			var node2 = Family._getNodeForPerson(line.node2);
			Family._drawLine(node1.x, node1.y, node2.x, node2.y);
		});
	},

	_drawNodes: function(){
		$.each(this._nodes, function(index, node){
			var person = Family._getPersonByUUID(node.personId);
			var nodeElement = Family._newNode(node.x, node.y, person.fullname);
			Family._container.append(nodeElement);
		});
	},

	_newNode: function(x, y, text){
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

	_setPersonAtIndex: function(person, index){
		this._persons[index] = person;
	},

	_setPersonForUUID: function(person, uuid){
		this._persons[this._personIndex[uuid]] = person;
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
	    	"border":"1px solid black",
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
