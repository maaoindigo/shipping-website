///nodesGraph.js

import $ from 'jquery';
import anime from "animejs/lib/anime.es.js";
import jsonrepair from "jsonrepair";
import fetch from "node-fetch";

import * as THREE from 'three';

// import JSDOM from 'jsdom';

var myModules = [];
import * as myHelper from './myHelperFunctions.js'; myModules.push(myHelper);

for(let mod of myModules){
	Object.entries(mod).forEach(([name, exported]) => window[name] = exported);
}

SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement || function(toElement){
	return toElement.getScreenCTM().inverse().multiply(this.getScreenCTM());
};

function createSVGElement(tag, props={}, childs=[]){

	let elem = document.createElementNS('http://www.w3.org/2000/svg', tag);

	if(isObject(props)){
		for(let prop of Object.keys(props)){
			elem.setAttribute(prop, props[prop]);
		}
	}

	if(isArray(childs)){
		for(let child of childs){
			if(child instanceof Element || child instanceof jQuery){
				$(elem).append(child);
			}else if(isObject(child)){
				$(elem).append(createSVGElement(child?.tag, child?.props, child?.childs));
			}
		}
	}

	return elem;

}

class NGNode{
	#id = randomID('NGNode-');
	get id(){
		return this.#id;
	}
	name = '';
	element = null;
	patternElement = null;
	imageElement = null;
	edges = {};

	imageFile = null;

	position = new Vector2(0,0);

	radius = 40;

	data = {};

	_shape = null;

	constructor(n){
		this.name = String(n);

		this.element = createSVGElement('ellipse',{
			class: `nodegraph-node`,
			id: `ngNode-${this.name}`,
			[`bx:origin`]: `0.5 0.5`,
			fill: `url(#ngNodePtn-${this.name})`,
			'data-nodegraphnode-id': this.id,
		});

		this.patternElement = createSVGElement('pattern',{
			class: `nodegraph-pattern`,
			id: `ngNodePtn-${this.name}`,
			patternUnits: `userSpaceOnUse`,
		});

		this.imageElement = createSVGElement('image',{
			class: `nodegraph-image`,
			id: `ngNodeImg-${this.name}`,
		});

		$(this.patternElement).append(this.imageElement);
	}

	addEdge(edge){
		if(!(edge instanceof NGEdge)) return;

		for(let otherNode of edge.nodes){
			if(otherNode == this || otherNode.id === this.id){
				this.edges[edge.id] = edge;
				return;
			}
		}
		// this.edges[edge.id] = edge;
	}

	removeEdge(inx){
		let removed;
		for(let _id of Object.keys(this.edges)){
			if(inx == this.edges[_id] || inx == this.edges[_id]?.name || inx == _id){
				removed = this.edges[_id];
				delete this.edges[_id];
				break;
			}
		}
		return removed;
	}

	renderNode(graph){
		
		this.renderNodeElement(graph);
	}

	renderNodeElement(graph){
		let elem = this.element;
		$(elem).attr({
			// class: `nodegraph-node`,
			id: `ngNode-${this.name}`,
			[`bx:origin`]: `0.5 0.5`,
			fill: `url(#ngNodePtn-${this.name})`,
			cx: this.position.x,
			cy: this.position.y,
			rx: this.radius,
			ry: this.radius,
			'data-nodegraphnode-id': this.id,
		});

		this.renderNodeEdges(graph);
		this.renderNodeImage(graph);
	}

	renderNodeEdges(graph){
		
		for(let edge of Object.values(this.edges)){
			if(edge instanceof NGEdge){
				
				edge.renderEdge(graph);
			}
		}
	}

