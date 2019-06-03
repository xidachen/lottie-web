function determinePaintWorkletScriptPath(currentScript) {
    function resolveRelative(path, relative) {
        var abspath = path.substring(0, path.lastIndexOf('/')).split('/');
        while (relative.startsWith('../')) {
            abspath.pop();
            relative = relative.substring(3);
        }
        return abspath.join('/') + '/' + relative;
    }
    if (currentScript.endsWith('/PaintWorkletRenderer.js'))
        return resolveRelative(currentScript, '../../../build/player/lottie_paintworklet.js');
    var m = currentScript.match(/(^.*lottie)(_[^.])?(\.min)?\.js$/);
    if (!m)
        return '';
    return m[1] + '_paintworklet.js';
}
var LOTTIE_SCRIPT_SRC = determinePaintWorkletScriptPath(document.currentScript.src);
var PAINT_WORKLET_RENDERER_NUM = 1;
var registerProperty = CSS && CSS.registerProperty;
if (registerProperty)
    registerProperty({name: '--progress', 'syntax': '<number>', inherits: false, initialValue: 0});

function PaintWorkletRenderer(animationItem, config){
    this.animationItem = animationItem;
    this.renderConfig = {
        clearCanvas: (config && config.clearCanvas !== undefined) ? config.clearCanvas : true,
        progressiveLoad: (config && config.progressiveLoad) || false,
        preserveAspectRatio: (config && config.preserveAspectRatio) || 'xMidYMid meet',
        imagePreserveAspectRatio: (config && config.imagePreserveAspectRatio) || 'xMidYMid slice',
        className: (config && config.className) || ''
    };
    this.renderConfig.dpr = (config && config.dpr) || 1;
    if (this.animationItem.wrapper) {
        this.renderConfig.dpr = (config && config.dpr) || window.devicePixelRatio || 1;
    }
    this.globalData = {
        frameNum: -1,
        _mdf: false,
        renderConfig: this.renderConfig,
    };
    this.completeLayers = false;
    this.rendererType = 'canvas';
}
extendPrototype([BaseRenderer],PaintWorkletRenderer);

PaintWorkletRenderer.prototype.cssKeyframes = function() {
    return registerProperty ?
        [{'--progress': 0}, {'--progress': 1}] :
        [{'objectPosition': '0%'}, {'objectPosition': '1%'}];
}

PaintWorkletRenderer.prototype.createShape = function (data) {
    return new CVShapeElement(data, this.globalData, this);
};

PaintWorkletRenderer.prototype.createText = function (data) {
    return new CVTextElement(data, this.globalData, this);
};

PaintWorkletRenderer.prototype.createImage = function (data) {
    return new CVImageElement(data, this.globalData, this);
};

PaintWorkletRenderer.prototype.createComp = function (data) {
    return new CVCompElement(data, this.globalData, this);
};

PaintWorkletRenderer.prototype.createSolid = function (data) {
    return new CVSolidElement(data, this.globalData, this);
};

PaintWorkletRenderer.prototype.createNull = SVGRenderer.prototype.createNull;

PaintWorkletRenderer.prototype.configAnimation = function(animData){
    if(!this.animationItem.wrapper){
        throw new Exception('Wrapper element required for paintworklet renderer.')
    }
    if(this.renderConfig.className) {
        this.animationItem.wrapper.setAttribute('class', this.renderConfig.className);
    }
    this.data = animData;
    this.layers = animData.layers;
    this.setupGlobalData(animData, document.body);
    // TODO: Create paintworklet.
    var painterName = 'lottie-pw-' + PAINT_WORKLET_RENDERER_NUM++;
    var animationProperty = registerProperty ? '--progress' : 'object-position';
    var painterScript =
        "import { lottiejs } from '" + LOTTIE_SCRIPT_SRC + "';\n" +
        "var animData = " + JSON.stringify(animData) + ";\n" +
        "registerPaint('" + painterName + "', class {\n" +
        "   static get inputProperties() { return ['" + animationProperty + "']; }\n" +
        "   constructor() {\n" +
        "       this.animation = null;\n" +
        "   }\n" +
        "   paint(ctx, size, styleMap) {\n" +
        "       ctx.canvas = {width: size.width * devicePixelRatio, height: size.height * devicePixelRatio};\n" +
        "       ctx.save();\n" +
        "       ctx.scale(devicePixelRatio, devicePixelRatio);\n" +
        "       if (!this.animation)\n" +
        "           this.animation = lottiejs.loadAnimation({animationData: animData, renderer: 'canvas', rendererSettings: {context: ctx}});\n" +
        "       let progress = parseFloat(styleMap.get('" + animationProperty + "').toString());\n" +
        "       this.animation.renderer.updateContext(ctx);\n" +
        "       this.animation.setCurrentRawFrameValue(progress * this.animation.totalFrames);\n" +
        "       ctx.restore();\n" +
        "   }\n" +
        "});";
    var blob = new Blob([painterScript], {type: 'text/javascript'});
    var element = this.animationItem.wrapper;
    var url = URL.createObjectURL(blob);
    CSS.paintWorklet.addModule(url).then(function() {
        element.style.background = 'paint(' + painterName + ')';
    }).catch(function(err) {
        console.error('Error loading paintworklet', err);
    }).finally(function() {
        URL.revokeObjectURL(url);
    });
};

PaintWorkletRenderer.prototype.updateContainerSize = function () {};

PaintWorkletRenderer.prototype.destroy = function () {
    this.destroyed = true;
};

PaintWorkletRenderer.prototype.renderFrame = function(num, forceRender){
    if (registerProperty)
        this.animationItem.wrapper.style.setProperty('--progress', num / this.animationItem.totalFrames);
    else
        this.animationItem.wrapper.style.setProperty('object-position', (num / this.animationItem.totalFrames) + '%');
};

PaintWorkletRenderer.prototype.buildItem = function(pos){
};

PaintWorkletRenderer.prototype.createItem = function(pos){
};

PaintWorkletRenderer.prototype.checkPendingElements  = function(){
};

PaintWorkletRenderer.prototype.hide = function(){
};

PaintWorkletRenderer.prototype.show = function(){
};
