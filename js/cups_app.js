import { emotiv } from './lib/cortex_20211122.js' 

let vertex_shader_3d = [
"attribute vec4 a_position;",
"attribute vec4 a_color;",

"uniform mat4 u_matrix;",
"varying vec4 v_color;",

"void main() {",
  "// Multiply the position by the matrix.",
  "gl_Position = u_matrix * a_position;",
  "",

  "// Pass the color to the fragment shader.",
  "v_color = a_color;",
"}"

].join("\n");

let fragment_shader_3d = [
  "precision mediump float;",

  "// Passed in from the vertex shader.",
  "varying vec4 v_color;",

  "void main() {",
     "gl_FragColor = v_color;",
  "}"

].join("\n");
const SPREAD = 250;
const N_CIRCLE = 32;
const N_LONGITUDES = 32; // M n longitudes
const N_LATITUDES = 16; // N n latitudes


// const COLOR_CUP_BASE = [220, 220, 220];  
// const COLOR_CUP_SIDE = [100, 0, 50];
// const COLOR_BALL = [255, 200, 200];

const COLOR_CUP_BASE = [198, 17, 1]; //#C11601
const COLOR_CUP_SIDE = [255, 65, 44];  // #FF412C
const COLOR_BALL = [101, 174, 239];  // #65AEEF
const CUP_HEIGHT = 120.0;

const light_dir = [3/Math.sqrt(19), 3/Math.sqrt(19), -1/Math.sqrt(19)];

let experiment = {};

// $("#start_new").click(()=> {
//   $("#msg").text('');
//   if (document.getElementById('isheadset').checked) {
//       setupExperiment();
//   }else {
//       window.client = false;
//       client = false;
//       experiment.initExperiment('no_headset');
//   }
// });

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}
function getUrlParam(parameter, defaultvalue){
    var urlparameter = defaultvalue;
    if(window.location.href.indexOf(parameter) > -1){
        urlparameter = getUrlVars()[parameter];
        }
    return urlparameter;
}


