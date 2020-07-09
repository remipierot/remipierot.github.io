// ------------------------------ Variables Initialization ------------------------------
const scene    = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();

/*
 * We are drawing on a plane in a 2D space 
 * regardless of any projection matrix,
 * so any camera will do. 
 * In other words, we never use any attribute of the
 * camera in the shaders.
 */
const camera = new THREE.OrthographicCamera();

//Data passed to the shader
const environment = {
	current:     {type:  "t", value: undefined},	//Texture to draw the environment
	f:           {type:  "f", value: 0.0},			//Feed rate (A addition rate)
	k:           {type:  "f", value: 0.0},			//Kill rate (B removal rate)
	da:          {type:  "f", value: 0.0},			//A diffusion rate
	db:          {type:  "f", value: 0.0},			//B diffusion rate
	texel:       {type: "v2", value: undefined},	//Texture pixel
	diagonal:    {type:  "f", value: 0.0},			//Laplacian weight for diagonal neighbours
	direct:      {type:  "f", value: 0.0},			//Laplacian weight for direct neighbours
	myself:      {type:  "f", value: 0.0},			//Laplacian weight for myself
	click:       {type: "v2", value: undefined},	//Position of a click, if any
	clickRadius: {type:  "f", value: 0.0}			//Radius of a click
};

//Speed of the reaction-diffusion
const speed = {value: 5};

//Slider objects linked to environment variables
const sliders = {
	f:      {slider: document.getElementById("f-slider"),
			 label:  document.getElementById("f-range-label"),
			 target: environment.f,
			 targetBounds: {min: .0, max: .1}},
	k:      {slider: document.getElementById("k-slider"), 
			 label:  document.getElementById("k-range-label"),
			 target: environment.k,
			 targetBounds: {min: .0, max: .1}},
	da:     {slider: document.getElementById("da-slider"), 
			 label:  document.getElementById("da-range-label"),
			 target: environment.da,
			 targetBounds: {min: .0, max: 1.0}},
	db:     {slider: document.getElementById("db-slider"), 
			 label:  document.getElementById("db-range-label"),
			 target: environment.db,
			 targetBounds: {min: .0, max: 1.0}},
	speed:  {slider: document.getElementById("speed-slider"), 
			 label:  document.getElementById("speed-range-label"),
			 target: speed,
			 targetBounds: {min: .0, max: 10.0}}
}

//Material holding the fragment shader responsible for the Gray-Scott model computation
const modelMaterial = new THREE.ShaderMaterial({
	uniforms:       environment,
	vertexShader:   document.getElementById("vShader").textContent,
	fragmentShader: document.getElementById("modelFShader").textContent
});

//Material holding the fragment shader responsible for the final aspect of the environment (coloring)
const colorMaterial = new THREE.ShaderMaterial({
	uniforms:       environment,
	vertexShader:   document.getElementById("vShader").textContent,
	fragmentShader: document.getElementById("colorFShader").textContent
});

//Plane on which the environment will be rendered
const renderedPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), colorMaterial);

//Default value of the click uniform (outside of the renderer)
const defaultClick = new THREE.Vector2(-1.0, -1.0);

//Texture representing the current state of the environment
var current = undefined;

//Texture representing the next state of the environment
var next = undefined;

//Scaling of the renderer dimensions
var dimensionScale = .5;
// --------------------------------------------------------------------------------------

// ------------------------------- Listeners Registration -------------------------------
window.addEventListener("load", function(){
	document.getElementById("plot-panel").appendChild(renderer.domElement);
	fillWindow();
	scene.add(renderedPlane);

	environment.f.value           = 0.055;
	environment.k.value           = 0.062;
	environment.da.value          = 1.0;
	environment.db.value          = 0.5;
	environment.diagonal.value    = 0.05;
	environment.direct.value      = 0.2;
	environment.myself.value      = -1.0;
	environment.click.value       = defaultClick;
	environment.clickRadius.value = 5.0;

	sliders.speed.slider.min  = sliders.speed.targetBounds.min;
	sliders.speed.slider.max  = sliders.speed.targetBounds.max;

	for (const [k, v] of Object.entries(sliders)) {
		v.slider.value = remap(v.target.value, v.targetBounds, {min: v.slider.min, max: v.slider.max});
		updateLabel(v);
	}

	step();
});

