//Collision Observer

import {PositionObserver, ProcessingTarget} from "./PositionObserver.js";

import * as myHelper from './myHelperFunctions.js';
Object.entries(myHelper).forEach(([name, exported]) => window[name] = exported);

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

function getRectInfo(rect, opts){
	let newRect = {};

	if(opts?.top) newRect.top = rect?.top;
	if(opts?.bottom) newRect.bottom = rect?.bottom;
	if(opts?.left) newRect.left = rect?.left;
	if(opts?.right) newRect.right = rect?.right;

	if(opts?.x) newRect.x = rect?.x;
	if(opts?.y) newRect.y = rect?.y;
	if(opts?.width) newRect.width = rect?.width;
	if(opts?.height) newRect.height = rect?.height;

	return newRect;
}

function isCollidingByLayers(collisionLayers, groupLayers){
	if(isArray(collisionLayers) && isArray(groupLayers)){
		for(let cLayer of collisionLayers){
			if(groupLayers.includes(cLayer)) return true;
		}
	}
	

	return false;
}

function isColliding(rectA, rectB, threshold=0){
	if(
		(rectA.right + threshold) < (rectB.left - threshold) ||
		(rectA.left - threshold) > (rectB.right + threshold) ||
		(rectA.bottom + threshold) < (rectB.top - threshold) ||
		(rectA.top - threshold) > (rectB.bottom + threshold)
	)
		return false;
	return true;
}

export class CollisionObserver extends PositionObserver{

	constructor(callback=null, opts={}){
		super(callback, opts);
	}

	getElementData = (elem) => {
		return this.elements.get(elem);
	}

	_lock = false;

	_positionCheck(delta){

		while(this._lock){};
		this._lock = true;
		// let entries = [];
		let collisionEntries = [];
		for(let elem of this._connectedObjects){

			let currTime = window.performance.now();

			let elemData = this.elements.get(elem);

			let currRect = getRectInfo(getBoundingDocRect(elem), elemData?.options);
			let oldRect = elemData.filteredRect;

			if(true){
				elemData.collisionTargets.forEach((targ,i,targs)=>{
					if(targ._exit){
						arrayRemove(targs, targ);
					}
				});

				//implies rect change

				let entry = {};
				entry = {
					target: elem,
					_oldProcessTime: elemData._processTime||0,
					oldTime: elemData.time,
					currentTime: new Date(),
				}
				entry._currentProcessTime = (elemData._processTime||0) + delta;
				entry.oldRect = elemData.rect;
				entry.newRect = simplifyRect(getBoundingDocRect(elem));
				entry.oldFilteredRect = elemData.filteredRect;
				entry.newFilteredRect = currRect;
				entry.oldVelocity = elemData.velocity;
				entry.oldTimeTaken = elemData.timeTaken;
				entry._oldProcessTimeTaken = elemData._processTimeTaken||0;

				entry.timeTaken = Math.abs(entry.currentTime - entry.oldTime);
				entry._processTimeTaken = Math.abs(entry._currentProcessTime - entry._oldProcessTime);
				entry.moveVector = new Vector2(
					entry.newRect.x-entry.oldRect.x,
					entry.newRect.y-entry.oldRect.y,
				).asObject();
				entry.resizeVector = new Vector2(
					entry.newRect.width-entry.oldRect.width,
					entry.newRect.height-entry.oldRect.height,
				).asObject();
				entry.directionVector = new Vector2(
					entry.newRect.x-entry.oldRect.x,
					entry.newRect.y-entry.oldRect.y,
				).normalized().asObject();
				entry.scaleVector = new Vector2(
					entry.newRect.width-entry.oldRect.width,
					entry.newRect.height-entry.oldRect.height,
				).normalized().asObject();
				entry.directionAngle = new Vector2(
					entry.newRect.x-entry.oldRect.x,
					entry.newRect.y-entry.oldRect.y,
				).angle();
				entry.velocity = new Vector2(
					entry.newRect.x-entry.oldRect.x,
					entry.newRect.y-entry.oldRect.y,
				).length();

				let velDiff = (entry.velocity - elemData.velocity);
				let timeDiff = (entry.timeTaken - elemData.timeTaken);
				// let timeDiff = (entry._processTimeTaken);

				if(timeDiff==0 && velDiff==0){
					entry.acceleration = 0;
				}else if(timeDiff==0){
					entry.acceleration = Infinity;
				}else if(timeDiff==Infinity||timeDiff==-Infinity){
					entry.acceleration = 0;
				}else{
					entry.acceleration = (velDiff/timeDiff);
				}

				entry.displacement = (entry.velocity * entry.timeTaken);
				
				collisionEntries.push(entry);
				
				//update elem data
				elemData.time = entry.currentTime;
				elemData._processTime = entry._currentProcessTime;
				elemData._processTimeTaken = entry._processTimeTaken;
				elemData.directionVector = entry.directionVector;
				elemData.moveVector = entry.moveVector;
				elemData.scaleVector = entry.scaleVector;
				elemData.resizeVector = entry.resizeVector;
				elemData.velocity = entry.velocity;
				elemData.rect = entry.newRect;
				elemData.filteredRect = entry.newFilteredRect;
				elemData.timeTaken = entry.timeTaken;

				if(!shallowEqual(currRect, oldRect)){
					this.emitSignal('positionChange',{entry:entry, observer:this},[entry.target]);
				}

			}

		}

		this._lock = false;
		
		if(collisionEntries.length){
			this._collisionCheck(collisionEntries);
		}
		// colls.forEach((coll)=>{
		// 	this.emitSignal('collision',coll,[coll.target]);
		// });
	}