	renderNodeImage(graph){
		let elem = this.element;
		let svgCont = graph?.container || $(elem).parents('svg.nodegraph-container').last()[0];

		if(svgCont instanceof SVGElement){
			let vBox = svgCont.viewBox.animVal;

			$(this.patternElement).attr({
				// class: `nodegraph-pattern`,
				id: `ngNodePtn-${this.name}`,
				width: vBox.width,
				height: vBox.height,
				// patternUnits: `userSpaceOnUse`,
			});

			$(this.imageElement).attr({
				// class: `nodegraph-image`,
				id: `ngNodeImg-${this.name}`,
				x: (elem.cx.animVal.value - elem.rx.animVal.value),
				y: (elem.cy.animVal.value - elem.ry.animVal.value),
				w: (2 * elem.rx.animVal.value),
				h: (2 * elem.ry.animVal.value),
			});

			let imgElem = this.imageElement;

			if(this.imageFile instanceof Blob){
				getBase64(this.imageFile).then((imgData)=>{
					$(imgElem).attr({
						href: imgData,
					});
				},(err)=>{
					console.log(err);
				});
			}
			
		}
	}


}

class NGEdge{
	#id = randomID('NGEdge-');

	get id(){
		return this.#id;
	}
	get name(){
		let name = [];
		if(this.nodes[0] instanceof NGNode){
			name[0] = `${this.nodes[0].name}`;
		}
		if(this.nodes[1] instanceof NGNode){
			name[1] = `${this.nodes[1].name}`;
		}

		if(name.length){
			name = `${name[0]}--${name[1]}`;
		}else{
			name = `${this.id}`;
		}

		return name;

	}

	get from(){
		return this.nodes[0];
	}
	get to(){
		return this.nodes[1];
	}
	element = null;
	nodes = [];

	link = '';

	data = {};

	constructor(nodeA, nodeB, data={}){
		this.setNodes(nodeA, nodeB);

		this.data = data;

		this.link = data?.link||'';

		this.element = createSVGElement('path',{
			class: `nodegraph-edge`,
			id: `ngEdge-${this.name}`,
			fill: `none`,
			[`stroke-width`]: 2,
			'data-nodegraphedge-id': this.id,
		});

		this.renderEdge();

	}

	setNodes(nodeA, nodeB){
		if(nodeA instanceof NGNode && nodeB instanceof NGNode){
			this.nodes = [nodeA, nodeB];
		}
	}

	renderEdge(graph){
		
		this.renderEdgeElement(graph);
	}

	renderEdgeElement(graph){

		let draw = ``;

		if(graph?.shape){
			draw = graph.shape.drawEdge(this, graph);
		}else{
			draw = new NGShapeNoShape().drawEdge(this, graph);
		}

		$(this.element).attr({
			// class: `nodegraph-edge`,
			id: `ngEdge-${this.name}`,
			// fill: `none`,
			// [`stroke-width`]: 2,
			'data-nodegraphedge-id': this.id,
			d:draw,
		});
	}

}

class NGShape{
	position = new Vector2();
	editable = false;
	// rect = {
	// 	position: new Vector2(),
	// 	size: new Vector2()
	// };
	// anchor = new Vector2();
	// angle = 0;
	// scale = Vector2.ONE;
	// skew = Vector2.ZERO;
	// flip = {x:false,y:false};

	// _points = [];

	constructor(opts){
		this.editable = (opts?.editable ? true : false);
	}

	// get center{
	// 	return Vector2.SUBTRACT(this.rect.size,this.rect.position)
	// }

	isEditable(){
		return this.editable;
	}

	constructPoints(){

	}

	renderShape = (graph)=>{

	}

	drawNodes = (nodes, graph) => {

	}

	drawEdge = (edge, graph) => {

	}

}

class NGShapeNoShape extends NGShape{

	constructor(opts){
		super(opts);
	}

	constructPoints(){
		
	}

	renderShape = (graph) => {
		console.log('render shape NoShape');
		Object.values(graph.nodes).forEach((node,i)=>{
			node.position = new Vector2(node.position);
		});
	}