for (const [k, v] of Object.entries(sliders)) {
	v.slider.addEventListener("input", function(){
		v.target.value = remap(v.slider.value, {min: v.slider.min, max: v.slider.max}, v.targetBounds); 
		updateLabel(v);
	});
}

renderer.domElement.addEventListener("mousedown", function(e){
	if(e.which !== 1) { return; } //Don't do anything if not left click
	click(e);
});

window.addEventListener("mousemove", function(e){
	if(e.which !== 1) { return; } //Don't do anything if not left click
	click(e);
});

renderer.domElement.addEventListener("mouseup", function(e){
	if(e.which !== 1) { return; } //Don't do anything if not left click
	environment.click.value = defaultClick;
});

window.addEventListener("resize", function(){
	fillWindow();
});
// --------------------------------------------------------------------------------------

// -------------------------------- Functions Definition --------------------------------
function step() {
	requestAnimationFrame(step);
	renderedPlane.material = modelMaterial;
	let swapEnvironment = false;

	for(let i = -1; i < speed.value; i++) {
		if(swapEnvironment) {
			environment.current.value = next.texture;
			renderer.setRenderTarget(current);
			renderer.render(scene, camera);
			renderer.setRenderTarget(null);
			environment.current.value = current.texture;
		}
		else {
			environment.current.value = current.texture; 
			renderer.setRenderTarget(next);
			renderer.render(scene, camera);
			renderer.setRenderTarget(null);
			environment.current.value = next.texture;
		}

		swapEnvironment = !swapEnvironment;
		environment.click.value = defaultClick;
	}

	renderedPlane.material = colorMaterial;
	renderer.render(scene, camera);
}

function click(e) {
	const rendererBB = renderer.domElement.getBoundingClientRect();
	const x = (e.clientX - rendererBB.left) / 2;
	const y = (rendererBB.height - e.clientY + rendererBB.top) / 2;
	const dim = getScaledDimensions();
	const inRenderer = (x >= 0 && x < dim.w && y >= 0 && y < dim.h);

	environment.click.value = inRenderer ? new THREE.Vector2(x, y) : defaultClick;
}

function updateLabel(sliderObj) {
	sliderObj.label.innerHTML = " (" + sliderObj.target.value.toFixed(3) + " / " + sliderObj.targetBounds.max.toFixed(3) + ")";
}

//Translate the given value from the given space to the target one
function remap(value, currentBounds, targetBounds) {
	//Ensure every received data is a number
	value = Number(value);
	currentBounds.min = Number(currentBounds.min);
	currentBounds.max = Number(currentBounds.max);
	targetBounds.min = Number(targetBounds.min);
	targetBounds.max = Number(targetBounds.max);

	//Normalize the value to get its relative position in [0, 1]
	let targetValue = (value - currentBounds.min) / (currentBounds.max - currentBounds.min);

	//Having [0,1] as the target space is the same thing as normalization, which is already achieved at this point
	if(targetBounds.min != 0 || targetBounds.max != 1) {
		//Use the relative position to place the value in the target space [targetMin, targetMax]
		targetValue = targetBounds.min + (targetBounds.max - targetBounds.min) * targetValue
	}

	return targetValue;
}

function fillWindow() {
	renderer.setSize(window.innerWidth - 350 - 23, window.innerHeight - 25);

	const scaledDim = getScaledDimensions();
	const texType = THREE.FloatType;
	const texWrap = THREE.RepeatWrapping;
	const texFilter = THREE.LinearFilter;

	current = new THREE.WebGLRenderTarget(scaledDim.w, scaledDim.h, {
		type: texType, 
		wrapS: texWrap, 
		wrapT: texWrap, 
		magFilter: texFilter,
		minFilter: texFilter});
	next = new THREE.WebGLRenderTarget(scaledDim.w, scaledDim.h, {
		type: texType, 
		wrapS: texWrap, 
		wrapT: texWrap, 
		magFilter: texFilter,
		minFilter: texFilter});

	environment.texel.value = new THREE.Vector2(1.0 / scaledDim.w, 1.0 / scaledDim.h);
}

function getScaledDimensions() {
	return {
		w: renderer.domElement.clientWidth * dimensionScale, 
		h: renderer.domElement.clientHeight * dimensionScale};
}
// --------------------------------------------------------------------------------------