experiment.initExperiment = function() {
  // Get A WebGL context

  var canvas = document.querySelector("#gl");
  // canvas.style.display = "block";
  var canvas_wrapper = document.querySelector("#box");
  canvas_wrapper.style.display = "block";

  let speed_ele = document.getElementById("speed_val");
  var rotation_speed = parseFloat(getUrlParam("rotation_speed", '10'));
  speed_ele.innerHTML = rotation_speed.toFixed(1);

  let step_val = parseFloat(getUrlParam("step_val", '0.5'));
  let n_games = parseInt(getUrlParam("n_games", '3'));
  let swap_time = parseInt(getUrlParam("swap_time", '10'));
  let game_count = 0;
  var raise_speed = 2.0
  const ball_index = 0;
  var swap_count = 0;
  let marker_started = false;
  var n_swaps = swap_time * rotation_speed / Math.PI;
  let score = 0;
  var user_guess;
  var cups = Array();
  var mid_point = Array();
  var state = "show_ball";  // Choosing, rotating,
  // full_screen();
  let stopTime;
  let w = canvas_wrapper.clientWidth;
  let h = canvas_wrapper.clientHeight;
  let score_ele = document.getElementById("score_val");
  let score_w = score_ele.clientWidth;
  let score_offset = w - score_w - 10*score_ele.style.fontSize;
  score_ele.style.left = score_offset;
  speed_ele.style.left = score_offset;
  canvas.width = w;
  canvas.height = h;
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  // setup GLSL program
  // var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);
  gl.viewportWidth = canvas.width;
  gl.viewportHeight = canvas.height;

  // gl.clearColor( 0.2, 0.6, 0.9, 1.0 );
  gl.clearColor( 0.7, 0.7, 0.7, 1.0 );  // #edeef0
  // gl.clearColor( 0.988, 0.988, 0.988, 1.0 );  //#fcfcfc
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.frontFace(gl.CCW);
  gl.cullFace(gl.FRONT);
  let vertexShader = gl.createShader(gl.VERTEX_SHADER);
  let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertexShader, vertex_shader_3d);
  gl.shaderSource(fragmentShader, fragment_shader_3d);

  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
     return;
  }
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
     return;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
     console.error("Error linking program", gl.getProgramInfoLog(program));
     return;
  }

  gl.validateProgram(program);
  if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
     return;
  }

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var colorLocation = gl.getAttribLocation(program, "a_color");

  // lookup uniforms
  var matrixLocation = gl.getUniformLocation(program, "u_matrix");

  // Create a buffer to put positions in
  var positionBufferCup = gl.createBuffer();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBufferCup)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferCup);
  // Put geometry data into buffer
  let n_pts_cup = setGeometryCup(gl);

  // Create a buffer to put positions in
  var positionBufferBall = gl.createBuffer();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBufferBall)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferBall);
  // Put geometry data into buffer
  let n_pts_ball = setGeometryBall(gl);

  // Create a buffer to put colors in
  var colorBufferCup = gl.createBuffer();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = colorBufferCup)
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferCup);
  // Put geometry data into buffer
  setColorsCup(gl);

  // Create a buffer to put colors in
  var colorBufferBall = gl.createBuffer();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = colorBufferBall)
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferBall);
  // Put geometry data into buffer
  setColorsBall(gl, n_pts_ball);


  function radToDeg(r) {
    return r * 180 / Math.PI;
  }

  function degToRad(d) {
    return d * Math.PI / 180;
  }
  var coords = [[-SPREAD, 0, 0], [0, 0, 0], [SPREAD, 0, 0]];
  // var rotation = [degToRad(90), degToRad(0), degToRad(0)];
  var rotation = new Float32Array(16);
  var delta_rotation = 0;
  var rotation_sum = 0;
  const half_raise_height = 60;
  var fieldOfViewRadians = degToRad(40);

  var cameraPosition = [0.0, -1200.0, 300.0];
  var fPosition = [0, 0, CUP_HEIGHT];

  var up = [0, 0, 1];

  // Compute the camera's matrix using look at.
  var cameraMatrix = m4.lookAt(cameraPosition, fPosition, up);

  var then;
  setTimeout(function(){
    then = performance.now() * 0.001;
    requestAnimationFrame(drawScene);
  }, 3000);

  // Draw the scene    
  function drawScene(clock) {
    // Convert to seconds
    clock *= 0.001;
    // Subtract the previous time from the current time
    var deltaTime = clock - then;
    // Remember the current time for the next frame.
    then = clock;

    //webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.canvas.width = canvas_wrapper.clientWidth;
    gl.canvas.height = canvas_wrapper.clientHeight;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Every frame increase the rotation a little.
    if (state == "show_ball") {
        delta_rotation = raise_speed * deltaTime;
        rotation_sum += delta_rotation;
        if (rotation_sum > 2 * Math.PI) {
          rotation_sum = 2 * Math.PI;
        }
        rotation = m4.identity();
    } else if ((state != "guessing") && (state != "wait")) {
      delta_rotation = rotation_speed * deltaTime;
      rotation_sum += delta_rotation;
      if (rotation_sum > Math.PI) {
        delta_rotation -= rotation_sum - Math.PI;
      }
      rotation = m4.zRotation(delta_rotation, rotation);
    }

    // Clear the canvas AND the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);


    // Compute the matrices
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 100;
    var zFar = 1500;
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
    // Make a view matrix from the camera matrix
    var viewMatrix = m4.inverse(cameraMatrix);

    // Compute a view projection matrix
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    // var cameraMatrix = m4.lookAt(cameraPosition, fPosition, up);

    show_ball();
    choose_cups();
    rotate_cups();
    end_rotation();

    if (state == 'show_ball') {
      // Turn on the position attribute
      gl.enableVertexAttribArray(positionLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferBall);
      // Tell the position attribute how to get data out of positionBufferCup (ARRAY_BUFFER)
      var size = 3;          // 3 components per iteration
      var type = gl.FLOAT;   // the data is 32bit floats
      var normalize = false; // don't normalize the data
      var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
      var offset = 0;        // start at the beginning of the buffer
      gl.vertexAttribPointer(
          positionLocation, size, type, normalize, stride, offset);
      // Turn on the color attribute

      gl.enableVertexAttribArray(colorLocation);
      // Bind the color buffer.
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferBall);

      // Tell the attribute how to get data out of colorBufferCup (ARRAY_BUFFER)
      var size = 3;                 // 3 components per iteration
      var type = gl.UNSIGNED_BYTE;  // the data is 8bit unsigned values
      var normalize = true;         // normalize the data (convert from 0-255 to 0-1)
      var stride = 0;               // 0 = move forward size * sizeof(type) each iteration to get the next position
      var offset = 0;               // start at the beginning of the buffer
      gl.vertexAttribPointer(
          colorLocation, size, type, normalize, stride, offset);

      var matrix =
          m4.translate(viewProjectionMatrix, coords[ball_index][0], coords[ball_index][1], 0.0);

      // Set the matrix.
      gl.uniformMatrix4fv(matrixLocation, false, matrix);

      // Draw the geometry.
      gl.drawArrays(gl.TRIANGLES, 0, n_pts_ball);
    }


    // Turn on the position attribute
    gl.enableVertexAttribArray(positionLocation);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferCup);

    // Tell the position attribute how to get data out of positionBufferCup (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionLocation, size, type, normalize, stride, offset);

    // Turn on the color attribute
    gl.enableVertexAttribArray(colorLocation);
    // Bind the color buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferCup);

    // Tell the attribute how to get data out of colorBufferCup (ARRAY_BUFFER)
    var size = 3;                 // 3 components per iteration
    var type = gl.UNSIGNED_BYTE;  // the data is 8bit unsigned values
    var normalize = true;         // normalize the data (convert from 0-255 to 0-1)
    var stride = 0;               // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;               // start at the beginning of the buffer
    gl.vertexAttribPointer(
        colorLocation, size, type, normalize, stride, offset);

    for (var c = 0; c < 3; ++c) {
      var matrix =
          m4.translate(viewProjectionMatrix, coords[c][0], coords[c][1], coords[c][2]);

      // Set the matrix.
      gl.uniformMatrix4fv(matrixLocation, false, matrix);

      // Draw the geometry.
      gl.drawArrays(gl.TRIANGLES, 0, n_pts_cup);
    }
    if (state !== "finished") {
      requestAnimationFrame(drawScene);
    } else {
      requestAnimationFrame(()=>{
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      });
    }
  }

  function show_ball() {
    if (state == 'show_ball') {
      if (game_count >= n_games) {
        if (typeof emotiv.endExperiment != "undefined") {
          emotiv.endExperiment();
        }
        let ele = document.getElementById("messages");
        ele.innerHTML = "<p>Game Over</p><p>Please scroll down and click next to continue</p>";
        ele.style.display = "block";
        state = "finished";
        return;
      }
      if (!marker_started) {
        emotiv.sendMarker(1, "show_ball", true);
        marker_started = true;
      }
      coords[ball_index][2] = half_raise_height * (1 - Math.cos(rotation_sum));
      if (rotation_sum >= 2 * Math.PI) {
        emotiv.sendStopMarker();
        marker_started = false;
        rotation_sum = 0;
        state = "choose_cups";
        coords[ball_index][2] = 0.0;
      }
    }

  }

  function coordinate_mean() {
    for (let i=0; i<3;i++) {
      mid_point[i] = (coords[cups[0]][i] + coords[cups[1]][i]) / 2.0;
    }
    return mid_point;
  }

  function choose_cups() {
    if (state == "choose_cups"){
      let old_cups = cups.slice();
      cups = Array();
      let possible = [0, 1, 2];
      while (cups.length < 2) {
        let idx = randInt(possible.length);
        cups.push(possible.splice(idx, 1)[0]);
        if (cups.length == 1 && old_cups.includes(cups[0])) {
          if (old_cups.includes(possible[0])) {
            cups.push(possible[1]);
          } else {
            cups.push(possible[0]);
          }
        }
      }
      mid_point = coordinate_mean(cups)
      state = "rotate_cups";
    }
  }

  function rotate_cups() {
    if (state == 'rotate_cups') {
      if (! marker_started) {
        emotiv.sendMarker(2, "rotate_cups", true)
        marker_started = true
      }
      for (let i=0;i<cups.length; i++) {
          for (let j=0;j<3;j++) {
            coords[cups[i]][j] -= mid_point[j];
          }        
      }
      for (let i=0;i<cups.length; i++) {
        rotate_vector(coords[cups[i]], rotation);
      }
      for (let i=0;i<cups.length; i++) {
          for (let j=0;j<3;j++) {
            coords[cups[i]][j] += mid_point[j];
          }
      }
      if (rotation_sum >= Math.PI) {
        stopTime = performance.now() + emotiv.T0;
        rotation_sum = 0;
        state = "end_rotation";
        swap_count++
      }
    }
  }

  function end_rotation() {
    if (state == "end_rotation") {
      if (swap_count >= n_swaps) {
        game_count += 1;
        // emotiv.sendStopMarker();
        swap_count = 0;
        state = "guessing";
        window.addEventListener("keydown", guess);
        document.getElementById("messages").style.display = "block";
        // emotiv.sendMarker(3, "guessing", true)
      } else {
        state = "choose_cups";
      }
    }
  }

  function get_cup_idx() {
      let ball_location = coords[ball_index][0];
      let cup_idx;
      if (ball_location < -SPREAD * 0.4) {
        return 1;
      } else if (ball_location > SPREAD * 0.4) {
        return 3;
      } else {
        return 2;
      }
  }

  function user_guess_fn() {
    // Need to work out the cup location of the ball_index
    // ball index does not change the cordinates do
    let cup_idx = get_cup_idx()
    document.getElementById("messages").style.display = "none";

    let ele = document.getElementById("results");
    if (user_guess == cup_idx) {
      console.log("Correct!!!");
      emotiv.updateMarker(stopTime, {"result": "correct", "speed": rotation_speed});
      ele.innerHTML = "Correct!";
      score += rotation_speed;
      rotation_speed += step_val;
      console.log("new rotation_speed", rotation_speed);
    } else if (user_guess == 9) {
      emotiv.updateMarker(stopTime, {"result": "no guess", "speed": rotation_speed});
      step_val = Math.max(0.8 * step_val, 0.05);
      ele.innerHTML = "No Guess. Pay attention!";
      console.log("no guess");
      score -= 2;
      rotation_speed -= step_val/2;
    } else {
      emotiv.updateMarker(stopTime, {"result": "incorrect", "speed": rotation_speed});
      score -= Math.max(rotation_speed / 2, 10);
      step_val = Math.max(0.8 * step_val, 0.05);
      ele.innerHTML = "Incorrect. Pay attention!";
      console.log("wrong");
      rotation_speed -= step_val;
    }
    ele.style.display = "block";
    let w = ele.clientWidth;
    let parent = document.getElementById("box");
    let gw = parent.clientWidth;
    let left = (gw - w) / 2.0;
    ele.style.left = left;
    state = 'wait';
    ele = document.getElementById("speed_val");
    ele.innerHTML = rotation_speed.toFixed(1)
    ele = document.getElementById("score_val");
    ele.innerHTML = score.toFixed(1);
    n_swaps = swap_time * rotation_speed / Math.PI;
    window.removeEventListener("keydown", guess);
    emotiv.sendStopMarker();
    marker_started = false;
    setTimeout(()=>{
      state = "show_ball";
      then = performance.now() * 0.001;
      document.getElementById("results").style.display = "none";
    }, 2000);
  }


  function guess(e) {
    if (state == "guessing") {
      console.log("key code: ", e.keyCode)
      if (e.keyCode == 49) {
        user_guess = 1;
      } else if (e.keyCode == 50) {
        user_guess = 2;
      } else if (e.keyCode == 51) {
        user_guess = 3;
      } else {
        user_guess = 9;
      }
      user_guess_fn();
    }
  }
}
window.experiment = experiment;

