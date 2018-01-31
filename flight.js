/**
* flight.js
* 
* This file includes startup function 
* and all the basic functions such as buffers and shaders 
* required to draw on the canvas
*/

var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

var UDAngle=0.0, eyeQuatUD = quat.create(), LRAngle = 0.0, eyeQuatLR=quat.create();


// Create a place to store terrain geometry
var tVertexPositionBuffer;
//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;

//Create a place to store the traingle edges
var tIndexEdgeBuffer;

// View parameters
var eyePt = vec3.fromValues(-2.0,0.0,0.0);
var viewDir = vec3.fromValues(0.0,0.0,-0.5);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);
var RotXaxis = vec3.fromValues(1.0,0.0,0.0);
var RotZaxis = vec3.fromValues(0.0,0.0,1.0);

// move plane forward
var moveforward = vec3.create();
var speed = 5;

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

/**
 * set up terrain buffers and generate terrain
 * @param {none}
 * @return {none}
 */
function setupTerrainBuffers() {
    
    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    
    // I divided my terrain into 2^7 grids per axis, 
    // which works best with diamond-square algorithm
    var gridN=128;
    
    var numT = terrainFromIteration(gridN, -1,1,-1,1, vTerrain,fTerrain,nTerrain);
    console.log("Generated ", numT, " triangles"); 
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = numT*3;
    
    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = numT*3;
    
    // Specify faces of the terrain 
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;
    
    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;
    
     
}


/**
 * draws the terrain
 * @param {none}
 * @return {none}
 */
function drawTerrain(){
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   

 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);

}

/**
 * send mvMatrix to the shader
 * @param {none}
 * @return {none}
 */
 function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * send pMatrix to shader
 * @param {none}
 * @return {none}
 */
 function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

/**
 * send nMatrix to shader
 * @param {none}
 * @return {none}
 */
 function uploadNormalMatrixToShader() {
  //this line sets the nMatrix to the mvMatrix
  mat3.fromMat4(nMatrix,mvMatrix);
    
  //the normal matrix is the inverse transpose of the mvMatrix.
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
    
  //this line send the nMatrix to the shader
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
 * push a mvMatrix onto the stack to save transformations
 * @param {none}
 * @return {none}
 */
 function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

/**
 * pop a mvMatrix off the stack to erase transformations
 * @param {none}
 * @return {none}
 */
 function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/** 
 * send all matrix to the shader
 * @param {none}
 * @return {none}
 */
 function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

/**
 * converts deg to rad
 * @param {number} degrees Angle value in degrees
 * @return {number} Angle value in radians
 */
 function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

/**
 * creates the web gl canvas
 * @param {canvas} canvas WebGL canvas to create context on
 * @return {context} created WebGL context 
 */
 function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * loads the shaders
 * @param {id} id Shader id to load 
 * @return {shader} the shader to work with
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

/**
 * hooks stuff up to the shaders
 * @param {none}
 * @return {none}
 */
function setupShaders() {
    if (document.getElementById("on").checked){
        fragmentShader = loadShaderFromDOM("shader-fs_fog");
    }
    else if (document.getElementById("off").checked){
       fragmentShader = loadShaderFromDOM("shader-fs");   
    }
  vertexShader = loadShaderFromDOM("shader-vs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}

/**
 * send ligts to the shader
 * @param {vec3} loc light position
 * @param {vec4} a ambient light color
 * @param {vec4} d diffuse light color
 * @param {vec4} s specular light color
 * @return {none}
 */
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

/**
 * sets up the buffers for the objects
 * @param {none}
 * @return {none}
 */
 function setupBuffers() {
    setupTerrainBuffers();
}

/**
 * renders the objects with the specified transformations
 * @param {none}
 * @return {none}
 */
 function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    
    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(30), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
    
    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);

    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,-2.0,-0.25,-5.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(-30));     
    setMatrixUniforms();
    
    if (document.getElementById("on").checked)
    {
        uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[1.0,1.0,0.0],[0.0,0.0,0.0]);
        drawTerrain();
    }
    if (document.getElementById("off").checked)
    {
        uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[1.0,1.0,1.0],[0.0,0.0,0.0]);
        drawTerrain();
    }
    
    //sends the lights to the shader, the second prameter is ambient and will set the color of the terrian
    mvPopMatrix();   
}

/**
 * animates the webpage
 * @param {none}
 * @return {none}
 */
 function animate() {
    vec3.scale(moveforward,viewDir,speed/1000);
    vec3.add(eyePt,eyePt,moveforward);
}

/**
 * starts everthing off
 * @param {none}
 * @return {none}
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupBuffers();
    // make background color skyblue
  gl.clearColor(110/256, 167/256, 252/256, 1.0);
  gl.enable(gl.DEPTH_TEST);
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  tick();
}

/** 
 * animates stuff every tick
 * @param {none}
 * @return {none}
 */
 function tick() {
    requestAnimFrame(tick);
    // we wanna setup shaders every tick so we can implement the fog during simulation
    setupShaders();
    // handle user interaction
    handleKeys();
    draw();
    animate();
}

// array that saves pressed keys. This way, we can accept several keys at the same time
var currentlyPressedKeys = {};

/**
 * Code to handle key pressing
 * @param {none}
 * @return {none}
 */
function handleKeyDown(event) {
        currentlyPressedKeys[event.keyCode] = true;
}

/**
 * Code to handle key non-pressing
 * @param {none}
 * @return {none}
 */
function handleKeyUp(event) {
        currentlyPressedKeys[event.keyCode] = false;
}

/**
 * Code to handle user interaction
 * @param {none}
 * @return {none}
 */
function handleKeys() {
        if (currentlyPressedKeys[37] || currentlyPressedKeys[65]) {
            // Left cursor key or A
            
            //create the quat
            quat.setAxisAngle(eyeQuatLR, RotZaxis, degToRad(1.25));
            // change the Xaxis so our view also changes accordingly
            vec3.transformQuat(RotXaxis,RotXaxis,eyeQuatLR);
            //apply the quat
            vec3.transformQuat(up,up,eyeQuatLR);
        } else if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
            // Right cursor key or D
            quat.setAxisAngle(eyeQuatLR, RotZaxis, degToRad(-1.25));
            vec3.transformQuat(RotXaxis,RotXaxis,eyeQuatLR);
            vec3.transformQuat(up,up,eyeQuatLR);
        } 

        if (currentlyPressedKeys[38] || currentlyPressedKeys[87]) {
            // Up cursor key or W
            quat.setAxisAngle(eyeQuatUD, RotXaxis, degToRad(0.25));
            vec3.transformQuat(viewDir,viewDir,eyeQuatUD);

        } else if (currentlyPressedKeys[40] || currentlyPressedKeys[83]) {
            // Down cursor key
            quat.setAxisAngle(eyeQuatUD, RotXaxis, degToRad(-0.25));
            vec3.transformQuat(viewDir,viewDir,eyeQuatUD);
        } 
    
        if (currentlyPressedKeys[187]) {
            // + key
            speed += 1;
        } else if (currentlyPressedKeys[189]) {
            // - key
            
            // minimum speed. The plane shouldn't stop or go backwards
            if (speed > 3)
                speed -= 1;
            else 
                speed = 3;

        } 

}
