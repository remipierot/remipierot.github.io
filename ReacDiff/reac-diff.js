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
	convolution: {type: "m3", value: undefined},	//Factors to compute the Laplacian
	click:       {type: "v2", value: undefined},	//Position of a click, if any
	clickRadius: {type:  "f", value: 0.0}			//Radius of a click
};

//Speed of the reaction-diffusion
const speed = {value: 1};

//Slider objects linked to environment variables
const sliders = {
	f:      {slider: document.getElementById("f-slider"),
			 label: document.getElementById("f-range-label"),
			 target: environment.f,
			 targetBounds: {min: .0, max: .1}},
	k:      {slider: document.getElementById("k-slider"), 
			 label: document.getElementById("k-range-label"),
			 target: environment.k,
			 targetBounds: {min: .0, max: .1}},
	da:     {slider: document.getElementById("da-slider"), 
			 label: document.getElementById("da-range-label"),
			 target: environment.da,
			 targetBounds: {min: .0, max: 1.0}},
	db:     {slider: document.getElementById("db-slider"), 
			 label: document.getElementById("db-range-label"),
			 target: environment.db,
			 targetBounds: {min: .0, max: 1.0}},
	speed:  {slider: document.getElementById("speed-slider"), 
			 label: document.getElementById("speed-range-label"),
			 target: speed,
			 targetBounds: {min: .0, max: 10.0}},
	radius: {slider: document.getElementById("radius-slider"), 
			 label: document.getElementById("radius-range-label"),
			 target: environment.clickRadius,
			 targetBounds: {min: 1.0, max: 10.0}},
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
// --------------------------------------------------------------------------------------

// ------------------------------- Listeners Registration -------------------------------
window.addEventListener("load", function(){
	//renderer.setSize(window.innerWidth - 350 - 23, 500);
	renderer.setSize(600, 600);
	document.getElementById("plot-panel").appendChild(renderer.domElement);
	scene.add(renderedPlane);

	const w = renderer.domElement.clientWidth;
	const h = renderer.domElement.clientHeight;
	const texType = THREE.FloatType;
	const texWrap = THREE.RepeatWrapping;
	const texAniso = 0;

	current = new THREE.WebGLRenderTarget(w, h, {type: texType, wrapS: texWrap, wrapT: texWrap, anisotropy: texAniso});
	next    = new THREE.WebGLRenderTarget(w, h, {type: texType, wrapS: texWrap, wrapT: texWrap, anisotropy: texAniso});

	environment.f.value     = 0.055;
	environment.k.value     = 0.062;
	environment.da.value    = 1.0;
	environment.db.value    = 0.5;
	environment.texel.value = new THREE.Vector2(1.0 / w, 1.0 / h);

	/*
	 * ThreeJS' Matrix3.set() takes arguments as row-major.
	 * https://threejs.org/docs/index.html#api/en/math/Matrix3
	 */
	environment.convolution.value = new THREE.Matrix3();
	environment.convolution.value.set(0.05, 0.2, 0.05,
									  0.2, -1.0, 0.2,
									  0.05, 0.2, 0.05);

	environment.click.value = defaultClick;
	environment.clickRadius.value = 2.0;

	sliders.speed.slider.min = sliders.speed.targetBounds.min;
	sliders.speed.slider.max = sliders.speed.targetBounds.max;
	sliders.radius.slider.min = sliders.radius.targetBounds.min;
	sliders.radius.slider.max = sliders.radius.targetBounds.max;

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

/*
document.getElementById("randomize").addEventListener("click", function(){
	sliders.f.slider.value = sliders.f.slider.min + Math.floor(Math.random() * (sliders.f.slider.max - sliders.f.slider.min + 1));
	sliders.k.slider.value = sliders.k.slider.min + Math.floor(Math.random() * (sliders.k.slider.max - sliders.k.slider.min + 1));
	sliders.da.slider.value = sliders.da.slider.min + Math.floor(Math.random() * (sliders.da.slider.max - sliders.da.slider.min + 1));
	sliders.db.slider.value = sliders.db.slider.min + Math.floor(Math.random() * (sliders.db.slider.max - sliders.db.slider.min + 1));

	for (const [k, v] of Object.entries(sliders)) {
		v.target.value = remap(v.slider.value, {min: v.slider.min, max: v.slider.max}, v.targetBounds); 
		updateLabel(v);
	}
});
*/

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
// --------------------------------------------------------------------------------------

// -------------------------------- Functions Definition --------------------------------
function step() {
	requestAnimationFrame(step);

	renderedPlane.material = modelMaterial;
	let swapEnvironment = false;

	for(let i = 0; i <= speed.value; i++) {
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
	}

	renderedPlane.material = colorMaterial;
	renderer.render(scene, camera);
}

function click(e) {
	const rendererBB = renderer.domElement.getBoundingClientRect();
	const x = e.clientX - rendererBB.left;
	const y = rendererBB.height - e.clientY + rendererBB.top;
	const inRenderer = (x >= 0 && x < rendererBB.width && y >= 0 && y < rendererBB.height);

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
// --------------------------------------------------------------------------------------