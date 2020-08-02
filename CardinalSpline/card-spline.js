import { DOMUtils       } from '../dependencies/dom-utils.js';
import { CardinalSpline } from '../dependencies/maths.js';
import { VarSlider      } from '../dependencies/components.js';
import { VarCheckbox    } from '../dependencies/components.js';

class Engine {
	#plotPanel
	#svgPlot
	#spline
	#editCurve
	#idToDrag
	#showDuplicateX

	get alpha()           { return this.#spline.alpha;           }
	get bezierPrecision() { return this.#spline.bezierPrecision; }
	get editCurve()       { return this.#editCurve;              }
	get showDuplicateX()  { return this.#showDuplicateX;         }

	constructor(plotID, svgPlotID) {
		this.#plotPanel = document.getElementById(plotID);
		this.#svgPlot   = document.getElementById(svgPlotID);
		this.#spline    = new CardinalSpline();
		this.#editCurve = { value: false };
		this.#idToDrag  = -1;
		this.#showDuplicateX = { value: false };

		let self = this;
		this.#plotPanel.addEventListener("mousedown", function(e){
			self.click(e);
		});
		this.#plotPanel.addEventListener("mousemove", function(e){
			self.drag(e);
		});
		
		this.updatePlotDimensions();

		this.alpha.value           = 10;
		this.bezierPrecision.value = 25;
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

		if(this.#showDuplicateX.value === true) {
			let duplicates = this.#spline.duplicateXPoints;
			duplicates.forEach(duplicate => DOMUtils.plotCurveToSVG(duplicate, this.#svgPlot, 5, "\#FF0000"));
		}

		DOMUtils.plotPointsToSvg(this.#spline.getBasePoints(), this.#svgPlot, 3);
		DOMUtils.plotCurveToSVG(this.#spline.getBasePoints(), this.#svgPlot, 1, "\#000000");
		DOMUtils.plotCurveToSVG(this.#spline.getPoints(), this.#svgPlot, 3, "\#990099");
	}

	updateAlpha() {
		this.#spline.buildSpline();
		this.drawSpline();
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

const varSliders = {
	alpha:     new VarSlider("a-slider", "a-range-label",  engine.alpha,           1, 25, 2, 0, true, () => engine.updateAlpha()),
	precision: new VarSlider("p-slider", "p-range-label",  engine.bezierPrecision, 2, 50, 2, 0, true, () => engine.updateBezierFactors()),
};

const varCheckboxes = {
	movePoint:  new VarCheckbox("move-edit-checkbox",   "", engine.editCurve),
	duplicateX: new VarCheckbox("duplicate-x-checkbox", "", engine.showDuplicateX, () => engine.drawSpline())
}

window.addEventListener("mouseup", function(e){
	engine.clearClick();
});