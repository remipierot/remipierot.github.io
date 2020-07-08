import { 
	fillWindowWith, 
	remap, 
	plotCurveToSVG,
	SVGPathToCanvas,
	isColor
} from '../utils.js';

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

var app = document.getElementById("app");
var plot = document.createElement("canvas");
var plotCtx = plot.getContext("2d");
var settingsPanel = document.getElementById("settings-panel");
var settings = document.getElementById("settings");
var collapseSettings = document.getElementById("collapse-settings");
var plotPanel = document.getElementById("plot-panel");
var svgPlot = document.getElementById("svg-plot");

var curveColor = document.getElementById("curve-color");
var outlineColorLabel = document.getElementById("ot-color-label");
var outlineColor = document.getElementById("ot-color");
var bckgTransparency = document.getElementById("background-transparency");
var bckgColorLabel = document.getElementById("background-color-label");
var bckgColor = document.getElementById("background-color");
var collapseLabel = document.getElementById("collapse-label");

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
	updateCollapseLabel();
	updatePlotDimensions()
	drawCurve();
	updateLabels();
});

window.addEventListener("resize", function(){
	updatePlotDimensions();
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
	updatePlotDimensions()
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
		plotPanel.style.backgroundImage = "url('checkerboard.png')";
	}
	else {
		bckgColorLabel.removeAttribute("disabled");
		bckgColor.removeAttribute("disabled");
		plotPanel.style.backgroundColor = bckgColor.value;
		plotPanel.style.backgroundImage = "none";
	}

	drawCurve();
})

bckgColor.addEventListener("input", function(){
	drawCurve();
})

document.getElementById("save-png").addEventListener("click", function(){
    SVGPathToCanvas(svgPlot, plot);

    this.href = plot.toDataURL("image/png");
    this.download="SplineGen(a" + sliders[Param.A].value + 
    				"-b" + sliders[Param.B].value +
    				"-c" + sliders[Param.C].value +
    				"-d" + sliders[Param.D].value +
    				"-j" + sliders[Param.J].value +
    				"-k" + sliders[Param.K].value + ").png"
});

document.getElementById("save-svg").addEventListener("click", function(){
	let svgBlob = new Blob([svgPlot.outerHTML], {type:"image/svg+xml;charset=utf-8"});

    this.href = URL.createObjectURL(svgBlob);
    this.download="SplineGen(a" + sliders[Param.A].value + 
    				"-b" + sliders[Param.B].value +
    				"-c" + sliders[Param.C].value +
    				"-d" + sliders[Param.D].value +
    				"-j" + sliders[Param.J].value +
    				"-k" + sliders[Param.K].value + ").svg"
});

collapseSettings.addEventListener("click", function(){
	let collapsed = settings.getAttribute("collapsed") === "collapsed";

	if(collapsed) {
		settingsPanel.setAttribute("collapsed", "expanded");
		settings.setAttribute("collapsed", "expanded");
		this.setAttribute("collapsed", "expanded");
		plotPanel.setAttribute("collapsed", "expanded");
	}
	else {
		settingsPanel.setAttribute("collapsed", "collapsed");
		settings.setAttribute("collapsed", "collapsed");
		this.setAttribute("collapsed", "collapsed");
		plotPanel.setAttribute("collapsed", "collapsed");
	}

	updateCollapseLabel();

	setTimeout( () =>{
		updatePlotDimensions();
		drawCurve();
	}, 50);

	setTimeout( () =>{
		updatePlotDimensions();
		drawCurve();
	}, 100);
});

//Ensure the svg takes as much space as possible while keeping a square shape and without having to scroll
function updatePlotDimensions() {
	fillWindowWith(app);

	let target = Math.min(plotPanel.offsetWidth, app.offsetHeight - 4);
	svgPlot.setAttribute("width", target + "px");
	svgPlot.setAttribute("height", target + "px");
}

function updateCollapseLabel() {
	let collapsed = settings.getAttribute("collapsed") === "collapsed";

	if(collapsed) {
		collapseLabel.innerHTML = ">>";
	}
	else {
		collapseLabel.innerHTML = "<<";
	}
}

function drawCurve() {
	let curveThickness = Number(sliders[Param.Thickness].value);
	let outlineThickness = Number(sliders[Param.OTThickness].value);
	let fullThickness = curveThickness + outlineThickness;
	let MaxThickness = Number(sliders[Param.Thickness].max) + Number(sliders[Param.OTThickness].max);
	let adjustedThickness = fullThickness + (fullThickness / MaxThickness) * 100;
	let demiThickness = .5 * adjustedThickness;
	let w = Number(svgPlot.width.baseVal.value);
	let h = Number(svgPlot.height.baseVal.value);
	let drawBackground = !bckgTransparency.checked;

	//Fetch the curve (each point having normalized coordinates)
	let curve = getCurve(
		sliders[Param.A].value,
		sliders[Param.B].value,
		sliders[Param.C].value,
		sliders[Param.D].value,
		sliders[Param.J].value,
		sliders[Param.K].value,
		sliders[Param.Precision].value,
		true,
		true);

	//Remap the curve points to the svg space
	let newPoints = [];
	for(let i = 0; i < curve.length; i++) {
		newPoints.push([
			demiThickness + curve[i][0] * (w - adjustedThickness), 
			demiThickness + curve[i][1] * (h - adjustedThickness)
		]);
	}

	plotPanel.style.backgroundColor = bckgColor.value;

	let svgClone = svgPlot.cloneNode(false);
	plotPanel.removeChild(svgPlot);
	plotPanel.appendChild(svgClone);
	svgPlot = svgClone;
	
	if(newPoints.length > 1) {
		//Draw outline first
		if(outlineThickness > 0) {
			plotCurveToSVG(newPoints, fullThickness, outlineColor.value, svgPlot, drawBackground ? bckgColor.value : "none");
			drawBackground = false;
		}

		plotCurveToSVG(newPoints, curveThickness, curveColor.value, svgPlot, drawBackground ? bckgColor.value : "none");
	}
}

function getCurve(a, b, c , d , j, k, nbPoints, normalized = false, centered = false) {
	let curve = [];
	let min = [Number.MAX_VALUE, Number.MAX_VALUE];
	let max = [Number.MIN_VALUE, Number.MIN_VALUE];

	for(let t = 0; t <= nbPoints; t++) {
		let point = getCurvePoint(a, b, c , d , j, k, t / nbPoints);
		point[0] = remap(point[0], -2, 2, 0, 1, !normalized);
		point[1] = remap(point[1], -2, 2, 0, 1, !normalized);
		curve.push(point);

		if(min[0] > point[0]) { min[0] = point[0]; }
		if(min[1] > point[1]) { min[1] = point[1]; }
		if(max[0] < point[0]) { max[0] = point[0]; }
		if(max[1] < point[1]) { max[1] = point[1]; }
	}

	if(centered) {
		let center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2];
		let toCenter = [.5 - center[0], .5 - center[1]];

		curve.forEach(function(point){
			point[0] += toCenter[0];
			point[1] += toCenter[1];
		});
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