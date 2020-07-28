/** @GlobalVariables */
let gl, canvas, shaderProgram, mvMatrix = mat4.create(), vMatrix = mat4.create(), pMatrix = mat4.create(),
  nMatrix = mat3.create(), mvMatrixStack = [], myMesh, currentlyPressedKeys = {}

/** @GlobalViewParameters */
let eyePt = vec3.fromValues(0.0, 0.0, .35), viewDir = vec3.fromValues(0.0, 0.03, -1),
  up = vec3.fromValues(0.0, 1.0, 0.0), viewPt = vec3.fromValues(0.0, 0.0, 0.0)

/**@GlobalLightParameters */
let lightPosition = [0, 5, 5], lAmbient = [0, 0, 0], lDiffuse = [1, 1, 1], lSpecular = [0, 0, 0]

/** @GlobalMaterialParameters */
let kAmbient = [1.0, 1.0, 1.0], kTerrainDiffuse = [205.0 / 255.0, 163.0 / 255.0, 63.0 / 255.0],
  kSpecular = [0.0, 0.0, 0.0], shininess = 23, kEdgeBlack = [0.0, 0.0, 0.0], kEdgeWhite = [1.0, 1.0, 1.0]

//Model parameters
let eulerY = 0, TeaeulerY = 0, rot = mat4.create(), Toggle

//-------------------------------------------------------------------------
/** Asynchronously read a server-side text file */
function asyncGetFile (url) {
  console.log("getting text file")
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    newUrl = location.origin+'/assets/teapot/'+url
    xhr.open("Get", newUrl)
    xhr.onload = () => resolve(xhr.responseText)
    xhr.onerror = () => reject(xhr.statusText)
    xhr.send()
    console.log("Made promise")
  })
}

/** Pushes matrix onto modelview matrix stack */
function mvPushMatrix () {
  var copy = mat4.clone(mvMatrix)
  mvMatrixStack.push(copy)
}

/** Pops matrix off of modelview matrix stack */
function mvPopMatrix () {
  if (mvMatrixStack.length == 0) {throw "Invalid popMatrix!"}
  mvMatrix = mvMatrixStack.pop()
}

/** Sends projection/modelview matrices to shader */
function setMatrixUniforms () {
  gl.useProgram(shaderProgram)
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix)
  mat3.fromMat4(nMatrix, mvMatrix)
  mat3.transpose(nMatrix, nMatrix)
  mat3.invert(nMatrix, nMatrix)
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix)
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix)
  gl.uniform1f(shaderProgram.ReflectToggle, Toggle)
  gl.uniformMatrix4fv(shaderProgram.normals, false, rot)
}
//----------------------------------------------------------------------------------
/** Translates degrees to radians
 *  @param {Number} degrees Degree input to function
 *  @return {Number} The radians that correspond to the degree input
 */
function degToRad (degrees) {return degrees * Math.PI / 180}

//----------------------------------------------------------------------------------
let increment = 0.003
function handleKeyDown (event) {
  currentlyPressedKeys[event.key] = true
  if (currentlyPressedKeys["a"]) {
    eulerY += 1
    TeaeulerY += 1
    eulernum += 1
    mat4.rotateY(rot, rot, degToRad(-eulerY))
  }
  else if (currentlyPressedKeys["d"]) {
    eulerY -= 1
    TeaeulerY -= 1
    eulernum -= 1
    mat4.rotateY(rot, rot, degToRad(-eulerY))
  }

  if (currentlyPressedKeys["ArrowLeft"]) {
    event.preventDefault()
    TeaeulerY -= 1
  }
  else if (currentlyPressedKeys["ArrowRight"]) {
    event.preventDefault()
    TeaeulerY += 1
  }
}

function handleKeyUp (event) {currentlyPressedKeys[event.key] = false}

/** Creates a context for WebGL
 *  @param {element} canvas WebGL canvas
 *  @return {Object} WebGL context
 */
function createGLContext (canvas) {
  var names = ["webgl", "experimental-webgl"]
  var context = null
  for (var i = 0; i < names.length; i++) {
    try {context = canvas.getContext(names[i])}
    catch (e) {}
    if (context) {break}
  }
  if (context) {
    context.viewportWidth = canvas.width
    context.viewportHeight = canvas.height
  }
  else {alert("Failed to create WebGL context!")}
  return context
}