function randInt(n) {
  return Math.floor(Math.random() * n);
}


function rotate_vector(vec3, rotMat) {
  let vecMat = m4.identity();
  m4.translate(vecMat, vec3[0], vec3[1], vec3[2], vecMat);
  m4.multiply(rotMat, vecMat, vecMat);
  vec3[0] = vecMat[12];
  vec3[1] = vecMat[13];
  vec3[2] = vecMat[14];
}

function createBallCoordArray() {
  const ball_radius = 40;
  const M = N_LONGITUDES;  // 32; // M n longitudes
  const N = N_LATITUDES;  //16; // N n latitudes
  let pts = []
  for (let lg=0; lg<M; lg++) {  // Create the poles
    let theta1 = lg * 2 * Math.PI / M;
    let theta2 = (lg+1) * 2 * Math.PI / M;
    let phi =  Math.PI / N;
    let z =  ball_radius * Math.cos(phi);
    let x1 = ball_radius * Math.sin(phi) * Math.cos(theta1);
    let x2 = ball_radius * Math.sin(phi) * Math.cos(theta2);
    let y1 = ball_radius * Math.sin(phi) * Math.sin(theta1);
    let y2 = ball_radius * Math.sin(phi) * Math.sin(theta2);
    pts = pts.concat([x1, y1, z+ball_radius, 
                      0., 0., 2*ball_radius, 
                      x2, y2, z+ball_radius]);
    pts = pts.concat([x1, y1, ball_radius-z, 
                      x2, y2, ball_radius-z, 
                      0., 0., 0.]);
  }
  for (let li=1; li<N/2; li++) {
    for (let lg=0; lg<M; lg++) {
      let theta1 = lg * 2 * Math.PI / M;
      let theta2 = (lg+1) * 2 * Math.PI / M;
      let phi1 = li * Math.PI / N;  // small ... high
      let phi2 = (li+1) * Math.PI / N; // larger  ... low 
      let z1 = ball_radius + ball_radius * Math.cos(phi1); // high
      let z2 = ball_radius + ball_radius * Math.cos(phi2); // low
      let x11 = ball_radius * Math.sin(phi1) * Math.cos(theta1); // sm left
      let x12 = ball_radius * Math.sin(phi1) * Math.cos(theta2); //sm right
      let x21 = ball_radius * Math.sin(phi2) * Math.cos(theta1); // lg left
      let x22 = ball_radius * Math.sin(phi2) * Math.cos(theta2); // lg right
      let y11 = ball_radius * Math.sin(phi1) * Math.sin(theta1);
      let y12 = ball_radius * Math.sin(phi1) * Math.sin(theta2);
      let y21 = ball_radius * Math.sin(phi2) * Math.sin(theta1);
      let y22 = ball_radius * Math.sin(phi2) * Math.sin(theta2);
      pts = pts.concat([x21, y21, z2, 
                        x11, y11, z1, 
                        x22, y22, z2, 
                        x22, y22, z2, 
                        x11, y11, z1, 
                        x12, y12, z1]);
      z1 = ball_radius - ball_radius * Math.cos(phi1); // low
      z2 = ball_radius - ball_radius * Math.cos(phi2); // high
      pts = pts.concat([x11, y11, z1, 
                        x21, y21, z2, 
                        x12, y12, z1, 
                        x12, y12, z1, 
                        x21, y21, z2, 
                        x22, y22, z2]);
    }
  }
  return pts;
}

