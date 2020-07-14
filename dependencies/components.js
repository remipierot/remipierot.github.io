import   Utils    from './utils.js';
import { Bounds } from './maths.js';

//Link a DOM element with a variable object
//The target object has to have a 'value' attribute for the link to properly work
class VarComponent {
	domElement	//DOM element
	domLabel	//Label of the DOM element
	target		//Target linked to the DOM element, has to be an object with a 'value' attribute for proper linking

	set enabled(value) {
		if(value === true) {
			this.domElement.removeAttribute("disabled");
			this.domLabel.removeAttribute("disabled");
		}
		else {
			this.domElement.setAttribute("disabled", "disabled");
			this.domLabel.setAttribute("disabled", "disabled");
		}
	}

	get domValue() {
		return this.domElement.value;
	}

	get targetValue() {
		return this.target.value;
	}
	
	constructor(domID, labelID, target, inputEvent = null) {
		this.domElement = document.getElementById(domID);
		this.domLabel   = document.getElementById(labelID);
		this.target     = target;

		//Make sure inputEvent is a callable function
		if (!Utils.isFunction(inputEvent)) { inputEvent = () => {}; }

		let self = this;
		this.domElement.addEventListener("input", function(){
			self.updateTargetValue();
			self.updateLabelText();
			inputEvent.call();
		});
	}

	//Change the target value using an external parameter
	modifyTargetValue(newValue) {
		this.target.value = newValue;
		this.updateElementValue();
		this.updateLabelText();
	}

	//Set the DOM element value using the target one
	updateElementValue() {
		this.domElement.value = this.target.value;
	}

	//Set the target value using the DOM element one
	updateTargetValue() {
		this.target.value = this.domElement.value;
	}

	//Set the label text
	updateLabelText() { }
}

export class VarSlider extends VarComponent {
	#targetBounds		//Bounds of the target value
	#sliderBounds		//Bounds of the slider DOM element (not necessarily equal to targetBounds)
	#nbDigitsInt		//Number of digits used to represent the integer part of numbers
	#nbDigitsFloat		//Number of digits used to represent the float part of numbers
	#targetMaxString	//String form of targetBounds.max 

	get domElement() { return null; }
	get domLabel()   { return null; }
	get target()     { return null; }

	/*
	 * Link the slider DOM element to its target by registering an event listener on 'input'
	 *
	 * If forceEqualBounds is true, the sliderBounds will be equal to the targetBounds
	 * inputEvent allows the caller to add any callback function to the listener on 'input', in addition to what is already being done
	 */
	constructor(sliderID, labelID, target, targetMin, targetMax, nbDigitsInt, nbDigitsFloat, forceEqualBounds = false, inputEvent = null) {
		super(sliderID, labelID, target, inputEvent);
		
		this.#targetBounds = new Bounds(targetMin, targetMax);

		//Ensure that the slider and the target have the exact same bounds
		if (forceEqualBounds) {
			this.domElement.min = this.#targetBounds.min;
			this.domElement.max = this.#targetBounds.max;
		}

		this.#sliderBounds    = new Bounds(this.domElement.min, this.domElement.max);
		this.#nbDigitsInt     = nbDigitsInt;
		this.#nbDigitsFloat   = nbDigitsFloat;
		this.#targetMaxString = Utils.valueToString(this.#targetBounds.max, this.#nbDigitsInt, this.#nbDigitsFloat);

		this.updateElementValue();
		this.updateLabelText();
	}

	//Set the slider value using the target one
	updateElementValue() {
		this.domElement.value = Bounds.remapUsingBounds(this.target.value, this.#targetBounds, this.#sliderBounds);
	}

	//Set the target value using the slider one
	updateTargetValue() {
		this.target.value = Bounds.remapUsingBounds(this.domElement.value, this.#sliderBounds, this.#targetBounds);
	}

	//Change the target value using an external parameter
	modifyTargetValue(newValue) {
		if (!this.#targetBounds.isInBounds(newValue)) { return; }
		super.modifyTargetValue(Number(newValue));
	}

	//Set the slider label text using the target value
	updateLabelText() {
		let vString = Utils.valueToString(this.target.value, this.#nbDigitsInt, this.#nbDigitsFloat);
		this.domLabel.innerHTML = `(${vString} / ${this.#targetMaxString})`;
	}

	//Set the DOM element value randomly inside its bounds
	randomizeElementValue() {
		this.domElement.value = Bounds.remapUsingBounds(Math.random(), Bounds.UnitBounds, this.#sliderBounds);
		this.updateTargetValue();
		this.updateLabelText(); 
	}
}

export class VarColor extends VarComponent {
	constructor(colorID, labelID, target, inputEvent = null) {
		super(colorID, labelID, target, inputEvent);
	}

	//Change the target value using an external parameter
	modifyTargetValue(newValue) {
		if (!Utils.isColor(newValue)) { return; }
		super.modifyTargetValue(newValue);
	}
}

export class VarCheckbox extends VarComponent {
	get domValue() {
		return this.domElement.checked;
	}
	
	constructor(checkboxID, labelID, target, inputEvent = null) {
		super(checkboxID, labelID, target, inputEvent);
	}

	//Set the checkbox checked value using the target one
	updateElementValue() {
		this.domElement.checked = this.target.value;
	}

	//Set the target value using the checkbox checked one
	updateTargetValue() {
		this.target.value = this.domElement.checked;
	}

	//Change the target value using an external parameter
	modifyTargetValue(newValue) {
		if (!Utils.canBeBoolean(newValue)) { return; }
		let tmp = String(newValue).toLowerCase();
		super.modifyTargetValue(tmp === 'true' ? true : false);
	}
}