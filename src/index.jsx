///index.jsx

import $ from "jquery";
import anime from "animejs/lib/anime.es.js";
import jsonrepair from "jsonrepair";
import fetch from "node-fetch";

// import Matter from "matter-js";

// import {
// 	metadata, settings, colors
// } from "./js/myMainVars.js";

//import styling
import "./css/style.scss";
import "./css/footstrap.scss";

var myModules = [];
import * as myHelper from '@catsums/my'; myModules.push(myHelper);

for(let mod of myModules){
	Object.entries(mod).forEach(([name, exported]) => window[name] = exported);
}

import NodesGraph from './js/nodesGraph.js';
// import {CollisionObserver} from './js/CollisionObserver.js';
// import {PositionObserver} from './js/PositionObserver.js';

function makePolygon(sides, radius, center){
	let r = radius;
	let points = [];
	let TAU = (2*Math.PI);
	for(let i=0; i<sides; i++){
		let angle = i * (TAU/sides) - (Math.PI/2);

		let initPoint = new Vector2(
			r * Math.cos(angle), r * Math.sin(angle)
		);

		// console.log(initPoint);

		let point = Vector2.ADD(center, initPoint);

		points.push(point);
	}

	return points;
}

function isLeftOf(point, other, inclusive=true){
	let a = new Vector2(point);
	let b = new Vector2(other);

	if(a.x < b.x) return true;
	if(inclusive && a.x == b.x) return true;
	return false;
}
function isAbove(point, other, inclusive=true){
	let a = new Vector2(point);
	let b = new Vector2(other);

	if(a.y < b.y) return true;
	if(inclusive && a.y == b.y) return true;
	return false;
}

function isRightOf(point, other, inclusive=true){
	let a = new Vector2(point);
	let b = new Vector2(other);

	if(a.x > b.x) return true;
	if(inclusive && a.x == b.x) return true;
	return false;
}
function isBelow(point, other, inclusive=true){
	let a = new Vector2(point);
	let b = new Vector2(other);

	if(a.y > b.y) return true;
	if(inclusive && a.y == b.y) return true;
	return false;
}

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

