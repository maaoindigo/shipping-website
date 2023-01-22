//Position Observer

import {ProcessingTarget} from "./ProcessingTarget.js";

import * as myHelper from './myHelperFunctions.js';
Object.entries(myHelper).forEach(([name, exported]) => window[name] = exported);

//https://stackoverflow.com/questions/5598743/finding-elements-position-relative-to-the-document
//https://stackoverflow.com/a/26230989
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
	return {
		top: rect?.top,
		bottom: rect?.bottom,
		left: rect?.left,
		right: rect?.right,
		x: rect?.x,
		y: rect?.y,
		width: rect?.width,
		height: rect?.height,
	};
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

export class PositionObserver extends ProcessingTarget{

	elements = new Map();

	callback = (entries) => {}

	constructor(callback=null, opts={}){
		super(opts);

		this.FPS = (isNumber(opts?.FPS))?opts?.FPS:null || 12;

		if(isFunction(callback)){
			this.callback = callback;
		}
	}

	checkUpdates = () => {
		this._positionCheck(1/this.FPS);
	}

	_physicsProcess(delta){
		try {
			this._positionCheck(delta);
		} catch(err) {
			console.log(err);
			throw err;
		}
	}

	_positionCheck(delta){

		let entries = [];
		for(let elem of this._connectedObjects){

			let currTime = window.performance.now();

			let elemData = this.elements.get(elem);

			let currRect = getRectInfo(getBoundingDocRect(elem), elemData?.options);
			let oldRect = elemData.filteredRect;

			if(!shallowEqual(currRect, oldRect)){
				//implies rect change
				let entry = {};
				entry = {
					target: elem,
					_currentProcessTime: window.performance.now(),
					_oldProcessTime: elemData._processTime,
					oldRect: elemData.rect,
					oldFilteredRect: elemData.filteredRect,
					newRect: simplifyRect(getBoundingDocRect(elem)),
					newFilteredRect: currRect,
					oldTime: elemData.time,
					currentTime: new Date(),

					get timeTaken(){
						return Math.abs(entry.currentTime - entry.oldTime);
					},

					get velocity(){
						let v = new Vector2(
							entry.newRect.x-entry.oldRect.x,
							entry.newRect.y-entry.oldRect.y,
						);

						return v.length();
					},
					get directionAngle(){
						let v = new Vector2(entry.directionVector);

						return v.angle();
					},

					get moveVector(){
						let v = new Vector2(
							entry.newRect.x-entry.oldRect.x,
							entry.newRect.y-entry.oldRect.y,
						);

						// v = v.normalized;
						return v.asObject();
					},
					get resizeVector(){
						let v = new Vector2(
							entry.newRect.width-entry.oldRect.width,
							entry.newRect.height-entry.oldRect.height,
						);

						// v = v.normalized;
						return v.asObject();
					},
					get directionVector(){
						return new Vector2(entry.moveVector).normalized().asObject();
					},
					get scaleVector(){
						return new Vector2(entry.resizeVector).normalized().asObject();
					},
				}

				let velDiff = (new Vector2(entry.moveVector).length() - new Vector2(elemData.moveVector).length());
				let timeDiff = (entry.timeTaken - elemData.timeTaken)

				if(timeDiff==0){
					entry.acceleration = Infinity;
				}else if(timeDiff==Infinity||timeDiff==-Infinity){
					entry.acceleration = 0;
				}else{
					entry.acceleration = (velDiff/timeDiff);
				}

				entry.displacement = (entry.velocity * entry.timeTaken);

				entries.push(entry);

				this.emitSignal('positionChange',{entry:entry, observer:this},[entry.target]);

				//update elem data
				elemData.time = entry.currentTime;
				elemData._processTime = entry._currentProcessTime;
				elemData.directionVector = entry.directionVector;
				elemData.moveVector = entry.moveVector;
				elemData.scaleVector = entry.scaleVector;
				elemData.resizeVector = entry.resizeVector;
				elemData.rect = entry.newRect;
				elemData.filteredRect = entry.newFilteredRect;
				elemData.timeTaken = entry.timeTaken;

			}

		}

		if(entries.length){
			try{
				this.callback(entries, this);
			}catch(err){
				console.log(err);
			}
		}

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
				_processTime: window.performance.now(),
				time: new Date(),
				timeTaken: 0,
				directionVector: {x:0,y:0},
				moveVector: {x:0,y:0},
				scaleVector: {x:0,y:0},
				resizeVector: {x:0,y:0},
				target:elem,
			};

			for(let k of Object.keys(opts)){
				if(opts[k]===false){
					data.options[k] = false;
				}
				if(opts[k]===true){
					data.options[k] = true;
				}
			}

			data.rect = simplifyRect(getBoundingDocRect(elem));
			data.filteredRect = getRectInfo(getBoundingDocRect(elem), data.options);

			this.elements.set(elem, data);
			this.connectElement(elem);
		}
	}

}