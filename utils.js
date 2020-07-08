export { 
	fillWindowWith, 
	remap, 
	plotCurveToSVG,
	SVGPathToCanvas,
	isColor
};

//Ensure the element takes as much space as possible without having to scroll
function fillWindowWith(element) {
	element.style.width = (window.innerWidth - 25) + "px";
	element.style.height = (window.innerHeight - 25) + "px";
}

//Translate the given value from the given space to the target one
function remap(value, currentMin, currentMax, targetMin, targetMax, rounded = true) {
	//Normalize the value to get its relative position in [0, 1]
	let targetValue = (value - currentMin) / (currentMax - currentMin);

	//Having [0,1] as the target space is the same thing as normalization, which is already achieved at this point
	if(targetMin != 0 || targetMax != 1) {
		//Use the relative position to place the value in the target space [targetMin, targetMax]
		targetValue = targetMin + (targetMax - targetMin) * targetValue
	}

	return rounded ? Math.round(targetValue) : targetValue;
}

function plotCurveToSVG(points, thickness, color, svgPlot, backgroundColor = "none") {
	let w = Number(svgPlot.width.baseVal.value);
	let h = Number(svgPlot.height.baseVal.value);

	if(isColor(backgroundColor)) {
		let svgBckg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		svgBckg.setAttribute('x', 0);
		svgBckg.setAttribute('y', 0);
		svgBckg.setAttribute('width', w);
		svgBckg.setAttribute('height', h);
		svgBckg.setAttribute('fill', backgroundColor);
		svgPlot.appendChild(svgBckg);
	}

	if(points.length > 0) {
		//Build the svg path
		let svgPath = 'M' + points[0][0] + ' ' + (h - points[0][1]) + ' ';
		for(let i = 1; i < points.length; i++) {
			svgPath += 'L' + points[i][0] + ' ' + (h - points[i][1]) + ' ';
		}
		svgPath += 'Z';

		//Draw the curve on the svg
		let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", svgPath);
		path.setAttribute("stroke", color);
		path.setAttribute("stroke-width", thickness);
		path.setAttribute("stroke-linejoin", "round");
		path.setAttribute("stroke-linecap", "round");
		path.setAttribute("fill", "none");
		svgPlot.appendChild(path);
	}
}

function SVGPathToCanvas(svgPaths, canvasPlot, canvasCtx, backgroundColor, width, height) {
	canvasPlot.width = Number(width);
	canvasPlot.height = Number(height);

	if(isColor(backgroundColor)) {
		canvasCtx.fillStyle = backgroundColor;
		canvasCtx.fillRect(0, 0, canvasPlot.width, canvasPlot.height);
	}
	else {
		canvasCtx.clearRect(0, 0, canvasPlot.width, canvasPlot.height);
	}

	svgPaths.forEach(function(path){
		canvasCtx.strokeStyle = path.getAttribute("stroke");
		canvasCtx.lineWidth = path.getAttribute("stroke-width");
		canvasCtx.lineJoin = path.getAttribute("stroke-linejoin");
		canvasCtx.lineCap = path.getAttribute("stroke-linecap");
		canvasCtx.stroke(new Path2D(path.getAttribute("d")));
	});
}

function isColor(strColor){
	var s = new Option().style;
	s.color = strColor;

	//[0] is 'r', [1] is 'g', [2] is 'b'
	//if strColor is not a color, these are 'undefined'
	return s.color[0] != "undefined";
}