/** Loads Shaders
 *  @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM (id) {
  var shaderScript = document.getElementById(id)
  if (!shaderScript) {return null}
  var shaderSource = ""
  var currentChild = shaderScript.firstChild
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent
    }
    currentChild = currentChild.nextSibling
  }
  var shader
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER)
  }
  else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER)
  }
  else {return null}
  gl.shaderSource(shader, shaderSource)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader))
    return null
  }
  return shader
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupTeapotShaders () {
  vertexShader = loadShaderFromDOM("shader-vs")
  fragmentShader = loadShaderFromDOM("shader-fs")

  shaderProgram = gl.createProgram()
  gl.attachShader(shaderProgram, vertexShader)
  gl.attachShader(shaderProgram, fragmentShader)
  gl.linkProgram(shaderProgram)

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders")
  }
  gl.useProgram(shaderProgram)
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition")
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute)
  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal")
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute)
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix")
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix")
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix")
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition")
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor")
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor")
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor")
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess")
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient")
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse")
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular")

  shaderProgram.ReflectToggle = gl.getUniformLocation(shaderProgram, "Toggle")
  shaderProgram.normals = gl.getUniformLocation(shaderProgram, "newNormals")
}

/** Sends material information to the shader
 *  @param {Float32} alpha shininess coefficient
 *  @param {Float32Array} a Ambient material color
 *  @param {Float32Array} d Diffuse material color
 *  @param {Float32Array} s Specular material color
 */
function setMaterialUniforms (alpha, a, d, s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha)
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a)
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d)
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s)
}

/** Sends light information to the shader
 *  @param {Float32Array} loc Location of light source
 *  @param {Float32Array} a Ambient light strength
 *  @param {Float32Array} d Diffuse light strength
 *  @param {Float32Array} s Specular light strength
 */
function setLightUniforms (loc, a, d, s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc)
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a)
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d)
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s)
}

/** Populate buffers with data */
function setupMesh (filename) {
  myMesh = new TriMesh()
  myPromise = asyncGetFile(filename)
  myPromise.then((retrievedText) => {
    myMesh.loadFromOBJ(retrievedText)
    console.log("Yay! got the file")
  })
    .catch((reason) => {
      console.log("Handle rejected promise ('+reason+') here.")
    })
}

/** Draw call that applies matrix transformations to model and draws model in frame */
function drawTeapot () {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  mat4.perspective(pMatrix, degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 500.0)

  // We want to look down -z, so create a lookat point in that direction    
  vec3.add(viewPt, eyePt, viewDir)

  // Then generate the lookat matrix and initialize the view matrix to that view
  mat4.lookAt(vMatrix, eyePt, viewPt, up)

  //Draw Mesh
  //ADD an if statement to prevent early drawing of myMesh
  if (myMesh.loaded()) {
    mvPushMatrix()
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(TeaeulerY))
    mat4.multiply(mvMatrix, vMatrix, mvMatrix)
    setMatrixUniforms()
    setLightUniforms(lightPosition, lAmbient, lDiffuse, lSpecular)

    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked)) {
      setMaterialUniforms(shininess, kAmbient, kTerrainDiffuse, kSpecular)
      myMesh.drawTriangles()
    }

    // if (document.getElementById("wirepoly").checked) {
    //   setMaterialUniforms(shininess, kAmbient, kEdgeBlack, kSpecular)
    //   myMesh.drawEdges()
    // }

    if (document.getElementById("wireframe").checked) {
      console.log("LOL");
      
      setMaterialUniforms(shininess, kAmbient, kEdgeWhite, kSpecular)
      myMesh.drawEdges()
    }
    mvPopMatrix()
  }
}

//----------------------------------------------------------------------------------
/** Startup function called from html code to start program. */
function startup () {
  canvas = document.getElementById("myGLCanvas")
  gl = createGLContext(canvas)
  setupSkyboxShaders()
  setupSkyboxBuffers()
  setupTeapotShaders()
  setupMesh("teapot.obj")
  gl.clearColor(0.0, 0.0, 0.0, 1.0)
  mat4.scale(mvMatrix, mvMatrix, [.02, .02, .02])
  gl.enable(gl.DEPTH_TEST)
  document.onkeydown = handleKeyDown
  document.onkeyup = handleKeyUp
  tick()
}

