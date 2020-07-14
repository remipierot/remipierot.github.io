//Safety checks and other useful methods
export default class Utils {
	//Check if a value can be considered a number (even if it is a string representing a number for example)
	static canBeNumber(value) {
		return !isNaN(parseFloat(value));
	}

	//Check if a value is a number (no string / null / undefined etc allowed)
	static isNumber(value) {
		return Utils.canBeNumber(value) && value[0] === undefined;
	}

	//Check if value can be called
	static isFunction(value) {
 		return Object.prototype.toString.call(value) == '[object Function]';
	}

	//Check if value is a color
	static isColor(value) {
		let tmp = new Option().style;
		tmp.color = value;
		return tmp.color !== '';
	}

	//Check if value can be a boolean (string true/false accepted)
	static canBeBoolean(value) {
		let tmp = String(value).toLowerCase();
		return tmp === 'true' || tmp === 'false';
	}

	//Check if value is a boolean (no string accepted)
	static isBoolean(value) {
		return value === true || value === false;
	}

	//Return the given value as a string with nbDigitsInt digits before the separator and nbDigitsFloat digits after it
	static valueToString(value, nbDigitsInt, nbDigitsFloat, separator = '.') {
		if (!Utils.isNumber(value) && !Utils.canBeNumber(value)) 
			return null;

		value = Number(value);
		let split = value.toFixed(nbDigitsFloat).split('.');
		let vString = split[0].padStart(nbDigitsInt, '0');

		if(nbDigitsFloat > 0) { vString += `${separator}${split[1]}`; } 

		return vString;
	}

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

	//Change the current webpage to the target one, with the given parameters added as a query
	static redirect(targetURL, urlParamsDictionary) {
		let urlParams = Utils.buildURLParameters(urlParamsDictionary);
		window.location.href = targetURL + urlParams;
	}

	//Build the query part of an URL with the given parameters
	static buildURLParameters(urlParamsDictionary) {
		let params = '?';

		for(const [k, v] of Object.entries(urlParamsDictionary))
			params += `${k}=${v}&`;

		return params.slice(0, -1);
	}

	//Draw the given curve on the svg area
	static plotCurveToSVG(points, thickness, color, svgPlot, backgroundColor = "") {
		let svgNS = "http://www.w3.org/2000/svg";
		let w     = Number(svgPlot.width.baseVal.value);
		let h     = Number(svgPlot.height.baseVal.value);

		if(Utils.isColor(backgroundColor)) {
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

		if(Utils.isColor(backgroundColor)) {
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
}