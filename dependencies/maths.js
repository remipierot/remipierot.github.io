import { FormatUtils } from './format-utils.js';

//Handle scalar remapping from one interval to another
export class Bounds {
	static UnitBounds = new Bounds(0, 1);
	
	#min
	#max
	#range

	get min() { return this.#min; }
	get max() { return this.#max; }
	set extreme(value) {
		if (!FormatUtils.isNumber(value) && !FormatUtils.canBeNumber(value)) 
			return;

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
	#duplicateXPoints

	get duplicateXPoints() {
		this.scanForDuplicateX();
		return this.#duplicateXPoints;
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
		if (id < 0 || id > this.#points.length || !(newPoint instanceof Vec2))
			return;
		
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
		this.scanForDuplicateX();
		return this.#duplicateXPoints.length === 0;
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

	scanForDuplicateX() {
		this.#duplicateXPoints = [[]];
		if(this.nbPoints <= 2)
			return;

		let alreadyDefinedX = new Bounds(this.getPoint(0).x, this.getPoint(1).x);
		let segmentId = 0;

		for (let i = 2; i < this.nbPoints; i++) {
			let current  = this.getPoint(i);

			if (alreadyDefinedX.isInBounds(current.x))
				this.#duplicateXPoints[segmentId].push(current);
			else {
				alreadyDefinedX.extreme = current.x;

				if(this.#duplicateXPoints[segmentId].length > 0) {
					this.#duplicateXPoints.push([]);
					segmentId++;
				}
			}
		}

		if(this.#duplicateXPoints[segmentId].length === 0)
			this.#duplicateXPoints.pop();
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
}

export class CardinalSpline extends Curve {
	#baseCurve
	#extendedCurve
	#cubicBezierFactors
	#alpha
	#bezierPrecision

	get alpha()           { return this.#alpha;              }
	get bezierPrecision() { return this.#bezierPrecision;    }
	get nbBasePoints()    { return this.#baseCurve.nbPoints; }

	constructor(basePoints = [], alpha = 1.0, bezierPrecision = 2) {
		super();

		this.#baseCurve     = new Curve(basePoints);
		this.#extendedCurve = new Curve(basePoints);
		this.#extendedCurve.insertPoint();
		this.#extendedCurve.addPoint();
		this.setExtendedExtremities();

		this.#alpha           = { value: alpha           };
		this.#bezierPrecision = { value: bezierPrecision };
		this.fillCubicBezierFactors();

		this.buildSpline(true);
	}

	baseIdToSplineId(baseId = 0) {	
		if(baseId < 0 || baseId >= this.nbBasePoints)
			return -1;
		
		let splineId = ((baseId - 1) * this.bezierPrecision.value) + 1;
		splineId = (baseId === 0) ? 0 : splineId;

		return splineId;
	}

	buildSpline(forceClear = false) {
		if (forceClear === true) {
			this.clear();
			this.addPoints(((this.nbBasePoints - 1) * this.#bezierPrecision.value) + 1);
		}

		for (let i = 0; i < this.nbBasePoints; i++)
			this.setSplineSection(i);
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

	getClosestBaseId(otherPoint = Vec2.Zero) {
		return this.#baseCurve.getClosestPointId(otherPoint);
	}

	insertBasePoint(baseId = 0, newPoint = Vec2.Zero) {
		if(!this.#baseCurve.isBetweenPoints(newPoint, baseId - 1) && baseId === this.nbBasePoints - 1)
			baseId++;
		
		this.#baseCurve.insertPoint(baseId, newPoint);
		this.#extendedCurve.insertPoint(baseId + 1, newPoint);
		this.setExtendedExtremities();

		if(this.nbPoints === 0)
			this.addPoint(newPoint);
		else
			this.insertSplineSection(baseId);

		return baseId;
	}

	insertSplineSection(baseId = 0) {
		this.insertPoints(this.baseIdToSplineId(baseId), this.#bezierPrecision.value);
		this.setSplineSection(baseId);
	}

	removeBasePoint(baseId = 0) {
		this.#baseCurve.removePoint(baseId);
		this.#extendedCurve.removePoint(baseId + 1);
		this.setExtendedExtremities();
		this.buildSpline(true);
	}

	removeSplineSection(baseId = 0) {
		this.removePoints(this.baseIdToSplineId(baseId), this.#bezierPrecision.value);
		this.setSplineSection(baseId);
	}

	setBasePoint(baseId = 0, newPoint = Vec2.Zero) {
		this.#baseCurve.setPoint(baseId, newPoint);
		this.#extendedCurve.setPoint(baseId + 1, newPoint);
		this.setExtendedExtremities();
		this.setSplineSection(baseId);
	}

	setExtendedEnd() {
		if(this.nbBasePoints < 2) 
			return;

		let ed0 = this.#baseCurve.getPoint(this.nbBasePoints - 1);
		let ed1 = this.#baseCurve.getPoint(this.nbBasePoints - 2);
		this.#extendedCurve.setPoint(this.nbBasePoints + 1, ed1.toPoint(Vec2.scalarMult(ed0, 2)));
	}

	setExtendedExtremities() {
		this.setExtendedStart();
		this.setExtendedEnd();
	}

	setExtendedStart() {
		if(this.nbBasePoints < 2) 
			return;

		let st0 = this.#baseCurve.getPoint(0);
		let st1 = this.#baseCurve.getPoint(1);
		this.#extendedCurve.setPoint(0, st1.toPoint(Vec2.scalarMult(st0, 2)));
	}

	setSplineSection(baseId = 0) {
		for (let i = baseId - 1; i <= baseId + 2; i++) {
			if (i === 0) 
				this.setPoint(0, this.#baseCurve.getPoint(0));
			else if (i > 0 && i < this.nbBasePoints){
				let sectionId = this.baseIdToSplineId(i);
				let mi1, i0, i1, i2;
				let start, ctrl1, ctrl2, end;
				let bezierPoint;

				for (let p = 0; p < this.bezierPrecision.value; p++) {
					mi1   = this.#extendedCurve.getPoint(i - 1);
					i0    = this.#extendedCurve.getPoint(i);
					i1    = this.#extendedCurve.getPoint(i + 1);
					i2    = this.#extendedCurve.getPoint(i + 2);

					start = i0;
					ctrl1 = Vec2.add(i0, Vec2.scalarDiv(mi1.toPoint(i1), this.alpha.value));
					ctrl2 = Vec2.sub(i1, Vec2.scalarDiv(i0.toPoint(i2),  this.alpha.value));
					end   = i1;

					bezierPoint =   Vec2.scalarMult(start, this.#cubicBezierFactors[0][p]);
					bezierPoint.add(Vec2.scalarMult(ctrl1, this.#cubicBezierFactors[1][p]));
					bezierPoint.add(Vec2.scalarMult(ctrl2, this.#cubicBezierFactors[2][p]));
					bezierPoint.add(Vec2.scalarMult(end,   this.#cubicBezierFactors[3][p]));

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