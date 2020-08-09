import { FormatUtils } from './format-utils.js';
import { Vec2        } from './maths.js';

export class DOMUtils {
	//Return the textContent of the dom element with the given ID
	static getContent(id) {
		return document.getElementById(id).textContent;
	}

	//Return a dictionary holding all the parameters contained in the URL
	static getURLParameters() {
		const urlSearchParams = new URLSearchParams(window.location.search);
		let paramsDict = {};

		for(const param of urlSearchParams.entries()) 
			paramsDict[param[0]] = param[1]; 

		return paramsDict;
	}

	//Build the query part of an URL with the given parameters
	static buildURLParameters(urlParamsDictionary) {
		let params = '?';

		for(const [k, v] of Object.entries(urlParamsDictionary))
			params += `${k}=${v}&`;

		return params.slice(0, -1);
	}

	//Change the current webpage to the target one, with the given parameters added as a query
	static redirect(targetURL, urlParamsDictionary) {
		let urlParams = DOMUtils.buildURLParameters(urlParamsDictionary);
		window.location.href = targetURL + urlParams;
	}

	//Draw the given curve on the svg area
	static plotCurveToSVG(points, svgPlot, thickness = 1, color = "\#000000", backgroundColor = "", loopToStart = false) {
		let svgNS = "http://www.w3.org/2000/svg";
		let w     = Number(svgPlot.width.baseVal.value);
		let h     = Number(svgPlot.height.baseVal.value);

		if(FormatUtils.isColor(backgroundColor)) {
			let svgBckg = document.createElementNS(svgNS, "rect");
			svgBckg.setAttribute("x", 0);
			svgBckg.setAttribute("y", 0);
			svgBckg.setAttribute("width", w);
			svgBckg.setAttribute("height", h);
			svgBckg.setAttribute("fill", backgroundColor);
			svgPlot.appendChild(svgBckg);
		}

		if(points.length > 0) {
			//Build the svg path
			let svgPath = `M${points[0].x} ${h - points[0].y} `;
			for(let i = 1; i < points.length; i++)
				svgPath += `L${points[i].x} ${h - points[i].y} `;
			if (loopToStart === true)
				svgPath += 'Z';

			//Draw the curve on the svg
			let path = document.createElementNS(svgNS, "path");
			path.setAttribute("d", svgPath);
			path.setAttribute("stroke", color);
			path.setAttribute("stroke-width", thickness);
			path.setAttribute("stroke-linejoin", "round");
			path.setAttribute("stroke-linecap", "round");
			path.setAttribute("fill", "none");
			svgPlot.appendChild(path);
		}
	}

	static plotPointsToSvg(points, svgPlot, radius = 1, color = "\#000000") {
		let svgNS = "http://www.w3.org/2000/svg";
		let h     = Number(svgPlot.height.baseVal.value);

		for(let i = 0; i < points.length; i++) {
			let p = document.createElementNS(svgNS, "ellipse");
			p.setAttribute("cx", points[i].x);
			p.setAttribute("cy", h - points[i].y);
			p.setAttribute("rx", radius);
			p.setAttribute("ry", radius);
			p.setAttribute("fill", color);
			svgPlot.appendChild(p);

			/*
			let t = document.createElementNS(svgNS, 'text');
			t.setAttribute('x', points[i].x);
			t.setAttribute('y', h - points[i].y);
			t.setAttribute('fill', '#000');
			t.textContent = i;
			svgPlot.appendChild(t);
			*/
		}
	}

	static plotVerticalAreaToSVG(xBounds, svgPlot, borderThickness = 1, lineColor = "\#000000", areaColor = "\#000000") {
		let svgNS = "http://www.w3.org/2000/svg";
		let h     = Number(svgPlot.height.baseVal.value);

		let area = document.createElementNS(svgNS, "rect");
		area.setAttribute("x", xBounds.min);
		area.setAttribute("y", 0);
		area.setAttribute("width", xBounds.range);
		area.setAttribute("height", h);
		area.setAttribute("fill", areaColor);
		area.setAttribute("fill-opacity", .2);
		svgPlot.appendChild(area);

		let minLine = document.createElementNS(svgNS, "line");
		minLine.setAttribute("x1", xBounds.min);
		minLine.setAttribute("y1", 0);
		minLine.setAttribute("x2", xBounds.min);
		minLine.setAttribute("y2", h);
		minLine.setAttribute("stroke", lineColor);
		minLine.setAttribute("stroke-width", borderThickness);
		svgPlot.appendChild(minLine);

		let maxLine = document.createElementNS(svgNS, "line");
		maxLine.setAttribute("x1", xBounds.max);
		maxLine.setAttribute("y1", 0);
		maxLine.setAttribute("x2", xBounds.max);
		maxLine.setAttribute("y2", h);
		maxLine.setAttribute("stroke", lineColor);
		maxLine.setAttribute("stroke-width", borderThickness);
		svgPlot.appendChild(maxLine);
	}

	//Draw all the paths found in svgPlot to canvasPlot
	static SVGPathToCanvas(svgPlot, canvasPlot) {
		let svgPaths        = [];
		let backgroundColor = "";
		let canvasCtx       = canvasPlot.getContext("2d");
		canvasPlot.width    = Number(svgPlot.width.baseVal.value);
		canvasPlot.height   = Number(svgPlot.height.baseVal.value);

		svgPlot.childNodes.forEach(function(child){
			if(child.tagName === "rect")
				backgroundColor = child.getAttribute("fill");
			else if(child.tagName === "path")
				svgPaths.push(child);
		});

		if(FormatUtils.isColor(backgroundColor)) {
			canvasCtx.fillStyle = backgroundColor;
			canvasCtx.fillRect(0, 0, canvasPlot.width, canvasPlot.height);
		}
		else {
			canvasCtx.clearRect(0, 0, canvasPlot.width, canvasPlot.height);
		}

		svgPaths.forEach(function(path){
			canvasCtx.strokeStyle = path.getAttribute("stroke");
			canvasCtx.lineWidth   = path.getAttribute("stroke-width");
			canvasCtx.lineJoin    = path.getAttribute("stroke-linejoin");
			canvasCtx.lineCap     = path.getAttribute("stroke-linecap");
			canvasCtx.stroke(new Path2D(path.getAttribute("d")));
		});
	}

	//Get the coordinates of the mouseEvent inside the target element.
	//X and Y in [0, 1] if unitScale is true.
	static getClick(mouseEvent, DOMtarget, unitScale = false){
		const targetBB = DOMtarget.getBoundingClientRect();
		let x = mouseEvent.clientX - targetBB.left;
		let y = targetBB.height - mouseEvent.clientY + targetBB.top;

		if (unitScale === true) {
			x /= targetBB.width;
			y /= targetBB.height;
		}

		return new Vec2(x, y);
	}
}