function setGeometryBall(gl) {
  let pts = createBallCoordArray();
  gl.bufferData(
    gl.ARRAY_BUFFER, 
    new Float32Array(pts),
    gl.STATIC_DRAW);
  let n_pts = pts.length/3;
  return n_pts;
}

function createCupCoordArray() {
  let r_top = 50;
  let r_bottom = 80;
  let cup_height = CUP_HEIGHT;
  let z = cup_height;
  let bz = 0
  let blz = 4
  let pts = [];
  for (let i=0; i<N_CIRCLE; i++) {
      let theta1 = i * 2 * Math.PI / N_CIRCLE
      let theta2 = (i + 1) * 2 * Math.PI / N_CIRCLE
      let x1 = r_top * Math.cos(theta1)
      let y1 = r_top * Math.sin(theta1)
      let x2 = r_top * Math.cos(theta2)
      let y2 = r_top * Math.sin(theta2)
      pts = pts.concat([x1, y1, z, 
                         0, 0, z, 
                        x2, y2, z]);

      x1 = (r_bottom+1) * Math.cos(theta1)
      x1 = Math.abs(x1) > 0.00001 ? x1 : 0.0;
      y1 = (r_bottom+1) * Math.sin(theta1)
      y1 = Math.abs(y1) > 0.00001 ? y1 : 0.0;
      x2 = (r_bottom+1) * Math.cos(theta2)
      x2 = Math.abs(x2) > 0.00001 ? x2 : 0.0;
      y2 = (r_bottom+1) * Math.sin(theta2)
      y2 = Math.abs(y2) > 0.00001 ? y2 : 0.0;
      pts = pts.concat([x1, y1, bz, 
                        x1, y1, blz, 
                        x2, y2, bz, 
                        x2, y2, bz, 
                        x1, y1, blz, 
                        x2, y2, blz]);
  }

  // Make Side
  let tz = cup_height
  for (let i=0; i<N_CIRCLE; i++) {
      let theta1 = i * 2 * Math.PI / N_CIRCLE;
      let theta2 = (i + 1) * 2 * Math.PI / N_CIRCLE;
      let tx1 = r_top * Math.cos(theta1);
      tx1 = Math.abs(tx1) > 0.00001 ? tx1 : 0.0;
      let ty1 = r_top * Math.sin(theta1);
      ty1 = Math.abs(ty1) > 0.00001 ? ty1 : 0.0;
      let tx2 = r_top * Math.cos(theta2)
      tx2 = Math.abs(tx2) > 0.00001 ? tx2 : 0.0;
      let ty2 = r_top * Math.sin(theta2);
      ty2 = Math.abs(ty2) > 0.00001 ? ty2 : 0.0;
      let bx1 = r_bottom * Math.cos(theta1);
      bx1 = Math.abs(bx1) > 0.00001 ? bx1 : 0.0;
      let by1 = r_bottom * Math.sin(theta1);
      by1 = Math.abs(by1) > 0.00001 ? by1 : 0.0;
      let bx2 = r_bottom * Math.cos(theta2);
      bx2 = Math.abs(bx2) > 0.00001 ? bx2 : 0.0;
      let by2 = r_bottom * Math.sin(theta2);
      by2 = Math.abs(by2) > 0.00001 ? by2 : 0.0;
      pts = pts.concat([bx1, by1, bz, 
                        tx1, ty1, tz, 
                        bx2, by2, bz, 
                        bx2, by2, bz, 
                        tx1, ty1, tz, 
                        tx2, ty2, tz]);
  }
  return pts;
}

