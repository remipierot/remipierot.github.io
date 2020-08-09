import { DOMUtils     } from '../dependencies/dom-utils.js';
import { BezierSpline } from '../dependencies/maths.js';
import { VarCheckbox  } from '../dependencies/components.js';

class Engine {
	#plotPanel
	#svgPlot
	#spline
	#editCurve
	#drawBezier
	#showControls
	#showDuplicateX
	#idToDrag

	get editCurve()      { return this.#editCurve;      }
	get drawBezier()     { return this.#drawBezier;     }
	get showControls()   { return this.#showControls;   }
	get showDuplicateX() { return this.#showDuplicateX; }

	constructor(plotID, svgPlotID) {
		this.#plotPanel      = document.getElementById(plotID);
		this.#svgPlot        = document.getElementById(svgPlotID);
		this.#spline         = new BezierSpline();
		this.#editCurve      = { value: false };
		this.#drawBezier     = { value: false };
		this.#showControls   = { value: false };
		this.#showDuplicateX = { value: false };
		this.#idToDrag       = -1;

		let self = this;
		this.#plotPanel.addEventListener("mousedown", function(e){
			self.click(e);
		});
		this.#plotPanel.addEventListener("mousemove", function(e){
			self.drag(e);
		});
		
		this.updatePlotDimensions();

		this.#spline.bezierPrecision.value = 20;
		this.#spline.fillCubicBezierFactors();
		this.#spline.buildSpline(true);
	}

	clearClick() {
		this.#idToDrag = -1;
	}

	click(e) {
		let click = DOMUtils.getClick(e, this.#svgPlot);
		let closestPointId = this.#spline.getClosestBaseId(click);
		let leftClick  = (e.which === 1);
		let rightClick = (e.which === 3);

		if (this.#editCurve.value === false) {
			this.#idToDrag = closestPointId;
			this.#spline.setBasePoint(this.#idToDrag, click);  
		}
		else {
			if (leftClick) {
				closestPointId = this.#spline.splineIdToBaseId(this.#spline.getClosestPointId(click));
				if(this.#spline.nbPoints < 2)
					closestPointId = this.#spline.nbPoints;

				this.#idToDrag = this.#spline.insertBasePoint(closestPointId, click);
			}
			else if (rightClick) {
				this.#spline.removeBasePoint(closestPointId);
				this.clearClick();
			}
		}

		this.drawSpline();
	}

	drag(e) {
		if (this.#idToDrag === -1) 
			return;

		this.#spline.setBasePoint(this.#idToDrag, DOMUtils.getClick(e, this.#svgPlot));
		this.drawSpline(); 
	}

	drawSpline() {
		let svgClone = this.#svgPlot.cloneNode(false);
		this.#plotPanel.removeChild(this.#svgPlot);
		this.#plotPanel.appendChild(svgClone);
		this.#svgPlot = svgClone;

		if(this.#showDuplicateX.value === true && this.#spline.nbBasePoints > 2) {
			let duplicateBounds = this.#spline.getDuplicateXPoints(this.drawBezier.value);
			duplicateBounds.forEach(duplicate => DOMUtils.plotVerticalAreaToSVG(
				duplicate, 
				this.#svgPlot, 
				2, 
				"\#FF0000",
				"\#AA0000"));
		}

		DOMUtils.plotPointsToSvg(this.#spline.getBasePoints(), this.#svgPlot, 3);

		if (this.drawBezier.value === true) {
			if (this.showControls.value === true)
				DOMUtils.plotPointsToSvg(this.#spline.getControlPoints(), this.#svgPlot, 3, "\#FF0000");
				
			DOMUtils.plotCurveToSVG(this.#spline.getPoints(), this.#svgPlot, 3, "\#990099");
		}
		else
			DOMUtils.plotCurveToSVG(this.#spline.getBasePoints(), this.#svgPlot, 3, "\#990099");
	}

	updateBezierFactors() {
		this.#spline.fillCubicBezierFactors();
		this.#spline.buildSpline(true);
		this.drawSpline();
	}

	updatePlotDimensions() {
		this.#svgPlot.setAttribute("width",  this.#plotPanel.offsetWidth + "px");
		this.#svgPlot.setAttribute("height", this.#plotPanel.offsetHeight + "px");
	}
}

const engine = new Engine("plot-panel", "svg-plot");

const varCheckboxes = {
	movePoint:    new VarCheckbox("move-edit-checkbox",     "", engine.editCurve),
	linearBezier: new VarCheckbox("linear-bezier-checkbox", "", engine.drawBezier, () => {
		varCheckboxes.control.enabled = varCheckboxes.linearBezier.targetValue;
		engine.drawSpline();
	}),
	control:      new VarCheckbox("control-checkbox",     "control-label",     engine.showControls,   () => engine.drawSpline()),
	duplicateX:   new VarCheckbox("duplicate-x-checkbox", "duplicate-x-label", engine.showDuplicateX, () => engine.drawSpline())
}

window.addEventListener("load", function(){
	varCheckboxes.control.enabled = engine.showControls;
});

window.addEventListener("mouseup", function(e){
	engine.clearClick();
});