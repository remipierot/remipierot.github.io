//Safety checks and other useful methods
export class FormatUtils {
	//Check if a value can be considered a number (even if it is a string representing a number for example)
	static canBeNumber(value) {
		return !isNaN(parseFloat(value));
	}

	//Check if a value is a number (no string / null / undefined etc allowed)
	static isNumber(value) {
		return FormatUtils.canBeNumber(value) && value[0] === undefined;
	}

	//Transform a value into a Number if possible, or return the defaultValue if not
	static makeNumber(value, defaultValue = 0.0) {
		if (!FormatUtils.isNumber(value))
			value = FormatUtils.canBeNumber(value) ? Number(value) : defaultValue;
		
		return value;
	}

	//Check if value can be called
	static isFunction(value) {
 		return Object.prototype.toString.call(value) == '[object Function]';
	}

	//Check if value is a color
	static isColor(value) {
		let tmp = new Option().style;
		tmp.color = value;
		return tmp.color !== '';
	}

	//Check if value can be a boolean (string true/false accepted)
	static canBeBoolean(value) {
		let tmp = String(value).toLowerCase();
		return tmp === 'true' || tmp === 'false';
	}

	//Check if value is a boolean (no string accepted)
	static isBoolean(value) {
		return value === true || value === false;
	}

	//Check if a given id is valid regarding the given array
	static isIdValid(id, array) {
		return id >= 0 && id < array.length;
	}

	//Return the given value as a string with nbDigitsInt digits before the separator and nbDigitsFloat digits after it
	static valueToString(value, nbDigitsInt, nbDigitsFloat, separator = '.') {
		if (!FormatUtils.isNumber(value) && !FormatUtils.canBeNumber(value)) 
			return null;

		value = Number(value);
		let split = value.toFixed(nbDigitsFloat).split('.');
		let vString = split[0].padStart(nbDigitsInt, '0');

		if(nbDigitsFloat > 0) { vString += `${separator}${split[1]}`; } 

		return vString;
	}
}