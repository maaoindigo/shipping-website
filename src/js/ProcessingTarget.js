//ProcessingTarget.js

import * as myHelper from './myHelperFunctions.js';
Object.entries(myHelper).forEach(([name, exported]) => window[name] = exported);

// var _lock = false;
const setIntervalAsync = (func, time, active, timerData, ...args) => {
	var latency;
	if(!active) return;
	let retry = 10;

	let t = timerData;
	if(!isObject(t)){
		t = {};
	}
	t.timer = setTimeout(()=>{
		let lastTime = window.performance.now();
		func(time,...args).then((res)=>{
			retry = 10;
			let currTime = window.performance.now();
			let tick = (currTime-lastTime);
			latency = tick-(time/1000);
			if(res.update){
				let newTime = (latency*1000/2)+time;
				t.timer = setIntervalAsync(func, newTime, res.active, t, ...args)?.timer;
			}
			else{
				t.timer = setIntervalAsync(func, time, res.active, t, ...args)?.timer;
			}
			// _lock = false;
		},()=>{
			console.log('No Promise returned');
			//repeat with same time
			if(retry<=0) return;
			retry--;
			t.timer = setIntervalAsync(func, time, active, t, ...args)?.timer;
			// _lock = false;
		}).catch((err)=>{
			console.log('Error in Inverval loop');
			//end interval
			// _lock = false;
		});
	},time);

	return t;
};

export class ProcessingTarget extends EventTarget{
	FPS = 15;
	targetName = randomID('[ProcessingTarget:',']');
	connectId = randomID('ConnectID:');
	_processTimer; _physicsProcessTimer;
	_connectedObjects = [];
	_signals = {};
	_startSysTime = 0;
	_lastSysTime = 0; _currSysTime = 0; _deltaSysTime = 0;
	_logs = false;

	_active = false;

	_useIntervals = false;

	_animFrame;

	constructor(opts){
		super();

		this._useIntervals = (opts?.useIntervals ? true : false);
		// this._active = (opts?.active ? true : false);

		// this._processTimer = setIntervalAsync(async(delta)=>{
		// 	this._process(delta/1000);
		// 	return Promise.resolve({
		// 		update: true,
		// 		active: this._active,
		// 	});
		// }, (1000/this.FPS), this._active);

		// this._physicsProcessTimer = setIntervalAsync(async(delta)=>{
		// 	this._physicsProcess(1/this.FPS);
		// 	return Promise.resolve({
		// 		update: false,
		// 		active: this._active,
		// 	});
		// }, (1000/this.FPS), this._active);

		/*this._lastSysTime = window.performance.now();
		this._processTimer = setInterval(()=>{
			this._currSysTime = window.performance.now();
			this._deltaSysTime = (((this._currSysTime-this._lastSysTime)/1000)+(1/this.FPS))/2;
			this._process(this._deltaSysTime);
			this._lastSysTime = this._currSysTime;
		}, (1000*this._deltaSysTime));
		this._physicsProcessTimer = setInterval(()=>{
			this._physicsProcess(1/this.FPS);
		}, (1000/this.FPS));*/

		this._ready();

		if(opts?.active){
			this.activate();
		}
	}

	_preProcess = (timestamp) =>{
		this._currSysTime = window.performance.now();
		this._currSysTime = timestamp||0;
		this._deltaSysTime = (((this._currSysTime-this._lastSysTime)/1000)+(1/this.FPS))/2;
		
		this._process(this._deltaSysTime);
		this._physicsProcess(1/this.FPS);

		this._lastSysTime = this._currSysTime;

		this._animFrame = requestAnimationFrame(this._preProcess);
	}

	_notification(what){

	}

	_ready(){

	}

	_process(delta){

	}

	_physicsProcess(delta){

	}

	createSignal = (name, ...vars)=>{
		var varsObj = {};
		for(var vvar of vars)
			varsObj[vvar] = null;
		var event = new CustomEvent(name,{
			detail:varsObj
		});
		event.data = varsObj;
		this._signals[name]=event;
		if(this._logs) console.log('Signal '+name+' in '+this.targetName+' created');
	}

	removeSignal = (name)=>{
		if(this._signals.hasOwnProperty(name)){
			this._signals[name] = null;
			if(this._logs) console.log('Signal '+name+' in '+this.targetName+' removed');
		}
	}

