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

var Family = {

	_data: [
		{"id":"1234567890","firstname":"John","lastname":"Doe","gender":"M","father":null,"mother":null},
		{"id":"1234567891","firstname":"Patricia","lastname":"Doe","gender":"F","father":null,"mother":null},
		{"id":"1234567892","firstname":"Stella","lastname":"Doe","gender":"F","father":"1234567890","mother":"1234567891"},
		{"id":"1234567893","firstname":"James","lastname":"Doe","gender":"M","father":"1234567890","mother":"1234567891"}
	],
	_persons: null,
	_personIndex: null,
	_generationIndex: null,
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

	_prepareNodes: function(){
		this._nodes = [];
		// find persons with no parents, generation 0
		this._generationIndex = [];
		var gen0 = [];
		for(var i = 0; i<this._persons.length; i++){
			var p = this._persons[i];
			if(p.father == null && p.mother == null){
				gen0.push(i);
				p.generation = 0;
			}
		}
		this._generationIndex[0] = gen0;

		// @TODO build nodes


		// Index nodes
		this._nodeIndex = [];
		$.each(this._nodes, function(index, node){
			Family._nodeIndex[node.personId] = index;
		});
	},

	_prepareLines: function(){

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
			var person = Family._getPerson(node.personId);
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

	_getPerson: function(uuid){
		return this._persons[this._personIndex[uuid]];
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