	drawEdge = (edge, graph) => {
		let draw = '';
		let nodes = edge?.nodes;

		if(!edge && !graph) return draw;

		let points = [];
		for(let node of edge.nodes){
			if(node instanceof NGNode){
				points.push(node.position);
			}
		}
		if(!points.length){
			//draw is blank
		}else if(edge.from.id == edge.to.id){
			let pt = points[0];

			let r = edge.nodes[0].element.rx.animVal.value;

			let _pt = new Vector2(pt.x+r,pt.y+r);

			let svgCont = graph?.container || $(edge.element).parents('svg.nodegraph-container').last()[0];

			if(svgCont instanceof SVGElement){
				let vBox = svgCont.viewBox.animVal;

				let center = {
					x: (vBox.width/2) - (vBox.x),
					y: (vBox.height/2) - (vBox.y),
				}

				let diff = {
					x: (pt.x - center.x),
					y: (pt.y - center.y),
				}

				let ang = Math.PI;

				if(diff.x != 0 && diff.y != 0){
					ang = Math.atan(diff.y/diff.x) + (3 * Math.PI/4);
					if(diff.x>0) ang += Math.PI;
				}

				let pivot = new Vector2(pt.x,pt.y)
				// console.log({x:_pt.x,y:_pt.y});
				
				_pt.rotateAround(pivot, ang);

				// console.log({x:_pt.x,y:_pt.y,ang:ang});
			}
			// console.log(svgCont)
			

			let c = {
				x:(_pt.x), y:(_pt.y)
			};
			
			draw = `
				M ${c.x},${c.y} 
				m ${-r},0 
				a ${r},${r} 0 1,0 ${r*2},0 
				a ${r},${r} 0 1,0 ${-r*2},0
				Z 
			`;
		}else{
			//draw straight line
			draw = `
				M ${points[0].x},${points[0].y} 
				L ${points[1].x},${points[1].y}
				Z
			`;
			
		}

		return draw;
	}
}

class NGShapePolygon extends NGShape{
	radius = 100;
	sides = 3;
	center = new Vector2();

	precision = 0.05;

	constructor(radius, numOfSides, center=[0,0], opts){
		super(opts);

		if(isNumber(radius))
			this.radius = radius;
		if(isInt(numOfSides) && numOfSides>0)
			this.sides = numOfSides;
		this.center = new Vector2(center);
	}

	constructPoints(){
		let r = this.radius;
		let sides = this.sides;
		let center = this.center;
		let points = [];
		let TAU = (2*Math.PI);
		for(let i=0; i<sides; i++){
			let angle = i * (TAU/sides) - (Math.PI/2);

			let initPoint = new Vector2(
				r * Math.cos(angle), r * Math.sin(angle)
			);

			// console.log(initPoint);

			let point = Vector2.ADD(center, initPoint);

			point.subtract(this.position);

			points.push(point);
		}

		return points;
	}

	renderShape = (graph) => {
		console.log('render shape Polygon');
		if(!graph || !graph.container) return;
		this.sides = Object.values(graph.nodes).length;
		let vBox = graph.container?.viewBox?.animVal;

		let center = {
			x: (vBox.width/2) - (vBox.x),
			y: (vBox.height/2) - (vBox.y),
		}

		this.center = new Vector2(center);

		let pts = this.constructPoints();
		// console.log({shapePoints:pts});

		Object.values(graph.nodes).forEach((node,i)=>{
			let _pt = pts[i];
			node.position = new Vector2(_pt);
		});
	}

