import Utils from './utils.js';

//Handle scalar remapping from one interval to another
export class Bounds {
	static UnitBounds = new Bounds(0, 1);
	
	#min
	#max
	#range

	get min() { return this.#min; }
	get max() { return this.#max; }

	/*
	 * Min always gets the lowest value affected
	 * Max always gets the highest value affected
	 * If a can not be a number, it gets the 0.0 default value
	 * If b can not be a number, it gets the 1.0 default value
	 */
	constructor(a = 0.0, b = 1.0) {
		if (!Utils.isNumber(a))
			a = Utils.canBeNumber(a) ? Number(a) : 0.0;
		if (!Utils.isNumber(b))
			b = Utils.canBeNumber(b) ? Number(b) : 1.0;

		this.#min = (a < b) ? a : b;
		this.#max = (a < b) ? b : a;
		this.#range = this.#max - this.#min;
	}

	/*
	 * If the given value is contained in these bounds (min and max included),
	 * will return its normalized value (in [0,1])
	 */
	normalize(value) {
		if (!Utils.isNumber(value) && !Utils.canBeNumber(value)) 
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
		if (!Utils.isNumber(value) && !Utils.canBeNumber(value)) 
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
		if (!Utils.isNumber(value) && !Utils.canBeNumber(value)) 
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