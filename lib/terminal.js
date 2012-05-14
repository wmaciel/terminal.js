var util = require('./util');
var ansi = require('./ansi');
var csi = require('./csi');
var character = require('./character');

var escapeHandler = {}
escapeHandler[csi.chr] = csi.exec
escapeHandler[ansi.chr] = ansi.exec

function Terminal(width, height, attr) {
	this.scrollBack = [];
	this.width = width || 80;
	this.height = height || 24;
	this.lineAttr = {
		doubletop: false,
		doublebottom: false,
		doublewidth: false
	};
	this.defaultAttr = util.extend({
		fg: 15,
		bg: 0,
		bold: false,
		underline: false,
		blink: false,
		inverse: false,
		graphics: false
	}, attr || {});
	this.reset();
}

Terminal.prototype = {
	createChar: function() {
		return {chr: " ", attr: {}};
	},
	createLine: function() {
		return {line: [], attr: {}};
	},
	write: function(data, encoding) {
		// Convert Buffers to strings
		if(typeof data !== 'string')
			data = data.toString(encoding);
		// if there's an unfinished escape sequence
		if(this.escapeBuffer !== null) {
			data = this.escapeBuffer + data;
		}
		for(var i = 0; i < data.length && i >= 0; i++) {
			if(data[i] === '\x1b') { // ESCAPE
				var len = this.escapeWrite(data.substr(i));
				if(len == 0)
					return true;
				i += len - 1;
			}
			else {
				character.exec(this, data[i]);
			}
		}
		return true;
	},
	escapeWrite: function(data) {
		var cmd = data[1];
		var handler = (escapeHandler[data[1]] || escapeHandler[""])
		var len = 0;
		if(cmd === undefined || (len = handler(this, data)) == 0)
			this.escapeBuffer = data;
		return len;
	},
	inject: function(str) {
		for(var i = 0; i < str; i++) {
			if(this.mode.insert && this.getLine().line[c.x])
				this.insert
		}
	},
	mvCur: function(x, y) {
		return this.setCur({
			x: this.cursor.x + x,
			y: this.cursor.y + y
		});
	},
	setCur: function(cur) {
		var inbound = 0;
		if(cur.x < 0)
			cur.x = 0;
		else if(cur.x > this.width)
			cur.x = this.width;
		else
			inbound++;

		if(cur.y < 0)
			cur.y = 0;
		else if(cur.y >= this.width)
			cur.y = this.width - 1;
		else
			inbound++;

		return inbound === 2;
	},
	mvTab: function(n) {
		var nx = this.cursor.x;
		var tabMax = this.tabs[this.tabs.length - 1] || 0;
		var positive = n > 0;
		n = Math.abs(n);
		while(n != 0 && nx > 0 && nx < this.width-1) {
			nx += positive ? 1 : -1;
			if(util.indexOf(this.tabs, nx) != -1 || (nx > tabMax && nx % 8 == 0))
				n--;
		}
		this.setCur({x: nx});
	},
	tabSet: function() {
		this.tabs.push(this.cursor.x);
		this.tabs.sort();
	},
	tabClear: function(n) {
		switch(n || 'current') {
		case 'current':
		case 0:
			for(var i = this.tabs.length - 1; i >= 0; i--) {
				if(this.tabs[i] < this.cursor.x) {
					this.tabs.splice(i, 1);
					break;
				}
			}
			break;
		case 'all':
		case 3:
			this.tabs = [];
			break;
		}
	},
	saveCursor: function() {
		this.savedCursor.x = this.cursor.x;
		this.savedCursor.y = this.cursor.y;
	},
	restoreCursor: function() {
		this.setCur(this.savedCursor);
	},
	deleteCharacter: function(n) {
		var line = this.getLine().line;
		line.splice(this.cursor.x, n || 1);
	},
	eraseInDisplay: function(n) {
		switch(n || 'toEnd') {
		case 'toEnd':
		case '0':
			this.buffer.splice(this.cursor.y);
			break;
		case 'toBegin':
		case '1':
			var args = [0, this.cursor.y-1, Array(this.cursor.y-1)];
			Array.prototype.splice.apply(this.buffer, args);
			break;
		case 'entire':
		case '2':
			this.buffer.splice(0);
			return;
		}
		return this.eraseLine(type);
	},
	eraseInLine: function(n) {
		var line = this.getLine();
		line.changed = true;
		switch(n || 'toEnd') {
		case '0':
		case 'toEnd':
			line.line.splice(this.cursor.x);
			break;
		case '1':
		case 'toBegin':
			var args = new Array(this.cursor.x+1);
			args.unshift(0, this.cursor.x+1);
			Array.prototype.splice.apply(line.line, args);
			while(line.line[line.line.length - 1] !== undefined)
				line.line.pop();
			break;
		case '2':
		case 'entire':
			line.line.splice(0);
			break;
		}
		return this;
	},
	deleteLine: function(n) {
		this.buffer.splice(this.cursor.y, n || 1);
	},
	resetAttr: function() {
		if(arguments.length === 0) {
			this.attr = this.defaultAttr;
			this.attrCommited = true;
		}
		for(var i = 0; i < arguments.length; i++)
			this.chAttr(arguments[i], this.defaultAttr[arguments[i]]);
	},
	chAttr: function(name, value) {
		if(this.attrCommited == true) {
			this.attr = util.extend({}, this.attr);
			delete this.attr.str
		}
		this.attr[name] = value;
		this.attrCommited = false;
	},
	reset: function() {
		this.defaultBuffer = []
		this.altBuffer = []
		this.buffer = this.defaultBuffer;
		this.mode = {
			appkeypad: false,
			wrap: false,
			insert: false,
			crlf: true,
			mousebtn: false,
			mousemtn: false,
			reverse: false
		}
		this.attr = util.extend({}, this.defaultAttr);
		this.attrCommited = true;
		this.scrollArea = { from: 0, to: this.height };
		this.cursor = {x:0,y:0};
		this.savedCursor = {x:0,y:0};
		this.tabs = [];
		this.escapeBuffer = null;
	},
	toString: function(locateCursor) {
		var ret = []
		if(locateCursor) {
			ret.push(Array(this.cursor.x+2).join(' ') + 'v')
		}
		for(var i = 0; i < this.buffer.length; i++) {
			var line = []
			if(locateCursor) {
				line.push((this.buffer[i] && this.buffer[i].changed) ? "*" : " ")
				line.push(i == this.cursor.y ? ">" : " ")
			}
			if(this.buffer[i])
				for(var j = 0; j < this.buffer[i].line.length; j++) {
					line.push(this.buffer[i].line[j] ? (this.buffer[i].line[j].chr || ' ') : ' ');
				}
				while(line[line.length-1] === ' ') line.pop();
			ret.push(line.join(''));
		}
		if(locateCursor)
			ret.push(Array(this.cursor.x+2).join(' ') + '^');
		return ret.join('\n');
	},
}

exports.Terminal = Terminal;