	static isColliding = isColliding;
	static isCollidingByLayers = isCollidingByLayers;

	static isAdvancedColliding(){

		return false;
	}

	_collisionCheck(posEntries){
		let entries = [];

		// console.log(9);
		for(let ent of posEntries){
			let elemData = this.elements.get(ent.target);
			let newCollisionTargets = [];

			let newElems = this._connectedObjects.slice();

			newElems = newElems.filter((elem)=>{
				for(let t of elemData.collisionTargets){
					if(t.target == elem) return false;
				}
				return true;
			});

			for(let targCollData of elemData.collisionTargets){
				targCollData._old = true;

				let targ = targCollData.target;
				let targData = this.elements.get(targ);

				if(ent.target == targ || ent.target.dataset?.connectId == targ.dataset?.connectId){
					continue;
				}

				if(targ._exit){
					continue;
				}

				let elemRect = ent.newRect;
				let targRect = targData.rect;

				let collRect = simplifyRect({
					top: (elemRect.top > targRect.top)?elemRect.top:targRect.top,
					left: (elemRect.left > targRect.left)?elemRect.left:targRect.left,
					bottom: (elemRect.bottom < targRect.bottom)?elemRect.bottom:targRect.bottom,
					right: (elemRect.right < targRect.right)?elemRect.right:targRect.right,
				});

				let collLayers = targData.groupLayers.filter((layer)=>{
					return elemData.collisionLayers.includes(layer);
				});

				if(!shallowEqual(collRect, targCollData.rect)){
					let entry = {
						target: ent.target,
						collisionData: {
							target: targ,
							collisionRect: collRect,
							rect: collRect,
							collisionLayers: collLayers,
							layers: collLayers,
							_exit:false,
						},
						collisionLayers: elemData.collisionLayers,
						groupLayers: elemData.groupLayers,
						positionEntry: ent,
						timeElapsed: ent.timeTaken,
						isOut: false,
						isIn: false,
						type: 'update',
					};

					entries.push(entry);
				}


				if(
					!(isCollidingByLayers(elemData.collisionLayers, targData.groupLayers) && isColliding(elemRect, targRect))
					
				){
					// console.log(3)
					if(elemData.advancedCollision){
						// CollisionObserver.isAdvancedColliding()

					}

					targCollData._exit = true;

					let entry = {
						target: ent.target,
						collisionData: {
							target: targ,
							collisionRect: collRect,
							rect: collRect,
							collisionLayers: collLayers,
							layers: collLayers,
							_exit:true,
						},
						collisionLayers: elemData.collisionLayers,
						groupLayers: elemData.groupLayers,
						positionEntry: ent,
						timeElapsed: ent.timeTaken,
						isOut: true,
						isIn: false,
						type: 'exit',
					};

					entries.push(entry);

				}

				// targCollData.collisionRect = collRect;
				// targCollData.collisionLayers = collLayers;
			}

			entries.forEach((_targ)=>{
				for(let i=0; i<elemData.collisionTargets.length;i++){
					let targ = elemData.collisionTargets[i];
					if(targ.target == _targ.target || targ.target.dataset.connectId == _targ.target.dataset.connectId){
						let x = arrayRemove(elemData.collisionTargets, targ);
						console.log(x);
						return;
					}
				}
			});

			// let hasCollision = false;
			for(let targ of newElems){
				if(ent.target == targ || ent.target.dataset?.connectId == targ.dataset?.connectId){
					continue;
				}

				let targData = this.elements.get(targ);

				let elemRect = ent.newRect;
				let targRect = targData.rect;
				if(
					(isCollidingByLayers(elemData.collisionLayers, targData.groupLayers) && isColliding(elemRect, targRect))
				){
					// console.log(3)
					if(elemData.advancedCollision){
						// CollisionObserver.isAdvancedColliding()

					}

					let collRect = simplifyRect({
						top: (elemRect.top > targRect.top)?elemRect.top:targRect.top,
						left: (elemRect.left > targRect.left)?elemRect.left:targRect.left,
						bottom: (elemRect.bottom < targRect.bottom)?elemRect.bottom:targRect.bottom,
						right: (elemRect.right < targRect.right)?elemRect.right:targRect.right,
					});

					let collLayers = targData.groupLayers.filter((layer)=>{
						return elemData.collisionLayers.includes(layer);
					});

					let entry = {
						target: ent.target,
						collisionData: {
							target: targ,
							collisionRect: collRect,
							rect: collRect,
							collisionLayers: collLayers,
							layers: collLayers,
							_exit:false,
						},
						collisionLayers: elemData.collisionLayers,
						groupLayers: elemData.groupLayers,
						positionEntry: ent,
						timeElapsed: ent.timeTaken,
						isOut: false,
						isIn: true,
						type:'enter'
					};

					entries.push(entry);

					newCollisionTargets.push(entry.collisionData);

				}
			}

			newCollisionTargets.forEach((t)=>{
				hardPush(elemData.collisionTargets,t);
			});

		}

		if(entries.length){
			try{
				this.callback(entries, this);
			}catch(err){
				console.log(err);
			}
		}

		entries.forEach((ent)=>{
			this.emitSignal('collision',{entry:ent,observer:this},[ent.target]);
			switch(ent.type){
				case 'exit':
					this.emitSignal('collisionExit',{entry:ent,observer:this},[ent.target]);
					break;
				case 'enter':
					this.emitSignal('collisionEnter',{entry:ent,observer:this},[ent.target]);
					break;
				case 'update':
					this.emitSignal('collisionUpdate',{entry:ent,observer:this},[ent.target]);
					break;
				default:
					break;
			}

		});

	}
	observe = (elem, opts={}) => {
		if(!isObject(opts))
			opts = {};
		if(isArray(elem)){
			let arr = elem;
			for(let _elem of arr){
				this.observe(elem,opts);
			}
			return;
		}else if(elem instanceof Element){

			let data = {
				options:{
					top:true, bottom:true, right:true, left:true,
					x:true, y:true, width:true, height:true
				},
				_processTime: 0,
				_processTimeTaken: 0,
				time: new Date(),
				timeTaken: 0,
				directionVector: {x:0,y:0},
				moveVector: {x:0,y:0},
				scaleVector: {x:0,y:0},
				resizeVector: {x:0,y:0},
				velocity: 0,
				collisionTargets: [],
				groupLayers: [],
				collisionLayers: [],
				target:elem,
				rect: {},
				filteredRect: {},
				advancedCollision: (opts?.advancedCollision?true:false),
				threshold: (isNumber(opts?.threshold)?opts.threshold:0),
			};

			for(let k of Object.keys(opts)){
				if(opts[k]===false){
					data.options[k] = false;
				}
				if(opts[k]===true){
					data.options[k] = true;
				}

			}

			if(isArray(opts?.groupLayers)){
				for(let layer of opts.groupLayers){
					data.groupLayers.push(layer);
				}
			}
			if(isArray(opts?.collisionLayers)){
				for(let layer of opts.collisionLayers){
					data.collisionLayers.push(layer);
				}
			}

			data.rect = simplifyRect(getBoundingDocRect(elem));
			data.filteredRect = getRectInfo(getBoundingDocRect(elem), data.options);

			this.elements.set(elem, data);
			this.connectElement(elem);
		}
	}

}