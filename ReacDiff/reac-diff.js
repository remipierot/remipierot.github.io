import   * as THREE  from '../dependencies/three.module.js';
import   Utils       from '../dependencies/utils.js';
import { VarSlider } from '../dependencies/components.js';

// --------------------------------- Classes Declaration --------------------------------
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
	#empty			//Tells if the environment contains some B (not empty) or not (empty)
	
	//Sizing data
	#plotPanel
	#hintDiv
	#resizeRTargets	//True if the rTargets should be resized

	//Data getters
	get f()     { return this.#environment.f;  }
	get k()     { return this.#environment.k;  }
	get da()    { return this.#environment.da; }
	get db()    { return this.#environment.db; }
	get speed() { return this.#speed;          }
	get zoom()  { return this.#zoom;           }
	get empty() { return this.#empty.value;    }

	//Initialize the engine, but do not start the rendering
	constructor(plotID, hintID) {
		//Rendering
		this.#renderer = new THREE.WebGLRenderer();
		this.#scene    = new THREE.Scene();
		this.#camera   = new THREE.OrthographicCamera();

		//Render data
		this.#defaultClick = new THREE.Vector3(-1.0, -1.0, 5.0);
		this.#environment  = {
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
		this.#empty         = {value: true};

		//Sizing data
		this.#plotPanel      = document.getElementById(plotID);
		this.#hintDiv        = document.getElementById(hintID);
		this.#resizeRTargets = false;

		//Listeners on mouse events
		let self = this;
		this.#renderer.domElement.addEventListener("mousedown", function(e){
			self.click(e);
		});

		//Renderer and scene setup
		this.#renderer.setClearColor(new THREE.Color(0xffffff));
		this.#scene.add(this.#renderedPlane);
		this.#plotPanel.appendChild(this.#renderer.domElement);
		this.fillWindow();
		this.updateRenderTargets();
		this.#environment.current.value = this.#rTarget1.texture;
	}

	//Add a spot of B chemical on the clicked location, if inside the renderer
	//The inRenderer check is needed because this method is also registered in the window mousemove event listener
	click(e) {
		if (e.which !== 1) { return; } //Don't do anything if not left click

		const rendererBB = this.#renderer.domElement.getBoundingClientRect();
		const x          = (e.clientX - rendererBB.left) / this.#zoom.value;
		const y          = (rendererBB.height - e.clientY + rendererBB.top) / this.#zoom.value;
		const dim        = this.getScaledDimensions();
		const inRenderer = (x >= 0 && x < dim.w && y >= 0 && y < dim.h);
		const radius     = this.#defaultClick.z / this.#zoom.value;

		if(this.empty === true && inRenderer) { 
			this.#hintDiv.style.visibility = "hidden";
			this.#empty.value = false; 
		}

		this.#environment.click.value = inRenderer 
			? new THREE.Vector3(x, y, radius) 
			: new THREE.Vector3(this.#defaultClick.x, this.#defaultClick.y, radius);
	}

	//Ensure that the renderer takes as much space as possible inside the window without having to scroll
	fillWindow() {
		this.#renderer.setSize(this.#plotPanel.offsetWidth, this.#plotPanel.offsetHeight);
	}

	//Create or force the render targets to be resized
	updateRenderTargets() {
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

	//Render one step (or more, based on speed) of the Gray-Scott model
	step(loopCall = true) {
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
		
		if (loopCall === true) { requestAnimationFrame(() => this.step()); }
	}

	//Render the next model state on the given target
	//and set it as the current state 
	renderAndSwap(renderTarget) {
		this.#renderer.setRenderTarget(renderTarget);
		this.#renderer.render(this.#scene, this.#camera);
		this.#renderer.setRenderTarget(null);
		this.#environment.current.value = renderTarget.texture;
	}

	//Get the renderer dimensions scaled with the zoom factor
	getScaledDimensions() {
		return {
			w: this.#renderer.domElement.clientWidth  / this.#zoom.value, 
			h: this.#renderer.domElement.clientHeight / this.#zoom.value
		};
	}

	//Empty the renderer area
	clear() {
		if (this.empty === false) {
			this.#renderer.setRenderTarget(this.#rTarget1);
			this.#renderer.clear();
			this.#renderer.setRenderTarget(this.#rTarget2);
			this.#renderer.clear();
			this.#renderer.setRenderTarget(null);
			this.#empty.value = true;
			this.#hintDiv.style.visibility = "visible";
		}
	}

	//Clear coordinates of the click sent to the shader
	clearClick() {
		this.#environment.click.value = new THREE.Vector3(
			this.#defaultClick.x, this.#defaultClick.y, this.#defaultClick.z / this.zoom.value
		);
	}
}
// --------------------------------------------------------------------------------------

// ------------------------------ Variables Initialization ------------------------------
const engine = new Engine("plot-panel", "clickme-hint");

//Slider objects linked to engine variables
const varSliders = {
	f:     new VarSlider("f-slider",     "f-range-label",     engine.f,     0.0, 0.1, 1, 3),
	k:     new VarSlider("k-slider",     "k-range-label",     engine.k,     0.0, 0.1, 1, 3),
	da:    new VarSlider("da-slider",    "da-range-label",    engine.da,    0.1, 1.0, 1, 3),
	db:    new VarSlider("db-slider",    "db-range-label",    engine.db,    0.1, 1.0, 1, 3),
	speed: new VarSlider("speed-slider", "speed-range-label", engine.speed, 1.0, 5.0, 1, 0, true),
	zoom:  new VarSlider("zoom-slider",  "zoom-range-label",  engine.zoom,  2.0, 5.0, 1, 0, true, () => engine.updateRenderTargets())
};
// --------------------------------------------------------------------------------------

// ------------------------------- Listeners Registration -------------------------------
window.addEventListener("load", function(){
	let p = Utils.getURLParameters();

	varSliders.f.modifyTargetValue(p.f);
	varSliders.k.modifyTargetValue(p.k);
	varSliders.da.modifyTargetValue(p.da);
	varSliders.db.modifyTargetValue(p.db);
	varSliders.speed.modifyTargetValue(p.speed);
	varSliders.zoom.modifyTargetValue(p.zoom);

	engine.step();
});

window.addEventListener("mousemove", function(e){
	engine.click(e);
});

window.addEventListener("mouseup", function(e){
	if (e.which !== 1) { return; } //Don't do anything if not left click
	engine.clearClick();
});

window.addEventListener("resize", function(){
	engine.fillWindow();
	engine.updateRenderTargets();
});

document.getElementById("clear").addEventListener("click", function(){
    engine.clear();
});
// --------------------------------------------------------------------------------------