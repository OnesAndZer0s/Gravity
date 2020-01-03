//javascript:(function(){var i=0, s, ss = ['https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.14.2/matter.min.js', 'https://cdn.jsdelivr.net/gh/OnesAndZer0s/Gravity/index.js'];function addFunc(){s = document.createElement('script'); s.src = ss[i]; document.body.appendChild(s); s.onload = function(){i++; if (i<ss.length){addFunc()}}}addFunc() })()

let nodes = [];
/*var BORDER_STYLE = "1px solid #bbb"; */
function StickyNodes() {
		var grid = [],
		GRIDX = 100,
		GRIDY = 100,
		REPLACE_WORDS_IN = {
			a: 1, b: 1, big: 1, body: 1, cite: 1, code: 1, dd: 1, div: 1,
			dt: 1, em: 1, font: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1,
			i: 1, label: 1, legend: 1, li: 1, p: 1, pre: 1, small: 1,
			span: 1, strong: 1, sub: 1, sup: 1, td: 1, th: 1, tt: 1
		};

	function addDomNode(el) {
		if (el !== undefined && el !== null) {
			el.khIgnore = true;
			/*el.style.border = BORDER_STYLE;*/
			nodes.push(el);
		}
	}
	this.addDomNode = addDomNode;

	this.addWords = function (el) {
		var textEls = [];

		function shouldAddChildren(el) {
			return el.tagName && REPLACE_WORDS_IN[el.tagName.toLowerCase()];
		}

		function buildTextEls(el, shouldAdd) {
			var i, len;
			if (shouldAdd && el.nodeType === Node.TEXT_NODE &&
				el.nodeValue.trim().length > 0) {
				textEls.push(el);
				return;
			}
			if (!el.childNodes || el.khIgnore) {
				return;
			}
			shouldAdd = shouldAddChildren(el);
			for (i = 0, len = el.childNodes.length; i < len; i++) {
				buildTextEls(el.childNodes[i], shouldAdd);
			}
		}

		function wordsToSpans(textEl) {
			var p = textEl.parentNode,
				words = textEl.nodeValue.split(/\s+/),
				ws = textEl.nodeValue.split(/\S+/),
				i, n, len = Math.max(words.length, ws.length);
			/* preserve whitespace for pre tags. */
			if (ws.length > 0 && ws[0].length === 0) {
				ws.shift();
			}
			for (i = 0; i < len; i++) {
				if (i < words.length && words[i].length > 0) {
					n = document.createElement('span');
					n.innerHTML = words[i];
					p.insertBefore(n, textEl);
					addDomNode(n);
				}
				if (i < ws.length && ws[i].length > 0) {
					n = document.createTextNode(ws[i]);
					p.insertBefore(n, textEl);
				}
			}
			p.removeChild(textEl);
		}

		buildTextEls(el, shouldAddChildren(el));
		textEls.map(wordsToSpans);
	};

	/* includes el. */
	this.addTagNames = function (el, tagNames) {
		var tname = el.tagName && el.tagName.toLowerCase(),
			i, j, els, len;
		if (el.khIgnore) {
			return;
		}
		if (tagNames.indexOf(tname) !== -1) {
			addDomNode(el);
		}
		if (!el.getElementsByTagName) {
			return;
		}
		for (i = 0; i < tagNames.length; i++) {
			els = el.getElementsByTagName(tagNames[i]);
			for (j = 0, len = els.length; j < len; j++) {
				if (!els[j].khIgnore) {
					addDomNode(els[j]);
				}
			}
		}
	};

	this.finalize = function (docW, docH) {
		var xi, yi, i, len, startXI, startYI, el, go, off, w, h,
			endXI = Math.floor(docW / GRIDX) + 1,
			endYI = Math.floor(docH / GRIDY) + 1;
		/* initialize grid. */
		grid = new Array(endXI);
		for (xi = 0; xi < endXI; xi++) {
			grid[xi] = new Array(endYI);
		}
		/* add nodes into grid. */
		for (i = 0, len = nodes.length; i < len; i++) {
			el = nodes[i];
			if (el.khPicked) {
				continue;
			}
			off = jQuery(el).offset();
			w = jQuery(el).width();
			h = jQuery(el).height();
			go = {
				el: nodes[i], /* dom element. */
				left: off.left,
				right: off.left + w,
				top: off.top,
				bottom: off.top + h,
				w: w,
				h: h,
				x: off.left + (w / 2),    /* center x. */
				y: off.top + (h / 2),    /* center y. */
				diag: Math.sqrt(((w * w) + (h * h)) / 4), /* center to corner */

				/* these are for removing ourselves from the grid. */
				arrs: [], /* which arrays we're in (grid[x][y]). */
				idxs: []  /* what indexes. */
			};
			startXI = Math.floor(go.left / GRIDX);
			startYI = Math.floor(go.top / GRIDY);
			endXI = Math.floor((go.left + go.w) / GRIDX) + 1;
			endYI = Math.floor((go.top + go.h) / GRIDY) + 1;
			for (xi = startXI; xi < endXI; xi++) {
				for (yi = startYI; yi < endYI; yi++) {
					if (grid[xi] === undefined) {
						grid[xi] = [];
					}
					if (grid[xi][yi] === undefined) {
						grid[xi][yi] = [go];
					} else {
						grid[xi][yi].push(go);
					}
					go.arrs.push(grid[xi][yi]);
					go.idxs.push(grid[xi][yi].length - 1);
				}
			}
		}
	};

	function removeGridObj(go) {
		var i;
		for (i = 0; i < go.arrs.length; i++) {
			go.arrs[i][go.idxs[i]] = undefined;
		}
		go.el.style.visibility = "hidden";
		go.el.khPicked = true;
		delete go.arrs;
		delete go.idxs;
	}

	/**
	 * cb(gridObj) -> boolean true if the object should be removed.
	 */
	this.removeIntersecting = function (x, y, r, cb) {
		var xi, yi, arr, i, r2 = r * r, go,
			startXI = Math.floor((x - r) / GRIDX),
			startYI = Math.floor((y - r) / GRIDY),
			endXI = Math.floor((x + r) / GRIDX) + 1,
			endYI = Math.floor((y + r) / GRIDY) + 1;
		for (xi = startXI; xi < endXI; xi++) {
			if (grid[xi] === undefined) {
				continue;
			}
			for (yi = startYI; yi < endYI; yi++) {
				arr = grid[xi][yi];
				if (arr === undefined) {
					continue;
				}
				for (i = 0; i < arr.length; i++) {
					go = arr[i];
					if (go !== undefined &&
						circleGridObjInt(x, y, r, r2, go) &&
						cb(go)) {
						removeGridObj(go);
					}
				}
			}
		}
	};
}