$(()=>{

	let _radius = 20;
	let _diameter = _radius * 2;

	let ptA = new Vector2(100,100);
	let ptB = new Vector2(400,100);

	$('svg').append(
		createSVGElement('ellipse',{
			class: 'temp pt-A',
			cx: ptA.x, cy:ptA.y,
		}),
		createSVGElement('ellipse',{
			class: 'temp pt-B',
			cx: ptB.x, cy:ptB.y,
		})
	);

	let lineAB = new Vector2Line(ptA,ptB);

	let _BA = Vector2.SUBTRACT(ptB,ptA);
	let u_BA = _BA.normalized();
	let s_BA = u_BA.scaled( _BA.length() - _diameter );
	let sptB = Vector2.ADD(s_BA, ptA);

	let _AB = Vector2.SUBTRACT(ptA,ptB);
	let u_AB = _AB.normalized();
	let s_AB = u_AB.scaled( _AB.length() - _diameter );
	let sptA = Vector2.ADD(s_AB, ptB);

	// setInterval(()=>{
	// 	sptA = sptA.rotated(ptA, 0.2);
	// 	sptB = sptB.rotated(ptB, -0.2);

	// 	$('.pt-sA').attr({
	// 		cx: sptA.x, cy:sptA.y,
	// 	});
	// 	$('.pt-sB').attr({
	// 		cx: sptB.x, cy:sptB.y,
	// 	});
	// 	// console.log(9)
	// },200);
	

	// let uptA = ptA.normalized();
	// let sptA = uptA.scaled( ptA.length() + _radius );

	// let uptB = ptB.normalized();
	// let sptB = uptB.scaled( ptB.length() + _radius );

	$('svg').append(
		createSVGElement('ellipse',{
			class: 'temp temp2 pt-sA',
			cx: sptA.x, cy:sptA.y,
		}),
		createSVGElement('ellipse',{
			class: 'temp temp2 pt-sB',
			cx: sptB.x, cy:sptB.y,
		})
	);

	$('.temp').css({
		fill: '#f002f0',
	}).attr({
		[`bx:origin`]:`0.5 0.5`,
		rx: _radius, ry: _radius,
	});

	$('.temp2').css({
		fill: '#f01122',
	})

	// let points = [
	// 	new Vector2(6,8),
	// 	new Vector2(2,2),
	// 	new Vector2(10,10),
	// 	new Vector2(10,6),
	// 	new Vector2(4,6),
	// 	new Vector2(8,2),
	// ];

	// let edge = [points[0], points[5]];

	// let ptA = edge[0];
	// let ptB = edge[1];

	

	// ///for A
	// let closestPtsA = ptA.sortPointsByClosest(points);
	// let optsB = {
	// 	l:0,r:0,b:0,t:0
	// }
	// let pathAtoB;
	// optsB = {
	// 	l: isLeftOf(ptB, ptA),
	// 	r: isRightOf(ptB, ptA),
	// 	t: isAbove(ptB, ptA),
	// 	b: isBelow(ptB, ptA),
	// }
	// {
	// 	let end = false, start = false;
	// 	pathAtoB = closestPtsA.filter((pt)=>{
	// 		if(end) return false;
	// 		if(pt == ptB){
	// 			end = true;
	// 			return true;
	// 		}
	// 		if(pt == ptA){
	// 			if(start) return false;
	// 			start = true;
	// 			return true;
	// 		}

	// 		let _opts = {
	// 			l: isLeftOf(pt, ptA),
	// 			r: isRightOf(pt, ptA),
	// 			t: isAbove(pt, ptA),
	// 			b: isBelow(pt, ptA),
	// 		}

	// 		if( 
	// 			optsB.t == _opts.t &&
	// 			optsB.l == _opts.l &&
	// 			optsB.r == _opts.r &&
	// 			optsB.b == _opts.b
	// 		){
	// 			return true;
	// 		}

	// 		return false;

	// 	});
	// }

	// ///for B
	// let closestPtsB = ptB.sortPointsByClosest(points);
	// let optsA = {
	// 	l:0,r:0,b:0,t:0
	// }
	// let pathBtoA;
	// optsA = {
	// 	l: isLeftOf(ptA, ptB),
	// 	r: isRightOf(ptA, ptB),
	// 	t: isAbove(ptA, ptB),
	// 	b: isBelow(ptA, ptB),
	// }
	// {
	// 	let end = false, start = false;
	// 	pathBtoA = closestPtsB.filter((pt)=>{
	// 		if(end) return false;
	// 		if(pt == ptA){
	// 			end = true;
	// 			return true;
	// 		}
	// 		if(pt == ptB){
	// 			if(start) return false;
	// 			start = true;
	// 			return true;
	// 		}

	// 		let _opts = {
	// 			l: isLeftOf(pt, ptB),
	// 			r: isRightOf(pt, ptB),
	// 			t: isAbove(pt, ptB),
	// 			b: isBelow(pt, ptB),
	// 		}

	// 		if( 
	// 			optsA.t == _opts.t &&
	// 			optsA.l == _opts.l &&
	// 			optsA.r == _opts.r &&
	// 			optsA.b == _opts.b
	// 		){
	// 			return true;
	// 		}

	// 		return false;

	// 	});
	// }

	// let closestToA = ptA.closestPoint(pathBtoA, true);
	// let closestToB = ptB.closestPoint(pathAtoB, true);

	// let closestDistToA = Math.abs(closestToA.distanceTo(ptA));
	// let closestDistToB = Math.abs(closestToB.distanceTo(ptB));
	
	// console.log({
	// 	pathAtoB, pathBtoA, closestDistToB, closestDistToA
	// });

	// let graph = new NodesGraph($('svg.ngcont')[0],{
	// 	renderOnChange: true,
	// 	radius: 40,
	// });

	// let radius = (500/3);
	// let gViewBox = graph.container?.viewBox.animVal || $('svg.cont')[0].viewBox.animVal;
	// let gCenter = new Vector2(
	// 	gViewBox.x + (gViewBox.width/2), gViewBox.y + (gViewBox.height/2)
	// );

	// // graph.shape = new NodesGraph.ShapeNoShape();
	// // graph.shape = new NodesGraph.ShapePolygon(radius, 2, gCenter,{
	// // 	editable: true,
	// // });

	// // let alpha = 'ABCDEFGHIJKLMNOPQSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
	// // let n = 12;

	// // let nodes = [];

	// // for(let i=0; i<n; i++){
	// // 	let k = alpha[(i%alpha.length)];
	// // 	let node = graph.createNode(k);
	// // 	nodes.push(node);
	// // }

	// // for(let i=0; i<n; i++){
	// // 	graph.createEdge(nodes[(i%n)], nodes[((i+1)%n)]);
	// // }

	// // let gViewBox = graph.container?.viewBox.animVal || $('svg.cont')[0].viewBox.animVal;
	// // let gCenter = new Vector2(
	// // 	gViewBox.x + (gViewBox.width/2), gViewBox.y + (gViewBox.height/2)
	// // );



	// // let points = makePolygon(n, (500/2.5), gCenter);

	// // let rr = 20;

	// // for(let i=0; i<n; i++){
	// // 	nodes[i].radius = rr;
	// // 	nodes[i].position = new Vector2(points[i]);
	// // }

	// // let line = new Vector2Line({
	// // 	gradient: 3, yIntercept: 5
	// // });
	// // let line = new Vector2Line(
	// // 	new Vector2(-1,2), new Vector2(0,5)
	// // );

	// // let point = new Vector2(-1,2);

	// // console.log(line.hasPoint(point));
	// // console.log(line);
	// // console.log(line.perpendicular(point));

	// // let line = new Vector2Line({a:1, b:-1, c:0});
	// // let line2 = new Vector2Line({a:4, b:-4, c:0});
	// // let line3 = new Vector2Line({a:4, b:-4, c:1});

	// // let point = new Vector2(9,2);

	// // console.log(line);
	// // // console.log(point);
	// // // console.log(line.mirror(point));

	// // console.log(line2);
	// // console.log(line3);

	// // console.log(line.equals(line2));
	// // console.log(line.equals(line3));

	// graph.createNode('A');
	// graph.createNode('B');
	// graph.createNode('C');
	// graph.createNode('D');
	// graph.createNode('E');
	// graph.createNode('F');
	// graph.createNode('G');
	// graph.createNode('H');
	// graph.createNode('I');

	// graph.createEdge('A','B');
	// // graph.createEdge('C','B');
	// graph.createEdge('E','E');
	// graph.createEdge('C','G');
	// // graph.createEdge('B','H');
	// // graph.createEdge('A','I');

	// graph.setShape(
	// 	new NodesGraph.ShapePolygon(radius, 2, gCenter,{
	// 		editable: true,
	// 	})
	// );

	// // graph.renderGraph();

	// $('.makeNode').on('click',(e)=>{
	// 	console.log('created node');
	// 	graph.createNode(`${randomString()}`);
	// });

	// console.log(graph);

	// const opts = {
	// 	method: 'POST',
	// 	body: JSON.stringify({fish:true}),
	// 	headers: {
	// 		'Content-Type': 'application/json'
	// 	}
	// }

	// getFileBlob(`https://cdn.pixabay.com/photo/2015/04/19/08/32/marguerite-729510_960_720.jpg`,'image/*',
	// 	(_url, _blob, _byteArr)=>{
	// 		console.log({_url,_blob,_byteArr});
	// 		let file = new File([_blob], hash32(`${_url}${randomString(32)}`), {type:'image/*'})

	// 		getBase64(file).then((res)=>{
	// 			console.log(res);
	// 		})
	// 	}
	// );

	// fetch('/api',opts).then(async(res)=>{
	// 	let resData = await res.text();
	// 	console.log(resData);
	// });


});