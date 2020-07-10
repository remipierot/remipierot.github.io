// --------------------------------- Classes Declaration --------------------------------
//Safety checks and other useful methods
class Utils {
	//Check if a value can be considered a number (even if it is a string representing a number for example)
	static canBeNumber(value) {
		return !isNaN(parseFloat(value));
	}

	//Check if a value is a number (no string / null / undefined etc allowed)
	static isNumber(value) {
		return Utils.canBeNumber(value) && value[0] === undefined;
	}

	//Check if value can be called
	static isFunction(value) {
 		return Object.prototype.toString.call(value) == '[object Function]';
	}

	//Return the given value as a string with nbDigitsInt digits before the separator and nbDigitsFloat digits after it
	static valueToString(value, nbDigitsInt, nbDigitsFloat, separator = '.') {
		if (!Utils.isNumber(value) && !Utils.canBeNumber(value)) 
			return null;

		value = Number(value);
		let split = value.toFixed(nbDigitsFloat).split('.');
		let vString = split[0].padStart(nbDigitsInt, '0');

		if(nbDigitsFloat > 0) { vString += `${separator}${split[1]}`; } 

		return vString;
	}

	//Return the textContent of the dom element with the given ID
	static getContent(id) {
		return document.getElementById(id).textContent;
	}
}

//Handle scalar remapping from one interval to another
class Bounds {
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
	static remap(value, sourceBounds, targetBounds) {
		let remapped = null;
		if (sourceBounds.isInBounds(value))
			remapped = targetBounds.remap(sourceBounds.normalize(value));

		return remapped;
	}
}

//Link a DOM element slider with a variable object
//The target object has to have a 'value' attribute for the link to properly work
class VarSlider {
	#domSlider			//Slider DOM element
	#domLabel			//Slider label DOM element
	#target				//Target linked to the slider, has to be an object with a 'value' attribute for proper linking
	#targetBounds		//Bounds of the target value
	#sliderBounds		//Bounds of the slider DOM element (not necessarily equal to targetBounds)
	#nbDigitsInt		//Number of digits used to represent the integer part of numbers
	#nbDigitsFloat		//Number of digits used to represent the float part of numbers
	#targetMaxString	//String form of targetBounds.max 

	/*
	 * Link the slider DOM element to its target by registering an event listener on 'input'
	 *
	 * If forceEqualBounds is true, the sliderBounds will be equal to the targetBounds
	 * inputEvent allows the caller to add any callback function to the listener on 'input', in addition to what is already being done
	 */
	constructor(sliderID, labelID, target, targetMin, targetMax, nbDigitsInt, nbDigitsFloat, forceEqualBounds = false, inputEvent = null) {
		this.#domSlider    = document.getElementById(sliderID);
		this.#domLabel     = document.getElementById(labelID);
		this.#target       = target;
		this.#targetBounds = new Bounds(targetMin, targetMax);

		//Ensure that the slider and the target have the exact same bounds
		if (forceEqualBounds) {
			this.#domSlider.min = this.#targetBounds.min;
			this.#domSlider.max = this.#targetBounds.max;
		}

		this.#sliderBounds    = new Bounds(this.#domSlider.min, this.#domSlider.max);
		this.#nbDigitsInt     = nbDigitsInt;
		this.#nbDigitsFloat   = nbDigitsFloat;
		this.#targetMaxString = Utils.valueToString(this.#targetBounds.max, this.#nbDigitsInt, this.#nbDigitsFloat);

		//Make sure inputEvent is a callable function
		if (!Utils.isFunction(inputEvent)) { inputEvent = () => {}; }

		let self = this;
		this.#domSlider.addEventListener("input", function(){
			self.updateTargetValue();
			self.updateLabelText();
			inputEvent.call();
		});

		this.updateSliderValue();
		this.updateLabelText();
	}

	//Set the slider value using the target one
	updateSliderValue() {
		this.#domSlider.value = Bounds.remap(this.#target.value, this.#targetBounds, this.#sliderBounds);
	}

	//Set the target value using the slider one
	updateTargetValue() {
		this.#target.value = Bounds.remap(this.#domSlider.value, this.#sliderBounds, this.#targetBounds);
	}

	//Set the slider label text using the target value
	updateLabelText() {
		let vString = Utils.valueToString(this.#target.value, this.#nbDigitsInt, this.#nbDigitsFloat);
		this.#domLabel.innerHTML = `(${vString} / ${this.#targetMaxString})`;
	}
}

class Engine {
	//Rendering
	#renderer 	//WebGL renderer
	#scene 		//Scene in which the rendering will be done
	#camera 	//Camera used to render the scene