	drawEdge = (edge, graph) => {
		let draw = '';
		let nodes = edge?.nodes;

		if(!edge && !graph) return draw;

		let points = [];
		for(let node of edge.nodes){
			if(node instanceof NGNode){
				points.push(node.position);
			}
		}
		// console.log(6)
		if(!points.length){
			//draw is blank
		}else if(edge.from.id == edge.to.id){
			// console.log(7);
			let pt = points[0];

			let r = edge.nodes[0].radius || edge.nodes[0].element.rx.animVal.value || graph.defaultRadius;

			let _r = (r / this.sides) * 1.5;

			let _pt = new Vector2(pt.x+r,pt.y+r);

			let svgCont = graph?.container || $(edge.element).parents('svg.nodegraph-container').last()[0];

			if(svgCont instanceof SVGElement){
				let vBox = svgCont.viewBox.animVal;

				let center = {
					x: (vBox.width/2) - (vBox.x),
					y: (vBox.height/2) - (vBox.y),
				}

				let diff = {
					x: (pt.x - center.x),
					y: (pt.y - center.y),
				}

				let ang = Math.PI;

				if(diff.x != 0 && diff.y != 0){
					ang = Math.atan(diff.y/diff.x) + (3 * Math.PI/4);
					if(diff.x>0) ang += Math.PI;
				}

				let pivot = new Vector2(pt.x,pt.y)
				// console.log({x:_pt.x,y:_pt.y});
				
				_pt.rotateAround(pivot, ang);

				// console.log({x:_pt.x,y:_pt.y,ang:ang});
			}
			// console.log(svgCont)
			

			let c = {
				x:(_pt.x), y:(_pt.y)
			};
			
			draw = `
				M ${c.x},${c.y} 
				m ${-r},0 
				a ${r},${r} 0 1,0 ${r*2},0 
				a ${r},${r} 0 1,0 ${-r*2},0
				Z 
			`;
		}else{
			// console.log(8);
			//get all bezier points

			let nodesArr = Object.values(graph.nodes);

			let fromIndex = nodesArr.indexOf(edge.from);
			let toIndex = nodesArr.indexOf(edge.to);

			if(!nodesArr.length || fromIndex<0 || toIndex<0) return;

			// let mid = Math.round(nodesArr.length / 2);

			// let dist = Math.abs(mod((toIndex - fromIndex) , mid));

			let _nodes = [];
			let _indexArr = [];

			let dist=0, i=0,j=0, iArr=[],jArr=[], count=0;

			i = mod(fromIndex,nodesArr.length);
			j = mod(fromIndex,nodesArr.length);

			// console.log({i,j,fromIndex,toIndex})

			while(count<nodesArr.length){

				let _i = mod(i,nodesArr.length);
				// console.log({i,_i});
				iArr.push(_i);
				if(Math.abs(_i)==toIndex) break;
				i++;
				count++;
			}
			count = 0;
			while(count<nodesArr.length){
				let _j = mod(j,nodesArr.length);
				// console.log({j,_j});
				jArr.push(_j);
				if(Math.abs(_j)==toIndex) break;
				j--;
				count++;
			}

			if(Math.abs(i)<=Math.abs(j)){
				dist = iArr.length - 1;
				_indexArr = iArr;
			}else{
				dist = jArr.length - 1;
				_indexArr = jArr;
			}

			_nodes = _indexArr.map((_index)=>{
				return nodesArr[_index];
			});

			// let i = 0; let inc = 0, count = 0;
			// if(
			// 	(fromIndex+dist) == toIndex
			// ){
			// 	inc = 1;
			// }else{
			// 	inc = -1;
			// }
			// while(count<=dist){
			// 	let _node = nodesArr[mod((fromIndex + i),nodesArr.length)];
			// 	console.log({edge:edge.name,_node});
			// 	i += inc;
			// 	count++;
			// 	_nodes.push(_node);
			// }
			// console.log({edge:edge.name,_nodes,dist,fromIndex,toIndex,nodesArr,count,
			// 	e:mod((fromIndex+dist),nodes.length),f:(fromIndex+dist),g:(fromIndex-dist),
			// 	_indexArr,i,j,iArr,jArr
			// })
			if(_nodes.length != dist+1) return;
			

			//get angle
			let v = [ new Vector2(edge.from.position),new Vector2(edge.to.position) ];

			let a = Vector2.SUBTRACT(this.center, v[0]);
			let b = Vector2.SUBTRACT(this.center, v[1]);

			let _r = safeDivide(Vector2.DOT(a,b), a.length() * b.length())

			let arg;
			if(_r == 0){
				arg = (Math.PI / 2);
			}else if(_r == Infinity){
				arg = 0;
			}else if(_r == -Infinity){
				arg = (Math.PI);
			}else{
				arg = Math.acos(_r);
			}

			let cosArg = Math.cos(arg);
			arg = Math.acos(cosArg);



			if(_nodes.length<3 || arg <= (2*Math.PI/this.sides)){
				// console.log(101);
				let edgeLen = v[0].distanceTo(v[1]);

				let avgRadius = getAverageFrom(_nodes.map((_nodes)=>{
					return _nodes.radius;
				}));

				if(isNaN(avgRadius)){
					avgRadius = 0;
				}

				if(edgeLen <= 2*avgRadius){

					let center = this.center;

					let midPt = Vector2.MIDPOINT([v[0], v[1], center]);
					let edgeLine = new Vector2Line(v[0],v[1]);

					let mMidPt = edgeLine.mirror(midPt);

					let _dir = Vector2.SUBTRACT(mMidPt, center);
					_dir = _dir.normalized().scaled(edgeLen-avgRadius);
					_dir = Vector2.ADD(_dir, center);
					_dir = edgeLine.mirror(_dir);


					let _pts = [ v[0], _dir, v[1] ];

					let curvePoints = Vector2.quadraticBezierPoints(_pts, this.precision);

					// draw += `M ${midPt.x},${midPt.y} `;
					// draw += `L ${curvePoints[0].x},${curvePoints[0].y} `;
					draw += `M ${curvePoints[0].x},${curvePoints[0].y} `;

					for(let i=1;i<curvePoints.length;i++){
						let _pt = curvePoints[i];
						draw += `L ${_pt.x},${_pt.y} `;
					}

					// draw += `L ${mMidPt.x},${mMidPt.y} `;
					// draw += `L ${v[1].x},${v[1].y} `;
					// // draw += `L ${v[0].x},${v[0].y} `;
					// draw += `L ${midPt.x},${midPt.y} `;

					// console.log({edge:edge.name,edgeElem:edge.element,center,draw,midPt,_pts:[v[0],v[1]],mMidPt,curvePoints});
				}else{
					draw = `
						M ${v[0].x},${v[0].y} 
						L ${v[1].x},${v[1].y}
					`;
				}

				
			}else if(arg <= (Math.PI/2)){
				// console.log(102);

				let avgRadius = getAverageFrom(_nodes.map((_nodes)=>{
					return _nodes.radius;
				}));

				if(isNaN(avgRadius)){
					avgRadius = 0;
				}

				let edgeLine = new Vector2Line(v[0],v[1]);
				// console.log({_nodes});
				let mPts = _nodes.map((_node,_i,_arr)=>{
					if(_node == _arr.first() || _node == _arr.last()){
						return _node.position;
					}

					let pt = new Vector2(_node.position);
					// let _pt = pt.normalized();

					// let _radius = (avgRadius || _node.radius || graph.defaultRadius);

					// let _scale = pt.length() + _radius;

					// pt = _pt.scaled(_scale);

					return edgeLine.mirror(pt);
					//////////////////
				});

				// mPts.push(_nodes.last());
				// mPts.unshift(_nodes.first());

				let curvePoints = Vector2.quadraticBezierPoints(mPts, this.precision);

				draw += `M ${curvePoints[0].x},${curvePoints[0].y} `;

				for(let i=1;i<curvePoints.length;i++){
					let _pt = curvePoints[i];
					draw += `L ${_pt.x},${_pt.y} `;
				}

				// draw += `Z`;
				// console.log({_nodes,mPts, curvePoints,arg,draw})

				// console.log(draw);

			}else if(arg <= Math.PI){
				// console.log(103);
				draw = `
					M ${v[0].x},${v[0].y} 
					L ${v[1].x},${v[1].y}
					
				`;
			}
			
		}

		
		// return '';

		return draw;
	}

}

