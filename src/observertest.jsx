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
import * as myHelper from './js/myHelperFunctions.js'; myModules.push(myHelper);

for(let mod of myModules){
	Object.entries(mod).forEach(([name, exported]) => window[name] = exported);
}

import nodesGraph from './js/nodesGraph.js';
import {CollisionObserver} from './js/CollisionObserver.js';
import {PositionObserver} from './js/PositionObserver.js';

function getBoundingDocRect(elem){
	let _rect = elem.getBoundingClientRect();
	return _rect;


	let body = document?.body;
	let doc = document?.documentElement;

	if(!body&&!doc) return _rect;

	let _scroll = {
		x: window.pageYOffset || doc.scrollTop || body.scrollTop,
		y: window.pageXOffset || doc.scrollLeft || body.scrollLeft,
		width: doc.scrollWidth || body.scrollWidth,
		height: doc.scrollHeight || body.scrollHeight,
	}

	let _client = {
		x: doc.clientTop || body.clientTop || 0,
		y: doc.clientLeft || body.clientLeft || 0,
		height: (doc.clientHeight) || (body.clientHeight) || 0,
		width: (doc.clientWidth) || (body.clientWidth) || 0,
	};

	let rect = {}; rect = {
		x: Math.round(_rect.x + _scroll.x - _client.x),
		y: Math.round(_rect.y + _scroll.y - _client.y),
		height: Math.round(_rect.height + _scroll.height - _client.height),
		width: Math.round(_rect.width + _scroll.width - _client.width),
		get top(){ return rect.y; },
		get left(){ return rect.x; },
		get right(){ return (rect.x + rect.width); },
		get bottom(){ return (rect.y + rect.height); },
	}

    return rect;
}

function isCollidingByLayers(collisionLayers, groupLayers){
	if(isArray(collisionLayers) && isArray(groupLayers)){
		for(let cLayer of collisionLayers){
			for(let gLayer of groupLayers){
				if(cLayer === gLayer) return true;
			}
		}
	}

	return false;
}