	emitSignal = (name, vars={}, elems=this._connectedObjects) => {
		var event = null;
		if(!this._signals.hasOwnProperty(name)){
			var varKeys = Object.keys(vars);
			this.createSignal(name,...varKeys);
		}
		event = this._signals[name];

		for(var kkey of Object.keys(vars))
			event.data[kkey] = vars[kkey];
		for(var elem of elems){
			elem.dispatchEvent(event);
		}
	}

	connectElement = (element) => {
		if(element && element instanceof EventTarget){
			var identifier = '';
			if(!element.hasOwnProperty('connectId')){
				element.connectId = randomID('ConnectID:');
				if(element instanceof HTMLElement){
					element.dataset.connectId = element.connectId;
				}
			}
			if(element instanceof Element){
				if(String(element.id)){
					identifier+=' id('+element.id+')';
				}
				if(String(element.className)){
					identifier+=' class('+element.className+')';
				}
				if(String(element.localName)){
					identifier+=' tag('+element.localName+')';
				}
				else{
					identifier+=' tagName('+element.tagName+')';
				}
			}
			identifier += ' ('+element.connectId+')';
			
			if(!hardPush(this._connectedObjects,element,['connectId'])){
				if(this._logs) console.log('Element '+identifier+' is already connected');
				return false;
			}
			else{
				if(this._logs) console.log('Element '+identifier+' connected!');
				return true;
			}
		}
		else{
			if(this._logs) console.log('Element was not valid');
		}
		return false;
	}

	disconnectElement = (element) => {
		if(element && element instanceof EventTarget){
			var identifier = ''; var isDisconnected = false;
			for(var i=0;i < this._connectedObjects.length;i++){
				var elem = this._connectedObjects[i];
				if(elem.connectId===element.connectId){
					this._connectedObjects.splice(i,1);
					isDisconnected = true;
				}
			}
			if(element instanceof Element){
				if(String(element.id)){
					identifier+=' id: '+element.id;
				}
				if(String(element.className)){
					identifier+=' class: '+element.className;
				}
				if(String(element.localName)){
					identifier+=' tag: '+element.localName;
				}
				else{
					identifier+=' tagName:'+element.tagName;
				}
			}
			identifier += ' ('+element.connectId+')';
			
			if(!isDisconnected){
				if(this._logs) console.log('Element '+identifier+' was not connected/already disconnected');
				return false;
			}
			else{
				if(this._logs) console.log('Element '+identifier+' successfully disconnected!');
				return true;
			}
		}
		else{
			if(this._logs) console.log('Element was not valid');
		}
		return false;
	}

	disconnectAllElements = () =>{
		for(var el of this._connectedObjects){
			this.disconnectElement(el);
		}
	}

	connectElements = (elementArr) => {
		if(elementArr && elementArr instanceof Array){
			for(var el of elementArr){
				this.connectElement(el);
			}
		}
	}

	isConnectedToElement = (element) => {
		return findItem(this._connectedObjects,element);
	}
	logsOn = () =>{
		this._logs = true;
	}
	logsOff = () =>{
		this._logs = false;
	}

	activate = () => {
		if(this._active) return;
		this._active = true;

		if(this._useIntervals){
			console.log(9)
			this._processTimer = setIntervalAsync(async(delta)=>{
				this._currSysTime = window.performance.now();
				this._deltaSysTime = (((this._currSysTime-this._lastSysTime)/1000)+(1/this.FPS)+(delta))/3;
				this._process(this._deltaSysTime);
				this._lastSysTime = this._currSysTime;

				return Promise.resolve({
					update: true,
					active: this._active,
				});
			}, (1000/this.FPS), this._active, this._processTimer);

			this._physicsProcessTimer = setIntervalAsync(async(delta)=>{
				this._currSysTime = window.performance.now();
				this._deltaSysTime = (((this._currSysTime-this._lastSysTime)/1000)+(1/this.FPS)+(delta))/3;
				this._physicsProcess(1/this.FPS);
				this._lastSysTime = this._currSysTime;
				return Promise.resolve({
					update: false,
					active: this._active,
				});
			}, (1000/this.FPS), this._active, this._physicsProcessTimer);
		}else{
			this._lastSysTime = window.performance.now();
			this._preProcess(this._lastSysTime);
		}
		

		
	}
	deactivate = () => {
		if(!this._active) return;
		this._active = false;

		if(this._useIntervals){
			if(this._processTimer?.timer){
				clearTimeout(this._processTimer.timer);
			}
			if(this._physicsProcessTimer?.timer){
				clearTimeout(this._physicsProcessTimer.timer);
			}
		}else{
			if(this._animFrame){
				cancelAnimationFrame(_animFrame);
				_animFrame = null;
			}
		}
	}
}