class NodesGraph{
	#id = randomID('NGGraph-');
	get id(){
		return this.#id;
	}
	name = '';
	container = null;
	nodes = {};
	edges = {};

	static Node = NGNode;
	static Edge = NGEdge;
	static Shape = NGShape;
	static ShapeNoShape = NGShapeNoShape;
	static ShapePolygon = NGShapePolygon;

	shape = null;

	resizeObserver = null;

	_renderOnChange = true;
	defaultRadius = 20;

	constructor(svgElem, opts){
		if(svgElem instanceof SVGElement){
			this.container = svgElem;
		}else{
			this.container = createSVGElement('svg',{
				viewBox: '0 0 500 500',
			});
		}

		$(this.container).append(
			$(createSVGElement('defs')).addClass(`nodegraph-defs`)[0],
			$(createSVGElement('g')).addClass(`nodegraph-nodesGroup`)[0],
			$(createSVGElement('g')).addClass(`nodegraph-edgesGroup`)[0],
			
		).addClass('nodegraph-container').attr({
			'data-nodegraph-id': this.id,
		});

		let thisGraph = this;

		// this.resizeObserver = new ResizeObserver(function(ents){
		// 	ents.forEach((ent)=>{
		// 		thisGraph.renderGraph();
		// 	});
		// });

		// this.resizeObserver.observe(this.container,{
		// 	box: 'border-box'
		// });

		this._renderOnChange = (opts?.renderOnChange?true:false);
		this.defaultRadius = (isNumber(opts?.radius)?opts.radius:this.defaultRadius);
		this.defaultRadius = (isNumber(opts?.defaultRadius)?opts.defaultRadius:this.defaultRadius);

	}

