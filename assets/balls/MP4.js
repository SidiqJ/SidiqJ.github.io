let gl, canvas, shaderProgram, vertexPositionBuffer, days = 0,
  // Create a place to store sphere geometry & Normals for shading
  sphereVertexPositionBuffer, sphereVertexNormalBuffer,
  // View parameters
  eyePt = vec3.fromValues(0.0, 0.0, 150.0), viewDir = vec3.fromValues(0.0, 0.0, -1.0),
  up = vec3.fromValues(0.0, 1.0, 0.0), viewPt = vec3.fromValues(0.0, 0.0, 0.0),

  nMatrix = mat3.create(), mvMatrix = mat4.create(), pMatrix = mat4.create(), mvMatrixStack = [], BallStack = []
//-----------------------------------------------------------------
//Color conversion  helper functions
function hexToR(h) { return parseInt((cutHex(h)).substring(0, 2), 16) }
function hexToG(h) { return parseInt((cutHex(h)).substring(2, 4), 16) }
function hexToB(h) { return parseInt((cutHex(h)).substring(4, 6), 16) }
function cutHex(h) { return (h.charAt(0) == "#") ? h.substring(1, 7) : h }

//-------------------------------------------------------------------------
/** Populates buffers with data for spheres */
function setupBuffers() {
  let sphereSoup = [], sphereNormals = [];
  var numT = sphereFromSubdivision(6, sphereSoup, sphereNormals);
  console.log("Generated ", numT, " triangles");
  sphereVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
  sphereVertexPositionBuffer.itemSize = 3;
  sphereVertexPositionBuffer.numItems = numT * 3;
  console.log(sphereSoup.length / 9);
  // Specify normals to be able to do lighting calculations
  sphereVertexNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals), gl.STATIC_DRAW);
  sphereVertexNormalBuffer.itemSize = 3;
  sphereVertexNormalBuffer.numItems = numT * 3;
  console.log("Normals ", sphereNormals.length / 3);
}

/** Draws a sphere from the sphere buffer */
function drawSphere() {
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize,
    gl.FLOAT, false, 0, 0);
  // Bind normal buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, sphereVertexNormalBuffer.itemSize,
    gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);
}

/** Pushes matrix onto modelview matrix stack */
function mvPushMatrix() {
  let copy = mat4.clone(mvMatrix);
  mvMatrixStack.push(copy);
}

/** Pops matrix off of modelview matrix stack */
function mvPopMatrix() {
  if (mvMatrixStack.length == 0) {
    throw "Invalid popMatrix!";
  }
  mvMatrix = mvMatrixStack.pop();
}

/** Sends projection/modelview matrices to shader */
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  mat3.fromMat4(nMatrix, mvMatrix);
  mat3.transpose(nMatrix, nMatrix);
  mat3.invert(nMatrix, nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

/**Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input */
function degToRad(degrees) { return degrees * Math.PI / 180 }

//----------------------------------------------------------------------------------
/**Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i = 0; i < names.length; i++) {
    try { context = canvas.getContext(names[i]) }
    catch (e) { }
    if (context) { break }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else { alert("Failed to create WebGL context!") }
  return context;
}

/**Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) { return null }
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

/** Setup the fragment and vertex shaders */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-gouraud-phong-vs");
  fragmentShader = loadShaderFromDOM("shader-gouraud-phong-fs");

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
  shaderProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
  shaderProgram.uniformAmbientMaterialColor = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
  shaderProgram.uniformSpecularMaterialColor = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");

  shaderProgram.uniformShininess = gl.getUniformLocation(shaderProgram, "uShininess");
}

/**Sends material information to the shader
 * @param {Float32Array} a diffuse material color
 * @param {Float32Array} a ambient material color
 * @param {Float32Array} a specular material color 
 * @param {Float32} the shininess exponent for Phong illumination */