	//Render data
	#defaultClick	//Default value of the click (outside of the renderer)
	#environment 	//Data sent to the shader and linked to the sliders, Gray-Scott model parameters
	#modelMaterial 	//Material holding the shader responsible for the Gray-Scott model computation
	#colorMaterial	//Material holding the shader responsible for the final aspect of the render (coloring)
	#renderedPlane 	//Plane to render
	#speed 			//Speed of the rendering, the higher the more consuming
	#zoom 			//Zoom in the renderer to avoid drawing to much elements, the lower the more consuming
	#rTarget1		//Render target holding a state (current or next) of the Gray-Scott model
	#rTarget2		//Render target holding a state (current or next) of the Gray-Scott model
	
	//Sizing data
	#widthOffset 	//Width to substract to the window size to fill the renderer DOM element
	#heightOffset 	//height to substract to the window size to fill the renderer DOM element
	#resizeRTargets	//True if the rTargets should be resized

	get f()     { return this.#environment.f;  }
	get k()     { return this.#environment.k;  }
	get da()    { return this.#environment.da; }
	get db()    { return this.#environment.db; }
	get speed() { return this.#speed;          }
	get zoom()  { return this.#zoom;           }

	//Initialize the engine, but do not start the rendering
	constructor(parentID, widthOffset, heightOffset) {
		//Rendering
		this.#renderer = new THREE.WebGLRenderer();
		this.#scene = new THREE.Scene();
		this.#camera = new THREE.OrthographicCamera();

		//Render data
		this.#defaultClick = new THREE.Vector3(-1.0, -1.0, 5.0);
		this.#environment = {
			current:  {type:  "t", value: null},				//Texture holding the current state of the Gray-Scott model
			f:        {type:  "f", value: 0.055},				//Feed rate (A addition rate)
			k:        {type:  "f", value: 0.062},				//Kill rate (B removal rate)
			da:       {type:  "f", value: 1.0},					//A diffusion rate
			db:       {type:  "f", value: 0.5},					//B diffusion rate
			texel:    {type: "v2", value: null},				//Texture pixel
			diagonal: {type:  "f", value: 0.05},				//Laplacian weight for diagonal neighbours
			direct:   {type:  "f", value: 0.2},					//Laplacian weight for direct neighbours
			myself:   {type:  "f", value: -1.0},				//Laplacian weight for myself
			click:    {type: "v3", value: this.#defaultClick}, 	//Position and radius of a click, if any
		};
		this.#modelMaterial = new THREE.ShaderMaterial({
			uniforms:       this.#environment,
			vertexShader:   Utils.getContent("vShader"),
			fragmentShader: Utils.getContent("modelFShader")
		});
		this.#colorMaterial = new THREE.ShaderMaterial({
			uniforms:       this.#environment,
			vertexShader:   Utils.getContent("vShader"),
			fragmentShader: Utils.getContent("colorFShader")
		});
		this.#renderedPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.#colorMaterial);
		this.#speed         = {value: 5};
		this.#zoom          = {value: 2};
		this.#rTarget1     	= null;
		this.#rTarget2		= null;

		//Sizing data
		this.#widthOffset    = widthOffset;
		this.#heightOffset   = heightOffset;
		this.#resizeRTargets = false;

		//Listeners on mouse events
		let self = this;
		this.#renderer.domElement.addEventListener("mousedown", function(e){
			self.click(e);
		});
		this.#renderer.domElement.addEventListener("mouseup", function(e){
			if (e.which !== 1) { return; } //Don't do anything if not left click
			self.#environment.click.value = new THREE.Vector3(
				self.#defaultClick.x, self.#defaultClick.y, self.#defaultClick.z / self.zoom.value
			);
		});

		//Renderer and scene setup
		this.#scene.add(this.#renderedPlane);
		document.getElementById(parentID).appendChild(this.#renderer.domElement);
		this.fillWindow();
		this.#environment.current.value = this.#rTarget1.texture;
	}

	//Render one step (or more, based on speed) of the Gray-Scott model
	step() {
		this.#renderedPlane.material = this.#modelMaterial;

		//If the current value of our model is rTarget1,
		//this step will draw the state in rTarget1 on rTarget2
		//and vice-versa
		let draw1On2 = this.#environment.current.value === this.#rTarget1.texture;

		for (let i = 0; i < this.#speed.value; i++) {
			if(this.#resizeRTargets) {
				const scaledDim = this.getScaledDimensions();

				//Ensure the render target we resize is not the one holding the state at this time
				//If we are going to draw rTarget1 we can resize rTarget2 safely, and vice-versa 
				if(draw1On2)
					this.#rTarget2.setSize(scaledDim.w, scaledDim.h);
				else
					this.#rTarget1.setSize(scaledDim.w, scaledDim.h);

				//Keep resizing render targets until they have the same dimensions
				this.#resizeRTargets = 
					this.#rTarget1.width != this.#rTarget2.width || 
					this.#rTarget1.height != this.#rTarget2.height;
			}

			//The render targets have to be swaped after each step 
			//so that the shader receive the next environment state next time
			this.renderAndSwap(draw1On2 ? this.#rTarget2 : this.#rTarget1);
			draw1On2 = !draw1On2;
		}

		//Render the colored version
		this.#renderedPlane.material = this.#colorMaterial;
		this.#renderer.render(this.#scene, this.#camera);
		requestAnimationFrame(() => this.step());
	}

	//Render the next model state on the given target
	//and set it as the current state 
	renderAndSwap(renderTarget) {
		this.#renderer.setRenderTarget(renderTarget);
		this.#renderer.render(this.#scene, this.#camera);
		this.#renderer.setRenderTarget(null);
		this.#environment.current.value = renderTarget.texture;
	}

	//Add a spot of B chemical on the clicked location, if inside the renderer
	//The inRenderer check is needed because this method is also registered in the window mousemove event listener
	click(e) {
		if (e.which !== 1) { return; } //Don't do anything if not left click

		const rendererBB = this.#renderer.domElement.getBoundingClientRect();
		const x = (e.clientX - rendererBB.left) / this.#zoom.value;
		const y = (rendererBB.height - e.clientY + rendererBB.top) / this.#zoom.value;
		const dim = this.getScaledDimensions();
		const inRenderer = (x >= 0 && x < dim.w && y >= 0 && y < dim.h);
		const radius = this.#defaultClick.z / this.#zoom.value;

		this.#environment.click.value = inRenderer 
			? new THREE.Vector3(x, y, radius) 
			: new THREE.Vector3(this.#defaultClick.x, this.#defaultClick.y, radius);
	}

	//Ensure that the renderer takes as much space as possible inside the window without having to scroll
	fillWindow() {
		this.#renderer.setSize(window.innerWidth - this.#widthOffset, window.innerHeight - this.#heightOffset);

		const scaledDim = this.getScaledDimensions();
		const texType   = THREE.FloatType;
		const texWrap   = THREE.RepeatWrapping;

		//Create the render targets only if they do not exist yet
		//Otherwise force them to resize (see step() definition for this)		
		if(this.#rTarget1 === null) {
			this.#rTarget1 = new THREE.WebGLRenderTarget(scaledDim.w, scaledDim.h, {
				type: texType, 
				wrapS: texWrap, 
				wrapT: texWrap
			});
			this.#rTarget2 = this.#rTarget1.clone();
		}
		else{
			this.#resizeRTargets = true;
		}

		this.#environment.texel.value = new THREE.Vector2(1.0 / scaledDim.w, 1.0 / scaledDim.h);
	}

	//Get the renderer dimensions scaled with the zoom factor
	getScaledDimensions() {
		return {
			w: this.#renderer.domElement.clientWidth  / this.#zoom.value, 
			h: this.#renderer.domElement.clientHeight / this.#zoom.value
		};
	}
}
// --------------------------------------------------------------------------------------

