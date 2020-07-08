import { 
	fillWindowWith
} from './utils.js';

var app = document.getElementById("app");

window.addEventListener("load", function(){
	fillWindowWith(app);
});

window.addEventListener("resize", function(){
	fillWindowWith(app);
});