	getNodeByID(id){
		for(let node of Object.values(this.nodes)){
			if(node.id == id){
				return node;
			}
		}
		return null;
	}
	getNodeByName(name){
		for(let node of Object.values(this.nodes)){
			if(node.name == name){
				return node;
			}
		}
		return null;
	}
	getNodeByElem(elem){
		for(let node of Object.values(this.nodes)){
			if(node.element == elem){
				return node;
			}
		}
		return null;
	}

	getEdgeByID(id){
		for(let edge of Object.values(this.edges)){
			if(edge.id == id){
				return edge;
			}
		}
		return null;
	}
	getEdgeByName(name){
		for(let edge of Object.values(this.edges)){
			if(edge.name == name){
				return edge;
			}
		}
		return null;
	}
	getEdgeByElem(elem){
		for(let edge of Object.values(this.edges)){
			if(edge.element == elem){
				return edge;
			}
		}
		return null;
	}

	getViewBox = () => {
		return (this.container?.viewBox?.animVal || this.container?.getBoundingClientRect());
	}

	getViewBoxCenter = () => {
		let vBox = this.getViewBox();
		return new Vector2(
			(vBox.width/2 - vBox.x), (vBox.height/2 - vBox.y)
		);
	}

	setShape = (shape) => {
		if(shape instanceof NGShape){
			this.shape = shape;

			if(shape.isEditable()){
				for(let node of Object.values(this.nodes)){
					$(node.element).on('mousedown',this.editableEvent);
				}
			}else{
				for(let node of Object.values(this.nodes)){
					$(node.element).off('mouse', this.editableEvent);
				}
			}
		}

		if(this._renderOnChange){
			this.renderGraph();
		}
	}

