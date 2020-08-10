import { FormatUtils } from './format-utils.js';

//Handle scalar remapping from one interval to another
export class Bounds {
	static UnitBounds = new Bounds(0, 1);
	
	#min
	#max
	#range
	#isDefault

	get min()       { return this.#min;   }
	get max()       { return this.#max;   }
	get range()     { return this.#range; }
	get isDefault() {
		return this.min   >= 0.0  && this.max   <= 1.0  &&
			this.range >  0.99 && this.range <  1.01 &&
			this.#isDefault; 
	}
	set extreme(value) {
		if (!FormatUtils.isNumber(value) && !FormatUtils.canBeNumber(value)) 
			return;

		this.#isDefault = false;
		value = Number(value);
		if(value > this.max)
			this.#max = value;
		else if(value < this.min)
			this.#min = value;

		this.#range = this.#max - this.#min;
	}

	/*
	 * Min always gets the lowest value affected
	 * Max always gets the highest value affected
	 * If a can not be a number, it gets the 0.0 default value
	 * If b can not be a number, it gets the 1.0 default value
	 */
	constructor(a = 0.0, b = 1.0) {
		a = FormatUtils.makeNumber(a);
		b = FormatUtils.makeNumber(b, 1.0);

		this.#min = (a < b) ? a : b;
		this.#max = (a < b) ? b : a;
		this.#range = this.#max - this.#min;
		this.#isDefault = this.min   >= 0.0  && this.max   <= 1.0  &&
						  this.range >  0.99 && this.range <  1.01;
	}

	/*
	 * Check if the value is contained in these bounds
	 * If minExclusive is true, a value equal to min will be considered outside the bounds
	 * If maxExclusive is true, a value equal to max will be considered outside the bounds
	 */
	isInBounds(value, minExclusive = false, maxExclusive = false) { 
		if (!FormatUtils.isNumber(value) && !FormatUtils.canBeNumber(value)) 
			return false;

		value = Number(value);
		let aboveMin = minExclusive ? value > this.#min : value >= this.#min;
		let belowMax = maxExclusive ? value < this.#max : value <= this.#max;

		return aboveMin && belowMax;
	}

	/*
	 * If the given value is contained in these bounds (min and max included),
	 * will return its normalized value (in [0,1])
	 */
	normalize(value) {
		if (!FormatUtils.isNumber(value) && !FormatUtils.canBeNumber(value)) 
			return null;

		value = Number(value);
		let normalized = null;
		if (this.isInBounds(value))
			normalized = (value - this.#min) / this.#range; 

		return normalized;
	}

	/*
	 * If the value is supposedly normalized (contained in [0,1]),
	 * will return its mapped value in these bounds
	 */
	remap(value) {
		if (!FormatUtils.isNumber(value) && !FormatUtils.canBeNumber(value)) 
			return null;

		value = Number(value);
		let remapped = null;
		if (value >= 0.0 && value <= 1.0)
			remapped = this.#min + value * this.#range; 

		return remapped;
	}

	/*
	 * If the given value is contained in the sourceBounds (min and max included),
	 * will return its mapped value in targetBounds
	 */
	static remapUsingBounds(value, sourceBounds, targetBounds) {
		let remapped = null;
		if (sourceBounds.isInBounds(value))
			remapped = targetBounds.remap(sourceBounds.normalize(value));

		return remapped;
	}

	/*
	 * If the given value is contained in the [sourceMin, sourceMax],
	 * will return its mapped value in [targetMin, targetMax]
	 */
	static remapUsingValues(value, sourceMin, sourceMax, targetMin, targetMax) {
		return Bounds.remapUsingBounds(value, new Bounds(sourceMin, sourceMax), new Bounds(targetMin, targetMax));
	}

	static tryFusion(bounds1, bounds2) {
		let fusion = null;
		
		if(bounds1.isInBounds(bounds2.min) || bounds1.isInBounds(bounds2.max)) {
			fusion = bounds1;
			fusion.extreme = bounds2.min;
			fusion.extreme = bounds2.max;
		}
		
		return fusion;
	}
}

export class Vec2 {
	static Zero = new Vec2(0, 0);
	static One  = new Vec2(1, 1);

	#x
	#y
	#magnitude

	get x() { return this.#x; }
	set x(value) {
		let defaultValue = FormatUtils.isNumber(this.#x) ? this.#x : 0.0; 
		this.#x = FormatUtils.makeNumber(value, defaultValue);
		this.computeMagnitude();
	}

	get y() { return this.#y; }
	set y(value) {
		let defaultValue = FormatUtils.isNumber(this.#y) ? this.#y : 0.0; 
		this.#y = FormatUtils.makeNumber(value, defaultValue);
		this.computeMagnitude();
	}

	get magnitude() { return this.#magnitude; }

	constructor(x = 0.0, y = 0.0) {
		this.x = x;
		this.y = y;
	}

	computeMagnitude() {
		if (FormatUtils.isNumber(this.x) && FormatUtils.isNumber(this.y))
			this.#magnitude = Math.sqrt(this.x * this.x + this.y * this.y);
	}

	normalize() {
		let n = this.normalized();
		this.#x = n.x;
		this.#y = n.y;
		this.#magnitude = n.magnitude;
	}

	normalized() {
		return new Vec2(this.x / this.magnitude, this.y / this.magnitude);
	}

	toPoint(point) {
		return new Vec2(point.x - this.x, point.y - this.y);
	}

	inverse() {
		let x = (this.x !== 0.0) ? 1.0 / this.x : 0.0;
		let y = (this.y !== 0.0) ? 1.0 / this.y : 0.0;
		
		return new Vec2(x, y);
	}

	add(v) {
		this.#x += v.x;
		this.#y += v.y;
		this.computeMagnitude();
	}

	sub(v) {
		v = Vec2.scalarMult(v, -1);
		this.add(v);
	}

	componentMult(v) {
		this.#x *= v.x;
		this.#y *= v.y;
		this.computeMagnitude();
	}

	componentDiv(v) {
		this.componentMult(v.inverse());
	}

	scalarMult(s) {
		this.#x *= s;
		this.#y *= s;
		this.computeMagnitude();
	}

	scalarDiv(s) {
		this.scalarMult(1.0 / s);
	}

	dot(v) {
		return this.#x * v.x + this.#y * v.y;
	}

	equals(v) {
		return this.x === v.x && this.y === v.y;
	}

	static add(v1, v2) {
		return new Vec2(v1.x + v2.x, v1.y + v2.y);
	}

	static sub(v1, v2) {
		return v2.toPoint(v1);
	}

	static componentMult(v1, v2) {
		return new Vec2(v1.x * v2.x, v1.y * v2.y);
	}

	static componentDiv(v1, v2) {
		return Vec2.componentMult(v1, v2.inverse());
	}

	static scalarMult(v, scalar) {
		return new Vec2(v.x * scalar, v.y * scalar);
	}

	static scalarDiv(v, scalar) {
		return Vec2.scalarMult(v, 1.0 / scalar);
	}

	static dot(v1, v2) {
		return v1.dot(v2);
	}

	static makeVec2(array) {
		if(array.length !== 2)
			return null;
		
		return new Vec2(array[0], array[1]);
	}
}

export class Curve {
	#points

	get duplicateXPoints() {
		return Curve.scanForDuplicateX(this);
	}
	get nbPoints() { return this.#points.length; }

	constructor(points = []) {
		this.#points = [...points];
	}

	addPoint(newPoint = Vec2.Zero) {
		this.insertPoint(this.nbPoints, newPoint);
	}

	addPoints(nbPointsToAdd = 0) {
		for(let i = 0; i < nbPointsToAdd; i++)
			this.addPoint();
	}

	clear() {
		this.#points = [];
	}

	getClosestPointId(otherPoint = Vec2.Zero) {
		return Curve.getClosestPointId(otherPoint, this.#points);
	}

	getPoint(id = 0) {
		if (!FormatUtils.isIdValid(id, this.#points))
			return null;

		return this.#points[id];
	}

	getPoints() {
		return this.#points;
	}

	insertPoint(id = 0, newPoint = Vec2.Zero) {
		if (id < 0 || !(newPoint instanceof Vec2))
			return;
		
		if (id > this.nbPoints)
			id = this.nbPoints; 
		
		this.#points.splice(id, 0, newPoint);
	}

	insertPoints(id = 0, nbPointsToAdd = 0) {
		for(let i = 0; i < nbPointsToAdd; i++)
			this.insertPoint(id);
	}

	isBetweenPoints(otherPoint = Vec2.Zero, previousId = 0) {
		let nextId = previousId + 1;
		let betweenPoints = false;

		if(previousId >= 0 && nextId < this.nbPoints) {
			let fromPrevious = this.#points[previousId].toPoint(otherPoint);
			let fromNext = this.#points[nextId].toPoint(otherPoint);
			betweenPoints = fromPrevious.dot(fromNext) < 0;
		}

		return betweenPoints;
	}

	isProperFunction() {
		return this.duplicateXPoints.length === 0;
	}

	removePoint(id = 0) {
		if (!FormatUtils.isIdValid(id, this.#points))
			return;
		
		this.#points.splice(id, 1);
	}

	removePoints(id = 0, nbPointsToRemove = 0) {
		for(let i = 0; i < nbPointsToRemove; i++)
			this.removePoint(id);
	}

	setPoint(id = 0, newPoint = Vec2.Zero) {
		if (!FormatUtils.isIdValid(id, this.#points) || !(newPoint instanceof Vec2))
			return;

		if (this.#points[id].equals(newPoint))
			return;
		
		this.#points[id] = newPoint;
	}

	static getClosestPointId(otherPoint = Vec2.Zero, curvePoints = [Vec2.Zero]){
		let minDistance    = Number.MAX_VALUE;
		let closestPointId = -1;

		for (let i = 0; i < curvePoints.length; i++) {
			let toPoint = curvePoints[i].toPoint(otherPoint);
			if(toPoint.magnitude < minDistance) {
				minDistance = toPoint.magnitude;
				closestPointId = i;
			}
		}

		return closestPointId;
	}

	static scanForDuplicateX(curve) {
		let duplicateXBounds = [];
		let tmp = [new Bounds()];
		if(curve.nbPoints <= 2)
			return;

		let first = curve.getPoint(0);
		let alreadyDefinedX = new Bounds(curve.getPoint(0).x, curve.getPoint(1).x);
		let segmentId = 0;

		for (let i = 2; i < curve.nbPoints; i++) {
			let previous = curve.getPoint(i - 1);
			let current  = curve.getPoint(i);
			let currentBounds = new Bounds(previous.x, current.x);

			//Special case for first point
			if (currentBounds.isInBounds(first.x)) {
				if(tmp[segmentId].isDefault === true)
					tmp[segmentId] = new Bounds(first.x, previous.x);
				
				tmp[segmentId].extreme = first.x;
			}
			
			//General case
			if (alreadyDefinedX.isInBounds(current.x) && 
				current.x !== alreadyDefinedX.min && 
				current.x !== alreadyDefinedX.max) {
				if(tmp[segmentId].isDefault === true)
					tmp[segmentId] = currentBounds;

				tmp[segmentId].extreme = current.x;
			}
			else {
				alreadyDefinedX.extreme = current.x;

				if(tmp[segmentId].isDefault === false) {
					tmp.push(new Bounds());
					segmentId++;
				}
			}
		}

		if(tmp[segmentId].isDefault === true)
			tmp.pop();

		//Merge duplicate areas together if possible
		let iToSkip = [];
		for (let i = 0; i < tmp.length; i++) {
			if(iToSkip.includes(i))
				continue;
			
			let fusion = tmp[i];

			for (let j = 0; j < tmp.length; j++) {
				if(i == j)
					continue;

				const jBounds = tmp[j];
				if(Bounds.tryFusion(fusion, jBounds) !== null) {
					iToSkip.push(j);
					fusion = Bounds.tryFusion(fusion, jBounds)
				}
			}

			duplicateXBounds.push(fusion);
		}

		return duplicateXBounds;
	}
}

export class BezierSpline extends Curve {
	#baseCurve
	#controlCurve
	#cubicBezierFactors
	#bezierPrecision

	get bezierPrecision() { return this.#bezierPrecision;    }
	get nbBasePoints()    { return this.#baseCurve.nbPoints; }

	constructor(basePoints = [], bezierPrecision = 2) {
		super();

		this.#baseCurve       = new Curve(basePoints);
		this.#controlCurve    = new Curve();
		this.#bezierPrecision = { value: bezierPrecision };
		this.fillControlCurve();
		this.fillCubicBezierFactors();
		this.buildSpline(true);
	}

	baseIdToSplineId(baseId = 0) {	
		if(baseId < 0 || baseId >= this.nbBasePoints)
			return -1;

		if(this.nbPoints <= 1)
			baseId = 0;

		return baseId * this.bezierPrecision.value;
	}

	baseIdToControlId(baseId = 0) {
		if(baseId < 0 || baseId >= this.nbBasePoints)
			return -1;

		return 2 * baseId;
	}

	buildSpline(forceClear = false) {
		if (this.nbBasePoints < 1)
			return;
		
		if (forceClear === true) {
			this.clear();

			if (this.nbBasePoints > 1)
				this.addPoints((this.nbBasePoints - 1) * this.bezierPrecision.value);
			else
				this.addPoint(this.getBasePoint(0));
		}

		for (let i = 0; i < this.nbBasePoints - 1; i++)
			this.setSplineSection(i);
	}

	fillControlCurve() {
		this.#controlCurve = new Curve();
		
		if (this.nbBasePoints <= 1)
			return;

		for (let i = 0; i < this.nbBasePoints; i++) {
			const defaultControls = this.getDefaultControlPoints(i);

			if(defaultControls[0] !== null)
				this.#controlCurve.addPoint(defaultControls[0]);
			if(defaultControls[1] !== null)
				this.#controlCurve.addPoint(defaultControls[1]);
		}
	}

	fillCubicBezierFactors() {
		this.#bezierPrecision.value = Math.round(this.#bezierPrecision.value);
		this.#cubicBezierFactors = [
			new Array(this.#bezierPrecision.value),
			new Array(this.#bezierPrecision.value),
			new Array(this.#bezierPrecision.value),
			new Array(this.#bezierPrecision.value)
		];

		for (let i = 0; i < this.#bezierPrecision.value; i++) {
			let t    = i / (this.#bezierPrecision.value - 1);
			let mt   = 1 - t;

			this.#cubicBezierFactors[0][i] =     mt * mt * mt; 
			this.#cubicBezierFactors[1][i] = 3 *  t * mt * mt; 
			this.#cubicBezierFactors[2][i] = 3 *  t *  t * mt; 
			this.#cubicBezierFactors[3][i] =      t *  t *  t;
		}
	}

	getBasePoint(baseId = 0) {
		return this.#baseCurve.getPoint(baseId);
	}

	getBasePoints() {
		return this.#baseCurve.getPoints();
	}

	getDefaultControlOffsets(baseId = 0) {
		if(baseId < 0 || baseId >= this.nbBasePoints)
			return [null, null];

		const controlId       = this.baseIdToControlId(baseId);
		const defaultControls = this.getDefaultControlPoints(baseId);
		let offset1 = null;
		let offset2 = null;

		if(defaultControls[0] !== null)
			offset1 = defaultControls[0].toPoint(this.#controlCurve.getPoint(controlId - 1));
		if(defaultControls[1] !== null)
			offset2 = defaultControls[1].toPoint(this.#controlCurve.getPoint(controlId));

		return [offset1, offset2];
	}

	getDefaultControlPoints(baseId = 0) {
		if(baseId < 0 || baseId >= this.nbBasePoints)
			return [null, null];

		const previous  = this.getBasePoint(baseId - 1);
		const current   = this.getBasePoint(baseId);
		const next      = this.getBasePoint(baseId + 1);
		let toCurrent   = (previous !== null) ? previous.toPoint(current) : null;
		let toNext      = (next !== null)     ? current.toPoint(next)     : null;
		toCurrent       = (toNext !== null && toCurrent === null) ? toNext    : toCurrent;
		toNext          = (toCurrent !== null && toNext === null) ? toCurrent : toNext;
		let tanDir      = Vec2.add(toCurrent.normalized(), toNext.normalized()).normalized();
		tanDir.scalarMult(20);
		let control1 = null;
		let control2 = null;

		if(previous !== null)
			control1 = Vec2.sub(current, tanDir);
		if(next !== null)
			control2 = Vec2.add(current, tanDir);

		return [control1, control2];
	}

	getControlPoints() {
		return this.#controlCurve.getPoints();
	}

	getClosestBaseId(otherPoint = Vec2.Zero) {
		return this.#baseCurve.getClosestPointId(otherPoint);
	}

	getDuplicateXPoints(fromBezierCurve = false) {
		if(fromBezierCurve === false)
			return this.#baseCurve.duplicateXPoints;
		else
			return this.duplicateXPoints;
	}

	insertBasePoint(baseId = 0, newPoint = Vec2.Zero) {
		if(!this.#baseCurve.isBetweenPoints(newPoint, baseId - 1) && baseId === this.nbBasePoints - 1)
			baseId++;

		this.#baseCurve.insertPoint(baseId, newPoint);
		if(this.nbBasePoints >= 2)
			this.fillControlCurve();

		if(this.nbPoints === 0)
			this.addPoint(newPoint);
		else
			this.buildSpline(true);

		return baseId;
	}

	removeBasePoint(baseId = 0) {
		let controlIds = [
			this.baseIdToControlId(baseId - 1),
			this.baseIdToControlId(baseId)
		];
		let controlOffsets = [
			this.getDefaultControlOffsets(baseId - 1),
			this.getDefaultControlOffsets(baseId + 1)
		];

		this.#baseCurve.removePoint(baseId);

		if(this.nbBasePoints === 1)
			this.#controlCurve.clear();
		else  {
			if(baseId === 0) {
				this.#controlCurve.removePoint(controlIds[1]);
				this.#controlCurve.removePoint(controlIds[1]);
			}
			else if(baseId === this.nbBasePoints) {
				this.#controlCurve.removePoint(controlIds[0]);
				this.#controlCurve.removePoint(controlIds[0]);
			}
			else {
				this.#controlCurve.removePoint(controlIds[0] + 1);
				this.#controlCurve.removePoint(controlIds[0] + 1);
			}
		
			let defaultControls = [
				this.getDefaultControlPoints(baseId - 1),
				this.getDefaultControlPoints(baseId)
			];

			for (let i = 0; i < controlIds.length; i++) {
				if(defaultControls[i][0] !== null)
					this.#controlCurve.setPoint(controlIds[i] - 1, Vec2.add(defaultControls[i][0], controlOffsets[i][0]));
				if(defaultControls[i][1] !== null)
					this.#controlCurve.setPoint(controlIds[i], Vec2.add(defaultControls[i][1], controlOffsets[i][1]));
			}
		}

		this.buildSpline(true);
	}

	setBasePoint(baseId = 0, newPoint = Vec2.Zero) {
		if(baseId < 0 || baseId >= this.nbBasePoints)
			return;

		let controlIds = null;
		let controlOffsets = null;

		if(this.nbBasePoints > 1) {
			controlIds = [
				this.baseIdToControlId(baseId - 1),
				this.baseIdToControlId(baseId),
				this.baseIdToControlId(baseId + 1)
			];
			controlOffsets = [
				this.getDefaultControlOffsets(baseId - 1),
				this.getDefaultControlOffsets(baseId),
				this.getDefaultControlOffsets(baseId + 1)
			];
		}

		this.#baseCurve.setPoint(baseId, newPoint);

		if(this.nbBasePoints > 1) {
			let defaultControls = [
				this.getDefaultControlPoints(baseId - 1),
				this.getDefaultControlPoints(baseId),
				this.getDefaultControlPoints(baseId + 1)
			];

			for (let i = 0; i < controlIds.length; i++) {
				if(defaultControls[i][0] !== null)
					this.#controlCurve.setPoint(controlIds[i] - 1, Vec2.add(defaultControls[i][0], controlOffsets[i][0]));
				if(defaultControls[i][1] !== null)
					this.#controlCurve.setPoint(controlIds[i], Vec2.add(defaultControls[i][1], controlOffsets[i][1]));
			}
			
			this.setSplineSection(baseId - 2);
			this.setSplineSection(baseId - 1);
			this.setSplineSection(baseId);
			this.setSplineSection(baseId + 1);
		}
	}

	setSplineSection(baseId = 0) {
		if(this.nbBasePoints === 0 || baseId < 0 || baseId >= this.nbBasePoints)
			return;

		if(this.nbBasePoints === 1)
			this.setPoint(0, this.getBasePoint(0));
		else {
			let sectionId = this.baseIdToSplineId(baseId);
			let controlId = this.baseIdToControlId(baseId);
			let start = this.getBasePoint(baseId);
			let control1 = this.#controlCurve.getPoint(controlId);
			let control2 = this.#controlCurve.getPoint(controlId + 1);
			let end = this.getBasePoint(baseId + 1);
			let bezierPoint = Vec2.Zero;

			if(start !== null && control1 !== null && control2 !== null && end !== null) {
				for (let p = 0; p < this.bezierPrecision.value; p++) {
					bezierPoint =   Vec2.scalarMult(start,    this.#cubicBezierFactors[0][p]);
					bezierPoint.add(Vec2.scalarMult(control1, this.#cubicBezierFactors[1][p]));
					bezierPoint.add(Vec2.scalarMult(control2, this.#cubicBezierFactors[2][p]));
					bezierPoint.add(Vec2.scalarMult(end,      this.#cubicBezierFactors[3][p]));

					this.setPoint(sectionId + p, bezierPoint);
				}
			}
		}
	}

	splineIdToBaseId(splineId = 0) {
		if(splineId < 0 || splineId >= this.nbPoints)
			return -1;

		return Math.ceil(splineId / this.bezierPrecision.value);
	}
}