function getColorFactorsFromCoordinates(pts) {
  let colorFactors = [];
  for (let i=0; i<pts.length-2; i+=9) {
    let p1 = [pts[i+0], pts[i+1], pts[i+2]];
    let p2 = [pts[i+3], pts[i+4], pts[i+5]];
    let p3 = [pts[i+6], pts[i+7], pts[i+8]];
    let a = m4.subtractVectors(p2, p1);
    let b = m4.subtractVectors(p3, p1);
    let n = m4.normalize(m4.cross(a, b));
    let cf = (m4.dot(light_dir, n) + 1) / 2;
    colorFactors.push(cf)
  }
  return colorFactors;
}

// Create geometry for cup
function setGeometryCup(gl) {
  let pts = createCupCoordArray();
  gl.bufferData(
    gl.ARRAY_BUFFER, 
    new Float32Array(pts),
    gl.STATIC_DRAW);
  let n_pts = pts.length/3;
  return n_pts;
}

function setColorsBall(gl, n_pts) {
  let pts = createBallCoordArray();
  let colorFactors = getColorFactorsFromCoordinates(pts);
  let colors = [];
  let ic = 0;
  for (let lg=0; lg<N_LONGITUDES; lg++) {
    for (let j=0; j<2; j++) {
      for (let k=0; k<3; k++) {
        let c = new Array(3);
        c[0] = Math.round(COLOR_BALL[0]*colorFactors[ic]);
        c[1] = Math.round(COLOR_BALL[1]*colorFactors[ic]);
        c[2] = Math.round(COLOR_BALL[2]*colorFactors[ic]);
        colors = colors.concat(c);
      }
      ic += 1;
    }
  }
  for (let li=1; li<N_LATITUDES/2; li++) {
    for (let lg=0; lg<N_LONGITUDES; lg++) {
      for (let j=0; j<4; j++) {
        for (let k=0; k<3; k++) {
          let c = new Array(3);
          c[0] = Math.round(COLOR_BALL[0]*colorFactors[ic]);
          c[1] = Math.round(COLOR_BALL[1]*colorFactors[ic]);
          c[2] = Math.round(COLOR_BALL[2]*colorFactors[ic]);
          colors = colors.concat(c);
        }
        ic += 1;
      }
    }
  }
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Uint8Array(colors),
      gl.STATIC_DRAW);
}