var newScript = document.createElement("script"); 
newScript.src = "https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.14.2/matter.min.js";
document.body.appendChild(newScript);
newScript.onload = function () {
	var s = new StickyNodes();
s.addWords(document.body);
		for (i = 0, len = document.body.childNodes.length; i < len; i++) {
			el = document.body.childNodes[i];
			s.addTagNames(el, [
				'button', 'input', 'select', 'textarea'
			]);
			//img, iframe, canvas
		}

console.log("loaded")
	var Engine = Matter.Engine, Render = Matter.Render, World = Matter.World, Bodies = Matter.Bodies;
	var engine = Engine.create();

	var elmntPhy = [], elmnt = [];
	for (var i = 0; i < nodes.length; i++) {
		dim = nodes[i].getBoundingClientRect();
		if (dim.width !== 0 || dim.height !== 0 || dim.x !== 0 || dim.y !== 0) {
			nodes[i].style.position = "absolute";
			nodes[i].style.overflow = "hidden";
			nodes[i].style.userSelect = "none";
			nodes[i].style.userDrag = "none";
			nodes[i].draggable = false;



			var body = Bodies.rectangle(dim.x + 18, dim.y, dim.width, dim.height);
			elmntPhy.push(body);
			elmnt.push([nodes[i], body, dim]);
		};
	}

	elmntPhy.push(Bodies.rectangle(window.innerWidth / 2, -100, 1000000, 200, { isStatic: true }));
	elmntPhy.push(Bodies.rectangle(window.innerWidth / 2, document.documentElement.scrollHeight + 100, 1000000, 200, { isStatic: true }));
	elmntPhy.push(Bodies.rectangle(-100, document.documentElement.scrollHeight, 200, 1000000, { isStatic: true }));
	elmntPhy.push(Bodies.rectangle(window.innerWidth + 100, document.documentElement.scrollHeight, 200, 1000000, { isStatic: true }));

	World.add(engine.world, elmntPhy);

	var mouse = Matter.Mouse.create(document.documentElement),
		mouseContraint = Matter.MouseConstraint.create(engine, {
			mouse: mouse,
			contraint: { stiffness: 0.2 }
		});

	World.add(engine.world, mouseContraint);

	(function run() {
		window.requestAnimationFrame(run);
		for (var i = 0; i < elmnt.length; i++) {
			elmnt[i][0].style.transform = "rotate(" + elmnt[i][1].angle + "rad)";
			elmnt[i][0].style.left = (elmnt[i][1].position.x - (elmnt[i][2].width / 2)) + "px";
			elmnt[i][0].style.top = (elmnt[i][1].position.y - (elmnt[i][2].height / 2)) + "px";
		};
		Engine.update(engine, 16);
	})();
}
