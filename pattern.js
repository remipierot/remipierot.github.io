var Param = {
	A: 0,
	B: 1,
	C: 2,
	D: 3,
	J: 4,
	K: 5,
	Precision: 6,
	Thickness: 7,
	OTThickness: 8
}

var plot = document.getElementById("plot");
var plotCtx = plot.getContext("2d");
var settingsPanel = document.getElementById("settings-panel");
var plotPanel = document.getElementById("plot-panel");

var curveColor = document.getElementById("curve-color");
var outlineColorLabel = document.getElementById("ot-color-label");
var outlineColor = document.getElementById("ot-color");
var bckgTransparency = document.getElementById("background-transparency");
var bckgColorLabel = document.getElementById("background-color-label");
var bckgColor = document.getElementById("background-color");

var sliders = [
				document.getElementById("a-slider"),
				document.getElementById("b-slider"),
				document.getElementById("c-slider"),
				document.getElementById("d-slider"),
				document.getElementById("j-slider"),
				document.getElementById("k-slider"),
				document.getElementById("precision-slider"),
				document.getElementById("thickness-slider"),
				document.getElementById("ot-thickness-slider")
			];

var labels = [
				document.getElementById("a-range-label"),
				document.getElementById("b-range-label"),
				document.getElementById("c-range-label"),
				document.getElementById("d-range-label"),
				document.getElementById("j-range-label"),
				document.getElementById("k-range-label"),
				document.getElementById("precision-range-label"),
				document.getElementById("thickness-range-label"),
				document.getElementById("ot-thickness-range-label")
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

for(let i = Param.A; i <= Param.OTThickness; i++) {
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

curveColor.addEventListener("input", function(){
	drawCurve();
})

sliders[Param.OTThickness].addEventListener("input", function(){
	if(this.value == 0) {
		outlineColorLabel.setAttribute("disabled", "disabled");
		outlineColor.setAttribute("disabled", "disabled");
	}
	else {
		outlineColorLabel.removeAttribute("disabled");
		outlineColor.removeAttribute("disabled");
	}

	drawCurve();
});

outlineColor.addEventListener("input", function(){
	drawCurve();
})

bckgTransparency.addEventListener("input", function(){
	if(this.checked) {
		bckgColorLabel.setAttribute("disabled", "disabled");
		bckgColor.setAttribute("disabled", "disabled");
		plotPanel.style.backgroundColor = "transparent";
	}
	else {
		bckgColorLabel.removeAttribute("disabled");
		bckgColor.removeAttribute("disabled");
		plotPanel.style.backgroundColor = bckgColor.value;
	}

	drawCurve();
})

bckgColor.addEventListener("input", function(){
	drawCurve();
})

document.getElementById("save").addEventListener("click", function(){
    let img = plot.toDataURL("image/png");
    this.href = img;
    this.download="SplineGen(a" + sliders[Param.A].value + 
    				"-b" + sliders[Param.B].value +
    				"-c" + sliders[Param.C].value +
    				"-d" + sliders[Param.D].value +
    				"-j" + sliders[Param.J].value +
    				"-k" + sliders[Param.K].value + ").png"
});

//Ensure the canvas takes as much space as possible without having to scroll
function updateCanvasDimensions() {
	let target = Math.min(window.innerWidth - settingsPanel.offsetWidth, window.innerHeight - 32);
	plot.width = target;
	plot.height = target;

	if(target <= settingsPanel.offsetHeight) {
		plot.width = settingsPanel.offsetHeight;
		plot.height = settingsPanel.offsetHeight;
	}
}

function drawCurve() {
	let curveThickness = Number(sliders[Param.Thickness].value);
	let outlineThickness = Number(sliders[Param.OTThickness].value);
	let fullThickness = curveThickness + outlineThickness;
	let MaxThickness = Number(sliders[Param.Thickness].max) + Number(sliders[Param.OTThickness].max);
	let adjustedThickness = fullThickness + (fullThickness / MaxThickness) * 100;
	let demiThickness = .5 * adjustedThickness;

	//Fetch the curve (each point having normalized coordinates)
	let curve = getCurve(
		sliders[Param.A].value,
		sliders[Param.B].value,
		sliders[Param.C].value,
		sliders[Param.D].value,
		sliders[Param.J].value,
		sliders[Param.K].value,
		sliders[Param.Precision].value,
		true);

	//Remap the curve points to the canvas space
	let newPoints = [[0, 0]];
	for(let i = 0; i < curve.length; i++) {
		newPoints.push([
			demiThickness + curve[i][0] * (plot.width - adjustedThickness), 
			demiThickness + curve[i][1] * (plot.height - adjustedThickness)
		]);
	}

	plotPanel.style.backgroundColor = bckgColor.value;

	//Setup the canvas for drawing
	if(bckgTransparency.checked) {
		plotCtx.clearRect(0, 0, plot.width, plot.height);
	}
	else {
		plotCtx.fillStyle = bckgColor.value;
		plotCtx.fillRect(0, 0, plot.width, plot.height);
	}

	//Draw outline first
	if(outlineThickness > 0) {
		plotCurve(newPoints, fullThickness, outlineColor.value);
	}

	plotCurve(newPoints, curveThickness, curveColor.value);
}

function plotCurve(points, thickness, color) {
	plotCtx.lineWidth = thickness;
	plotCtx.strokeStyle = color;
	plotCtx.beginPath();

	//Draw the curve
	plotCtx.moveTo(points[1][0], plot.height - points[1][1]);
	for(let i = 2; i < points.length; i++) {
		plotCtx.lineTo(points[i][0], plot.height - points[i][1]);
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
	for(let i = Param.A; i <= Param.K; i++) {
		sliders[i].value = Number(sliders[i].min) + Math.floor(Math.random() * (Number(sliders[i].max - sliders[i].min) + 1));
	} 
}

//Change the labels content to reflect the parameter values
function updateLabels() {
	//Parameters
	padLabels(Param.A, Param.K);

	//Drawing options
	padLabels(Param.Precision, Param.OTThickness);
}

function padLabels(start, end) {
	let nbDigits = getHighestNbDigits(start, end);
	for(let i = start; i <= end; i++) {
		let labelContent = " (" + sliders[i].value.toString().padStart(nbDigits, '0') +
						" / " + sliders[i].max.padStart(nbDigits, '0') + ")";
		labels[i].innerHTML = labelContent;
	};
}

function getHighestNbDigits(start, end) {
	let highestNbDigits = 0;

	for(let i = start; i <= end; i++) {
		let nbDigits = Math.log10(sliders[i].max) + 1;

		if(nbDigits > highestNbDigits) {
			highestNbDigits = nbDigits;
		}
	}

	return highestNbDigits;
}