function setColorsCup(gl) {
  let cup_coords = createCupCoordArray();
  let colorFactors = getColorFactorsFromCoordinates(cup_coords);
  let cols = [];
  let ic = 0;
  for (let i=0; i<N_CIRCLE; i++) {
    for (let j=0; j<3; j++) {
        for (let k=0; k<3; k++) {
          let c = new Array(3);
          c[0] = Math.round(COLOR_CUP_BASE[0]*colorFactors[ic]);
          c[1] = Math.round(COLOR_CUP_BASE[1]*colorFactors[ic]);
          c[2] = Math.round(COLOR_CUP_BASE[2]*colorFactors[ic]);
          cols = cols.concat(c);
        }
      ic += 1;
    }
  }

  for (let i=0; i<N_CIRCLE; i++) {
    for (let j=0; j<2; j++) {
      for (let k=0; k< 3; k++) {
        let c = new Array(3);
        c[0] = Math.round(COLOR_CUP_SIDE[0]*colorFactors[ic]);
        c[1] = Math.round(COLOR_CUP_SIDE[1]*colorFactors[ic]);
        c[2] = Math.round(COLOR_CUP_SIDE[2]*colorFactors[ic]);
        cols = cols.concat(c);
      }
      ic += 1;
    }
  } 

  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Uint8Array(cols),
      gl.STATIC_DRAW);
}

