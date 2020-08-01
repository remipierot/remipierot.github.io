import { DOMUtils } from './dependencies/dom-utils.js';

const splineGenURL = 'SplineGen/spline-gen.html';

const splineGenExamples = {
    '00' : { a: 2, b: 8, c: 8, d: 6, j: 3, k: 3,
             precision: 500, curveThickness: 10, curveColor: 'FDF289',
             outlineThickness: 10, outlineColor: '46EDC8',
             backgroundTransparency: false, backgroundColor: '374D7C'},
    '01' : { a: 3, b: 8, c: 3, d: 8, j: 1, k: 1,
             precision: 500, curveThickness: 20, curveColor: '000000',
             outlineThickness: 20, outlineColor: 'FFFFFF',
             backgroundTransparency: false, backgroundColor: '000000'},
    '02' : { a: 6, b: 9, c: 6, d: 3, j: 3, k: 3,
             precision: 500, curveThickness: 10, curveColor: '51E746',
             outlineThickness: 10, outlineColor: '417D21',
             backgroundTransparency: false, backgroundColor: '574276'},
    '03' : { a: 7, b: 5, c: 7, d: 5, j: 1, k: 1,
             precision: 500, curveThickness: 10, curveColor: 'C20F0F',
             outlineThickness: 10, outlineColor: 'DB7A1F',
             backgroundTransparency: true},
    '04' : { a: 9, b: 0, c: 1, d: 10, j: 3, k: 1,
             precision: 500, curveThickness: 10, curveColor: 'A2B2DF',
             outlineThickness: 10, outlineColor: 'A2DA5A',
             backgroundTransparency: false, backgroundColor: 'A877C8'},
    '05' : { a: 9, b: 5, c: 9, d: 3, j: 3, k: 3,
             precision: 500, curveThickness: 10, curveColor: 'FFFFFF',
             outlineThickness: 20, outlineColor: '000000',
             backgroundTransparency: true},
    '06' : { a: 1, b: 5, c: 1, d: 4, j: 2, k: 3,
             precision: 500, curveThickness: 10, curveColor: '5C3613',
             outlineThickness: 5, outlineColor: 'E92929',
             backgroundTransparency: false, backgroundColor: 'F4DC26'},
    '07' : { a: 8, b: 5, c: 4, d: 9, j: 1, k: 1,
             precision: 500, curveThickness: 10, curveColor: '00FFBF',
             outlineThickness: 20, outlineColor: '008393',
             backgroundTransparency: false, backgroundColor: 'F5D9E2'}
}

window.addEventListener("load", function(){
    for(const [k, v] of Object.entries(splineGenExamples)) {
        document.getElementById(k).addEventListener("click", function(){
            DOMUtils.redirect(splineGenURL, v);
        });
    }
});