	editableEvent = (e) => {
		let thisGraph = this;
		// console.log(thisGraph);
		let svgCont = thisGraph.container;

		e = e||window.event;
		e.preventDefault();
		e.stopPropagation();

		let opts = {
			isDown: false,
			mousePos:{x:0,y:0},
			elemPos:{x:0,y:0}
		};

		let svg = svgCont || thisGraph?.container || $(elem).parents('svg.nodegraph-container').last();

		if(!svg) return;

		let elem = e.currentTarget;

		let _node = thisGraph.getNodeByElem(elem);

		if(!_node) return;

		let pt = svg.createSVGPoint();

		function cursorPoint(evt){
			pt.x = evt.clientX; pt.y = evt.clientY;
			return pt.matrixTransform(svg.getScreenCTM().inverse());
		}

		opts.mousePos = cursorPoint(e);

		opts.elemPos = {
			x:_node.position.x,
			y:_node.position.y
		};

		svg.onmouseup = (e)=>{
			svg.onmouseup = null;
			svg.onmousemove = null;

			opts.isDown = false;
		};
		// call a function whenever the cursor moves:
		svg.onmousemove = (e)=>{
			e = e || window.event;
			e.preventDefault();

			let curr = cursorPoint(e);
			pt.x = curr.x - opts.mousePos.x;
			pt.y = curr.y - opts.mousePos.y;

			let m = elem.getTransformToElement(svg).inverse();
			// m.e = m.f = 0;
			pt = pt.matrixTransform(m);

			_node.position.x = opts.elemPos.x + pt.x;
			_node.position.y = opts.elemPos.y + pt.y;

			_node.renderNodeElement(thisGraph);
		};

	}

	createNode(name){
		let newNode = new NGNode(String(name||randomString(4)));

		let vBox = this.container?.viewBox.animVal;
		newNode.position = new Vector2(
			(vBox.width/2 - vBox.x), (vBox.height/2 - vBox.y)
		);

		newNode.radius = this.defaultRadius;

		this.appendNode(newNode);

		return newNode;
	}

	appendNode(newNode){
		let svgCont = this.container;

		$(this.container).find('.nodegraph-nodesGroup').append(newNode.element);
		$(this.container).find('.nodegraph-defs').append(newNode.patternElement);

		this.nodes[newNode.id] = newNode;

		let thisGraph = this;

		if(!this.shape || this.shape.isEditable()){
			$(newNode.element).on('mousedown', this.editableEvent);
		}

		if(this._renderOnChange){
			this.renderGraph();
		}

	}

	removeNode(inx){
		let removed;
		for(let _id of Object.keys(this.nodes)){
			if(inx == this.nodes[_id] || inx == this.nodes[_id].name || inx == _id){
				removed = this.nodes[_id];
				delete this.nodes[_id];
				break;
			}
		}

		if(this._renderOnChange){
			this.renderGraph();
		}

		return removed;
	}

	createEdge(nodeA, nodeB, link=''){
		if(isString(nodeA)){
			nodeA = this.getNodeByName(nodeA);
			if(!nodeA) nodeA = this.getNodeByID(nodeA);
		}
		if(isString(nodeB)){
			nodeB = this.getNodeByName(nodeB);
			if(!nodeB) nodeB = this.getNodeByID(nodeB);
		}

		let newEdge = new NGEdge(nodeA, nodeB, {link:link});

		if(nodeA instanceof NGNode){
			nodeA.addEdge(newEdge);
		}
		if(nodeB instanceof NGNode){
			nodeB.addEdge(newEdge);
		}

		this.appendEdge(newEdge);

		return newEdge;
	}

	appendEdge(newEdge){
		let svgCont = this.container;

		$(this.container).find('.nodegraph-edgesGroup').append(newEdge.element);

		this.edges[newEdge.id] = newEdge;

		if(this._renderOnChange){
			this.renderGraph();
		}

	}

	renderGraph(){
		console.log('render graph');
		this.renderGraphContainer();

		if(this.shape){
			console.log('pre render shape NoShape');
			this.shape.renderShape(this);
		}

		for(let node of Object.values(this.nodes)){
			if(node){
				node.renderNode(this);
			}
		}
	}

	renderGraphContainer(){
		$(this.container).attr({
			'data-nodegraph-id': this.id,
		});
	}
}



export default NodesGraph;