function full_screen() {
    // check if user allows full screen of elements. This can be enabled or disabled in browser config. By default its enabled.
    //its also used to check if browser supports full screen api.
    if("fullscreenEnabled" in document || "webkitFullscreenEnabled" in document || "mozFullScreenEnabled" in document || "msFullscreenEnabled" in document) 
    {
        if(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled)
        {
            console.log("User allows fullscreen");

            var element = document.getElementById("box");
            //requestFullscreen is used to display an element in full screen mode.
            if("requestFullscreen" in element) 
            {
                element.requestFullscreen();
            } 
            else if ("webkitRequestFullscreen" in element) 
            {
                element.webkitRequestFullscreen();
            } 
            else if ("mozRequestFullScreen" in element) 
            {
                element.mozRequestFullScreen();
            } 
            else if ("msRequestFullscreen" in element) 
            {
                element.msRequestFullscreen();
            }

        }
    }
    else
    {
        console.log("User doesn't allow full screen");
    }
}

function screen_change()
{
    //fullscreenElement is assigned to html element if any element is in full screen mode.
    if(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) 
    {
        console.log("Current full screen element is : " + (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement))
    }
    else
    {
        // exitFullscreen us used to exit full screen manually
        if ("exitFullscreen" in document) 
        {
            document.exitFullscreen();
        } 
        else if ("webkitExitFullscreen" in document) 
        {
            document.webkitExitFullscreen();
        } 
        else if ("mozCancelFullScreen" in document) 
        {
            document.mozCancelFullScreen();
        } 
        else if ("msExitFullscreen" in document) 
        {
            document.msExitFullscreen();
        }
    }
}

//called when an event goes full screen and vice-versa.
document.addEventListener("fullscreenchange", screen_change);
document.addEventListener("webkitfullscreenchange", screen_change);
document.addEventListener("mozfullscreenchange", screen_change);
document.addEventListener("MSFullscreenChange", screen_change);

//called when requestFullscreen(); fails. it may fail if iframe don't have allowfullscreen attribute enabled or for something else. 
document.addEventListener("fullscreenerror", function(){console.log("Full screen failed");});
document.addEventListener("webkitfullscreenerror", function(){console.log("Full screen failed");});
document.addEventListener("mozfullscreenerror", function(){console.log("Full screen failed");});
document.addEventListener("MSFullscreenError", function(){console.log("Full screen failed");});
export {experiment}