// ------------------------------ Variables Initialization ------------------------------
const engine = new Engine("plot-panel", document.getElementById("settings-panel").offsetWidth + 28, 28);

//Slider objects linked to engine variables
const varSliders = {
	f:     new VarSlider("f-slider",     "f-range-label",     engine.f,     0.0, 0.1, 2, 3),
	k:     new VarSlider("k-slider",     "k-range-label",     engine.k,     0.0, 0.1, 2, 3),
	da:    new VarSlider("da-slider",    "da-range-label",    engine.da,    0.1, 1.0, 2, 3),
	db:    new VarSlider("db-slider",    "db-range-label",    engine.db,    0.1, 1.0, 2, 3),
	speed: new VarSlider("speed-slider", "speed-range-label", engine.speed, 1.0, 5.0, 2, 0, true),
	zoom:  new VarSlider("zoom-slider",  "zoom-range-label",  engine.zoom,  2.0, 5.0, 2, 0, true, () => engine.fillWindow())
};
// --------------------------------------------------------------------------------------

// ------------------------------- Listeners Registration -------------------------------
window.addEventListener("load", function(){
	engine.step();
});

window.addEventListener("mousemove", function(e){
	engine.click(e);
});

window.addEventListener("resize", function(){
	engine.fillWindow();
});
// --------------------------------------------------------------------------------------