/** Update any model transformations */
function animate () {
  // document.getElementById("eY").value = eulernum
  // document.getElementById("TeaeY").value = TeaeulerY
  if (document.getElementById("reflect").checked) {
    Toggle = 1.0
  }
  // else if (document.getElementById("refraction").checked) {
  //   Toggle = 0.0
  // }
  else {
    Toggle = 0.5
  }
}
/** Keeping drawing frames */
function tick () {
  requestAnimFrame(tick)
  animate()
  drawTeapot()
  drawSkybox()
}

//****************** ***************************************NEW CODE ******************************************************/
let SkyboxProgram, vertexBuffer, borderTexture, cubeP = mat4.create(),
  Modelviewmatrix = mat4.create(), eulernum = 0

// Setup the fragment and vertex shaders
function setupSkyboxShaders () {
  let cubeVertexShader = loadShaderFromDOM("cubeShader-vs")
  let cubeFragmentShader = loadShaderFromDOM("cubeShader-fs")

  SkyboxProgram = gl.createProgram()
  gl.attachShader(SkyboxProgram, cubeVertexShader)
  gl.attachShader(SkyboxProgram, cubeFragmentShader)
  gl.linkProgram(SkyboxProgram)
  if (!gl.getProgramParameter(SkyboxProgram, gl.LINK_STATUS)) {
    alert("ERROR LINKING CUBE PROGRAM", gl.getProgramInfoLog(SkyboxProgram))
    return
  }
  gl.useProgram(SkyboxProgram)
  SkyboxProgram.VertexLocation = gl.getAttribLocation(SkyboxProgram, 'vertPosition')
  gl.enableVertexAttribArray(SkyboxProgram.VertexLocation)
  SkyboxProgram.cubeProjection = gl.getUniformLocation(SkyboxProgram, "uProjectionM")
  SkyboxProgram.ModelVIew = gl.getUniformLocation(SkyboxProgram, "uMVM")
  SkyboxProgram.skybox = gl.getUniformLocation(SkyboxProgram, "skybox")
}

// Populate buffers with data
function setupSkyboxBuffers () {
  //Generate the vertex positions    
  loadVertices()

  //Generate the vertex Textures
  loadTextures()
}
/**
 * Populate vertex buffer with data
 */
function loadVertices () {
  VertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, VertexBuffer)
  let vertexPoints = [
    -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5,
    -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,

    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5,

    -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
    -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,

    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5,
    -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5,

    -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5,
    -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,

    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5,
    0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5]
  VertexBuffer.itemSize = 3
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPoints), gl.STATIC_DRAW)
  VertexBuffer.numberOfItems = vertexPoints.length / VertexBuffer.itemSize
}
/**
 * Populate Texture buffer with 
 */
function loadTextures () {
  borderTexture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, borderTexture)

  let borderInfo = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      location: location.origin+'/assets/teapot/'+'posx.png'
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      location: location.origin+'/assets/teapot/'+'negx.png'
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      location: location.origin+'/assets/teapot/'+'posy.png'
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      location: location.origin+'/assets/teapot/'+'negy.png'
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      location: location.origin+'/assets/teapot/'+'posz.png'
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      location: location.origin+'/assets/teapot/'+'negz.png'
    }
  ]
  borderInfo.forEach((face) => {
    let {target, location} = face
    gl.texImage2D(target, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    let image = new Image()
    image.src = location
    image.addEventListener('load', function () {
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, borderTexture)
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP)
    })
  })
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
}

/**
 * Sends projection/modelview matrices to shader
 */
function setCubeMatrixUniforms () {
  gl.useProgram(SkyboxProgram)
  gl.uniformMatrix4fv(SkyboxProgram.cubeProjection, false, cubeP)
  gl.uniformMatrix4fv(SkyboxProgram.ModelVIew, false, Modelviewmatrix)
  gl.uniform1i(SkyboxProgram.skybox, 0)
}
/**
 * Draw call that applies matrix transformations to skybox and draws model in frame
 */
function drawSkybox () {
  mat4.perspective(cubeP, degToRad(95), gl.viewportWidth / gl.viewportHeight, 0.1, 500.0)
  mat4.rotateY(Modelviewmatrix, Modelviewmatrix, degToRad(eulerY))
  eulerY = 0
  setCubeMatrixUniforms()
  gl.bindBuffer(gl.ARRAY_BUFFER, VertexBuffer)
  gl.vertexAttribPointer(SkyboxProgram.VertexLocation, 3, gl.FLOAT, false, 0, 0)

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, borderTexture)
  gl.drawArrays(gl.TRIANGLES, 0, VertexBuffer.numberOfItems)
}