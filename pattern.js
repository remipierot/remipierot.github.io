var Param = {
	A: 0,
	B: 1,
	C: 2,
	D: 3,
	J: 4,
	K: 5,
	R: 6
}

var plot = document.getElementById("plot");
var plotCtx = plot.getContext("2d");
var infoPanel = document.getElementById("info-panel");
var plotPanel = document.getElementById("plot-panel");

var sliders = [
				document.getElementById("a-slider"),
				document.getElementById("b-slider"),
				document.getElementById("c-slider"),
				document.getElementById("d-slider"),
				document.getElementById("j-slider"),
				document.getElementById("k-slider"),
				document.getElementById("r-slider")
			];

var labels = [
				document.getElementById("a-label"),
				document.getElementById("b-label"),
				document.getElementById("c-label"),
				document.getElementById("d-label"),
				document.getElementById("j-label"),
				document.getElementById("k-label"),
				document.getElementById("r-label")
			];

//Setup listeners
window.addEventListener("load", function(){
	updateCanvasDimensions()
	drawCurve();
	updateLabels();
});

window.addEventListener("resize", function(){
	updateCanvasDimensions();
	drawCurve();
	updateLabels();
});

for(let i = Param.A; i <= Param.R; i++) {
	sliders[i].addEventListener("input", function(){
		drawCurve();
		updateLabels();
	});
}

document.getElementById("randomize").addEventListener("click", function(){
	randomizeValues()
	updateCanvasDimensions()
	drawCurve();
	updateLabels();
});

//Ensure the canvas takes as much space as possible without having to scroll
function updateCanvasDimensions() {
	let target = Math.min(window.innerWidth - infoPanel.offsetWidth, window.innerHeight - 32);
	plot.width = target;
	plot.height = target;

	if(target <= infoPanel.offsetHeight) {
		plot.width = infoPanel.offsetHeight;
		plot.height = infoPanel.offsetHeight;
	}
}

function drawCurve() {
	//Fetch the curve (each point having normalized coordinates)
	let curve = getCurve(
		sliders[Param.A].value,
		sliders[Param.B].value,
		sliders[Param.C].value,
		sliders[Param.D].value,
		sliders[Param.J].value,
		sliders[Param.K].value,
		sliders[Param.R].value,
		true);

	//Remap the curve points to the canvas space
	let newPoints = [[0, 0]];
	for(let i = 0; i < curve.length; i++) {
		newPoints.push([
			curve[i][0] * plot.width, 
			curve[i][1] * plot.height
		]);
	}

	//Setup the canvas for drawing
	plotCtx.fillStyle = "#ffffff";
	plotCtx.fillRect(0, 0, plot.width, plot.height);
	plotCtx.lineWidth = 1;
	plotCtx.strokeStyle = "#000000";
	plotCtx.beginPath();

	//Draw the curve
	plotCtx.moveTo(newPoints[1][0], plot.height - newPoints[1][1]);
	for(let i = 2; i < curve.length + 1; i++) {
		plotCtx.lineTo(newPoints[i][0], plot.height - newPoints[i][1]);
	}
	plotCtx.stroke();
}

function getCurve(a, b, c , d , j, k, nbPoints, normalize = false) {
	let curve = [];

	for(let t = 0; t <= nbPoints; t++) {
		let point = getCurvePoint(a, b, c , d , j, k, t / nbPoints);
		point[0] = remap(point[0], -2, 2, 0, 1, !normalize);
		point[1] = remap(point[1], -2, 2, 0, 1, !normalize);
		curve.push(point);
	}

	return curve;
}

function getCurvePoint(a, b, c, d, j, k, t) {
	let point = [0, 0]
	let angle = t * 2 * Math.PI;

	//j is linked to cos(b * angle), so if b is 0, j will not have any effect on the curve
	//j is a power value, so if it is 0, b will not have any effect on the curve
	point[0] = Math.cos(a * angle) - Math.pow(Math.cos(b * angle), j);

	//k is linked to sin(d * angle), so if d is 0, k will not have any effect on the curve
	//k is a power value, so if it is 0, d will not have any effect on the curve
	point[1] = Math.sin(c * angle) - Math.pow(Math.sin(d * angle), k);

	return point;
}

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

function randomizeValues() {
	for(let i = Param.A; i < Param.R; i++) {
		sliders[i].value = Number(sliders[i].min) + Math.floor(Math.random() * (sliders[i].max - sliders[i].min + 1));
	} 
}

function updateLabels() {
	//Change the labels content to reflect the parameter values
	for(let i = Param.A; i <= Param.R; i++) {
		let nbDigits = Math.log10(sliders[i].max) + 1;
		let labelContent = " (" + sliders[i].value.toString().padStart(nbDigits, '0') +
						" / " + sliders[i].max + ")";
		labels[i].innerHTML = labelContent;
	};
}