function uploadMaterialToShader(dcolor, acolor, scolor, shiny) {
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColor, dcolor);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColor, acolor);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColor, scolor);
  gl.uniform1f(shaderProgram.uniformShininess, shiny);
}

/**Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength */
function uploadLightsToShader(loc, a, d, s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

/** Draw call that applies matrix transformations to model and draws model in frame */
function draw() {
  let transformVec = vec3.create();
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // We'll use perspective 
  mat4.perspective(pMatrix, degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

  // We want to look down -z, so create a lookat point in that direction    
  vec3.add(viewPt, eyePt, viewDir);
  // Then generate the lookat matrix and initialize the MV matrix to that view
  mat4.lookAt(mvMatrix, eyePt, viewPt, up);

  BallStack.forEach(instance => {
    mvPushMatrix();
    vec3.set(transformVec, instance.xPosition, instance.yPosition, instance.zPosition);
    mat4.translate(mvMatrix, mvMatrix, transformVec)
    mat4.scale(mvMatrix, mvMatrix, [instance.Size, instance.Size, instance.Size]);

    //Get material color
    R = instance.color[0];
    G = instance.color[1];
    B = instance.color[2];

    //Get shiny
    // shiny = document.getElementById("shininess").value
    shiny = 50


    uploadLightsToShader([20, 20, 20], [0.0, 0.0, 0.0], [1.0, 1.0, 1.0], [1.0, 1.0, 1.0]);
    uploadMaterialToShader([R, G, B], [R, G, B], [1.0, 1.0, 1.0], shiny);
    setMatrixUniforms();
    drawSphere();
    mvPopMatrix();
  });
}

/** Startup function called from html code to start program. */
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas)
  setupShaders()
  setupBuffers();
  gl.clearColor(0 / 255, 0 / 255, 36 / 255, 1);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

/** Tick called for every animation frame. */
function tick() {
  if (Reset) {
    Reset = false
    BallStack = []
    startup()
    return
  }
  requestAnimFrame(tick);
  draw();
  movement()
}

//----------------------------------------------------------------------------------
let Reset = false, Time
/**Event listner for mouse button press to create new spheres
 * @param {*} event 
 */
function WhichButton(event) {
  if (event.button == 0) {
      BallStack.push(new Ball())
      console.log("NEW BALL CREATED")
  }
}
/** Updates postion and velocityof each ball */
function movement() {
  Time = 0.012
  BallStack.forEach(ball => {

    ball.xPosition += ball.xSpeed*Time
    ball.yPosition += ball.ySpeed*Time
    ball.zPosition += ball.zSpeed*Time


    ball.xSpeed*= Math.pow(.6,Time)
    ball.ySpeed*= Math.pow(.6,Time)
    ball.zSpeed*= Math.pow(.6,Time)
    ball.ySpeed+= -25*Time


    if (ball.xPosition <-69 || ball.xPosition >69) { ball.xSpeed *= -1 }

    if (ball.yPosition <-40 || ball.yPosition >50) { ball.ySpeed *= -1;}

    if (ball.zPosition <-50 || ball.zPosition >50) { ball.zSpeed *= -1 }
  });
}
/**
 * Returns a random number between a given min & max number
 * @param {Number} min Minimum number for range
 * @param {Number} max Maximum number for range
 */
function randomNumberGenerator(min, max) {
  return Math.random() * (max - min) + min
}
class Ball {
  constructor() {
    this.xPosition = randomNumberGenerator(-69, 69)
    this.yPosition = randomNumberGenerator(-36, 36)
    this.zPosition = randomNumberGenerator(-36, 36)

    this.xSpeed = randomNumberGenerator(-250, 250)
    this.ySpeed = randomNumberGenerator(-250, 250)
    this.zSpeed = randomNumberGenerator(-250, 250)
    this.Size = randomNumberGenerator(2, 10)
    this.color = [Math.random(), Math.random(), Math.random()]
  }
}