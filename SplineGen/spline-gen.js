import   Utils         from '../dependencies/utils.js';
import { Bounds      } from '../dependencies/maths.js';
import { VarSlider   } from '../dependencies/components.js';
import { VarColor    } from '../dependencies/components.js';
import { VarCheckbox } from '../dependencies/components.js';

class Engine {
	#plotPanel
	#svgPlot
	#data

	get a() { return this.#data.a; }
	get b() { return this.#data.b; }
	get c() { return this.#data.c; }
	get d() { return this.#data.d; }
	get j() { return this.#data.j; }
	get k() { return this.#data.k; }
	get precision()              { return this.#data.precision;              }
	get curveThickness()         { return this.#data.curveThickness;         }
	get curveColor()             { return this.#data.curveColor;             }
	get outlineThickness()       { return this.#data.outlineThickness;       }
	get outlineColor()           { return this.#data.outlineColor;           }
	get backgroundTransparency() { return this.#data.backgroundTransparency; }
	get backgroundColor()        { return this.#data.backgroundColor;        }
	get maxThickness()           { return this.#data.maxThickness;           }

	get fileName() { 
		return "SplineGen(a" + this.a.value + 
				"-b" + this.b.value +
				"-c" + this.c.value +
				"-d" + this.d.value +
				"-j" + this.j.value +
				"-k" + this.k.value + ")"; 
	}

	constructor(plotID, svgPlotID, maxThickness) {
		this.#plotPanel = document.getElementById(plotID);
		this.#svgPlot = document.getElementById(svgPlotID);
		
		this.#data = {
			a: { value: 0 },
			b: { value: 0 },
			c: { value: 0 },
			d: { value: 0 },
			j: { value: 1 },
			k: { value: 1 },
			precision:              { value: 500          },
			curveThickness:         { value: 20           },
			curveColor:             { value: '\#000000'   },
			outlineThickness:       { value: 20           },
			outlineColor:           { value: '\#FFFFFF'   },
			backgroundTransparency: { value: false        },
			backgroundColor:        { value: '\#000000'   },
			maxThickness:           { value: maxThickness }
		}
	}

	drawCurve() {
		let fullThickness = this.curveThickness.value + this.outlineThickness.value;
		let adjustedThickness = fullThickness + (fullThickness / this.maxThickness.value) * 100;
		let demiThickness = .5 * adjustedThickness;
		let w = Number(this.#svgPlot.width.baseVal.value);
		let h = Number(this.#svgPlot.height.baseVal.value);
		let drawBackground = !this.backgroundTransparency.value;
	
		//Fetch the curve (each point having normalized coordinates)
		let curve = this.getCurve(
			this.a.value,
			this.b.value,
			this.c.value,
			this.d.value,
			this.j.value,
			this.k.value,
			this.precision.value,
			true
		);
	
		//Remap the curve points to the svg space
		let newPoints = [];
		for(let i = 0; i < curve.length; i++) {
			newPoints.push({
				x: demiThickness + curve[i].x * (w - adjustedThickness), 
				y: demiThickness + curve[i].y * (h - adjustedThickness)
			});
		}
	
		if (drawBackground) {
			this.#plotPanel.style.backgroundColor = this.backgroundColor.value;
			this.#plotPanel.style.backgroundImage = "none";
		}
		else {
			this.#plotPanel.style.backgroundColor = "transparent";
			this.#plotPanel.style.backgroundImage = "url('checkerboard.png')";
		}
	
		let svgClone = this.#svgPlot.cloneNode(false);
		this.#plotPanel.removeChild(this.#svgPlot);
		this.#plotPanel.appendChild(svgClone);
		this.#svgPlot = svgClone;
		
		if(newPoints.length > 1) {
			//Draw outline first
			if(this.outlineThickness.value > 0) {
				Utils.plotCurveToSVG(
					newPoints, 
					fullThickness, 
					this.outlineColor.value, 
					this.#svgPlot, 
					drawBackground ? this.backgroundColor.value : "none"
				);
				drawBackground = false;
			}
	
			Utils.plotCurveToSVG(
				newPoints, 
				this.curveThickness.value, 
				this.curveColor.value, 
				this.#svgPlot, 
				drawBackground ? this.backgroundColor.value : "none"
			);
		}
	}

	getCurve(a, b, c , d , j, k, nbPoints, centered = false) {
		let curve = [];
		let min = { x: Number.MAX_VALUE, y: Number.MAX_VALUE };
		let max = { x: Number.MIN_VALUE, y: Number.MIN_VALUE };
	
		for(let t = 0; t <= nbPoints; t++) {
			let point = this.getCurvePoint(a, b, c , d , j, k, t / nbPoints);
			point.x   = Bounds.remapUsingValues(point.x, -2, 2, 0, 1);
			point.y   = Bounds.remapUsingValues(point.y, -2, 2, 0, 1);
			curve.push(point);
	
			if(min.x > point.x) { min.x = point.x; }
			if(min.y > point.y) { min.y = point.y; }
			if(max.x < point.x) { max.x = point.x; }
			if(max.y < point.y) { max.y = point.y; }
		}
	
		if(centered) {
			let center   = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2 };
			let toCenter = { x: .5 - center.x,       y: .5 - center.y       };
	
			curve.forEach(function(point){
				point.x += toCenter.x;
				point.y += toCenter.y;
			});
		}
	
		return curve;
	}
	
	getCurvePoint(a, b, c, d, j, k, t) {
		let point = { x: 0, y: 0 };
		let angle = t * 2 * Math.PI;
	
		//j is linked to cos(b * angle), so if b is 0, j will not have any effect on the curve
		//j is a power value, so if it is 0, b will not have any effect on the curve
		point.x = Math.cos(a * angle) - Math.pow(Math.cos(b * angle), j);
	
		//k is linked to sin(d * angle), so if d is 0, k will not have any effect on the curve
		//k is a power value, so if it is 0, d will not have any effect on the curve
		point.y = Math.sin(c * angle) - Math.pow(Math.sin(d * angle), k);
	
		return point;
	}

	updatePlotDimensions() {
		let target = Math.min(this.#plotPanel.offsetWidth, this.#plotPanel.offsetHeight);
		this.#svgPlot.setAttribute("width",  target + "px");
		this.#svgPlot.setAttribute("height", target + "px");
	}

	savePNG(button) {
		let canvasPlot = document.createElement("canvas");
		Utils.SVGPathToCanvas(this.#svgPlot, canvasPlot);
		button.href = canvasPlot.toDataURL("image/png");
		button.download = `${this.fileName}.png`;
	}

	saveSVG(button) {
		let svgBlob = new Blob([this.#svgPlot.outerHTML], {type:"image/svg+xml;charset=utf-8"});
		button.href = URL.createObjectURL(svgBlob);
		button.download = `${this.fileName}.svg`;
	}
}

const maxCurveThickness = 30;
const maxOutlineThickness = 30;

const engine = new Engine("plot-panel", "svg-plot", maxCurveThickness + maxOutlineThickness);

const varSliders = {
	a:                new VarSlider("a-slider",  "a-range-label",  engine.a,                0, 10,                  2, 0, true, () => engine.drawCurve()),
	b:                new VarSlider("b-slider",  "b-range-label",  engine.b,                0, 10,                  2, 0, true, () => engine.drawCurve()),
	c:                new VarSlider("c-slider",  "c-range-label",  engine.c,                0, 10,                  2, 0, true, () => engine.drawCurve()),
	d:                new VarSlider("d-slider",  "d-range-label",  engine.d,                0, 10,                  2, 0, true, () => engine.drawCurve()),
	j:                new VarSlider("j-slider",  "j-range-label",  engine.j,                1, 3,                   2, 0, true, () => engine.drawCurve()),
	k:                new VarSlider("k-slider",  "k-range-label",  engine.k,                1, 3,                   2, 0, true, () => engine.drawCurve()),
	precision:        new VarSlider("p-slider",  "p-range-label",  engine.precision,        1, 500,                 3, 0, true, () => engine.drawCurve()),
	curveThickness:   new VarSlider("ct-slider", "ct-range-label", engine.curveThickness,   1, maxCurveThickness,   3, 0, true, () => engine.drawCurve()),
	outlineThickness: new VarSlider("ot-slider", "ot-range-label", engine.outlineThickness, 0, maxOutlineThickness, 3, 0, true, () => {
		varColors.outlineColor.enabled = varSliders.outlineThickness.targetValue > 0;
		engine.drawCurve();
	}),
};

const varColors = {
	curveColor:      new VarColor("curve-color",      "curve-color-label",      engine.curveColor,      () => engine.drawCurve()),
	outlineColor:    new VarColor("outline-color",    "outline-color-label",    engine.outlineColor,    () => engine.drawCurve()),
	backgroundColor: new VarColor("background-color", "background-color-label", engine.backgroundColor, () => engine.drawCurve())
}

const varCheckboxes = {
	backgroundTransparency: new VarCheckbox("background-transparency", "", engine.backgroundTransparency, () => {
		varColors.backgroundColor.enabled = !varCheckboxes.backgroundTransparency.targetValue;
		engine.drawCurve();
	})
}

window.addEventListener("load", function(){
	let p = Utils.getURLParameters();

	varSliders.a.modifyTargetValue(p.a);
	varSliders.b.modifyTargetValue(p.b);
	varSliders.c.modifyTargetValue(p.c);
	varSliders.d.modifyTargetValue(p.d);
	varSliders.j.modifyTargetValue(p.j);
	varSliders.k.modifyTargetValue(p.k);
	varSliders.precision.modifyTargetValue(p.precision);
	varSliders.curveThickness.modifyTargetValue(p.curveThickness);
	varSliders.outlineThickness.modifyTargetValue(p.outlineThickness);
	varColors.curveColor.modifyTargetValue(`#${p.curveColor}`);
	varColors.outlineColor.modifyTargetValue(`#${p.outlineColor}`);
	varColors.backgroundColor.modifyTargetValue(`#${p.backgroundColor}`);
	varCheckboxes.backgroundTransparency.modifyTargetValue(p.backgroundTransparency === 'true');

	engine.updatePlotDimensions();
	engine.drawCurve();
});

window.addEventListener("resize", function(){
	engine.updatePlotDimensions();
	engine.drawCurve();
});

document.getElementById("randomize").addEventListener("click", function(){
	varSliders.a.randomizeElementValue();
	varSliders.b.randomizeElementValue();
	varSliders.c.randomizeElementValue();
	varSliders.d.randomizeElementValue();
	varSliders.j.randomizeElementValue();
	varSliders.k.randomizeElementValue();
	engine.drawCurve();
});

document.getElementById("save-png").addEventListener("click", function(){
    engine.savePNG(this);
});

document.getElementById("save-svg").addEventListener("click", function(){
    engine.saveSVG(this);
});