function isColliding(rectA, rectB){
	if(
		rectA.right < rectB.left ||
		rectA.left > rectB.right ||
		rectA.bottom < rectB.top ||
		rectA.top > rectB.bottom
	)
		return false;
	return true;
}
function simplifyRect(rect){
	let newRect = {};
	newRect = {
		top: rect?.top,
		bottom: rect?.bottom,
		left: rect?.left,
		right: rect?.right,
		get x(){ return newRect.left },
		get y(){ return newRect.top },
		get width(){ return (newRect.right - newRect.left) },
		get height(){ return (newRect.bottom - newRect.top) },
	};

	return newRect;
}
$(()=>{
	console.log("Peenut");

	let box1 = $('.bbox')[0];
	let box2 = $('.bbox')[1];

	// let rectA = box1.getBoundingClientRect();
	// let rectAA = getBoundingDocRect(box1);

	// console.log(rectA, rectAA);

	// let posObserver = new PositionObserver((ents)=>{
	// 	console.log(ents);
	// },{
	// 	FPS: 2,
	// });

	// posObserver.activate();

	// posObserver.observe(box1,{
	// 	top:false, bottom:false, right:false, left:false,
	// 	x:true, y:true, width:false, height:false
	// });
	// posObserver.observe(box2,{
	// 	top:false, bottom:false, right:false, left:false,
	// 	x:true, y:true, width:false, height:false
	// });

	let collisionObserver = new CollisionObserver((ents, obs)=>{
		// ents.forEach((ent)=>{
		// 	console.log(ent.positionEntry);

		// });
	}, {
		FPS: 20,
		useIntervals:false,
	});

	collisionObserver.activate();

	collisionObserver.observe(box1,{
		groupLayers:[1],
		collisionLayers:[1,2],
		threshold: 50,
	});
	collisionObserver.observe(box2,{
		groupLayers:[2],
		collisionLayers:[2],
		threshold: 50,
	});

	let anim;

	$(box1).on('mouseenter',(e)=>{
		// $(elem).css('top', getCSSValueInPixels($(elem).css('top'))+Vector2.DOWN.y);
		let elem = e.currentTarget;

		if(anim){
			//anim exists
			anim.play;
		}else{
			anim = anime({
				targets: elem,
				top: `${getCSSValueInPixels($(elem).css('top'))+250}`,
				left: `${getCSSValueInPixels($(elem).css('top'))+250}`,
				easing: 'linear',
				round: 1,
				duration: 1000,
				update: function() {
					collisionObserver.checkUpdates();
				},
				begin: function(){
					collisionObserver.checkUpdates();
				},
				complete: function(){
					collisionObserver.checkUpdates();
					anim = null;
				}
			});
		}

		
	}).on('mouseleave mouseout',(e)=>{
		let elem = e.currentTarget;
		if(anim) anim.pause;
	}).on('positionChange',(e)=>{
		if(e.detail?.entry){
			let ent = e.detail.entry;

			// console.log(ent);
		}
	}).on('collisionEnter',(e)=>{
		if(e.detail?.entry){
			let ent = e.detail.entry;
			let obs = e.detail.observer;

			if(ent.collisionData._old) return;
			let posEnt = ent.positionEntry;

			let elem = ent.target;
			let targ = ent.collisionData.target;

			let elemData = obs.getElementData(elem);
			let targData = obs.getElementData(targ);

			if(!elemData || !targData) return;

			let elemVector = new Vector2(elemData.moveVector);
			let targVector = new Vector2(targData.moveVector);

			let smol, bigg, smolVect, biggVect;
			if(elemVector.lengthSquared() > targVector.lengthSquared()){
				smol = targ; bigg = elem;
				smolVect = targVector; biggVect = elemVector;
			}
			if(elemVector.lengthSquared() < targVector.lengthSquared()){
				smol = elem; bigg = targ;
				smolVect = elemVector; biggVect = targVector;
			}

			if(smol&&bigg){
				let moveVect = smolVect.lineTo(biggVect);

				let collRect = ent.collisionData.rect;
				let collRectScale = new Vector2(collRect.width, collRect.height);

				let resMoveVect = Vector2.MULTIPLY(moveVect.normalized(), collRectScale);

				console.log({moveVect,resMoveVect,collRect});
				console.log(smol.getBoundingClientRect());

				$(smol).css('top', getCSSValueInPixels($(smol).css('top'))+moveVect.y-resMoveVect.y);
				$(bigg).css('top', getCSSValueInPixels($(bigg).css('top'))-resMoveVect.y);

				$(smol).css('left', getCSSValueInPixels($(smol).css('left'))+moveVect.x-resMoveVect.x);
				$(bigg).css('left', getCSSValueInPixels($(bigg).css('left'))-resMoveVect.x);

				console.log(smol.getBoundingClientRect());
			}
		}
	});
	// $(box2).on('mouseenter',(e)=>{
	// 	let elem = e.currentTarget;
	// 	let anim = anime({
	// 		targets: elem,
	// 		top: `${getCSSValueInPixels($(elem).css('top'))-300}`,
	// 		easing: 'linear',
	// 		round: 1,
	// 		duration: 500,
	// 		update: function() {
	// 			collisionObserver.checkUpdates();
	// 		},
	// 	});
	// }).on('mouseleave',(e)=>{
	// 	$(e.currentTarget).stop();
	// });


	// if(
	// 	isColliding(
	// 		simplifyRect(box1.getBoundingClientRect()),
	// 		simplifyRect(box2.getBoundingClientRect())
	// 	)
	// ){
	// 	console.log("colliding");
	// }else{
	// 	console.log("not colliding");
	// }

	// $(box1).on('mouseover',(e)=>{
	// 	console.log(e.currentTarget.getBoundingClientRect());
	// });

	// let graph = new nodesGraph($('svg.ngcont')[0]);

	// graph.createNode('A');
	// graph.createNode('B');
	// graph.createNode('C');

	// graph.createEdge('A','B');
	// graph.createEdge('C','B');
	// graph.createEdge('A','A');

	// graph.renderGraph();

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