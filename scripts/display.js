var haveEvents = 'ongamepadconnected' in window;
var controllers = {};

var CONTROLLER_THRESHOLD = 0.3; //up to this value movement of the joysticks will be ignored
var ROTATION_SPEED = 2;
var MOVEMENT_SPEED = 0.2;

var MINIMAL_DISTANCE = 1;

// this function is called whenever a controller is connected
function connecthandler(e) {
	controllers[e.gamepad.index] = e.gamepad; // the controller is saved in the controller list under its unique identifier

	//requestAnimationFrame(updateStatus);
}

// this function is called whenever a controller gets disconnected
function disconnecthandler(e) {
	delete controllers[e.gamepad.index];
}

function scangamepads() {
	var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
	for (var i = 0; i < gamepads.length; i++) {
		if (gamepads[i]) {
			if (gamepads[i].index in controllers) {
				controllers[gamepads[i].index] = gamepads[i];
			} else {
				controllers[gamepads[i].index] = gamepads[i];
				//requestAnimationFrame(updateStatus);
			}
		}
	}
}


window.addEventListener("gamepadconnected", connecthandler);
window.addEventListener("gamepaddisconnected", disconnecthandler);

if (!haveEvents) {
	setInterval(scangamepads, 500);
}

// TODO: change according to new format
$(document).ready(function () {
	// gets sensor name  via http-get
	var parameters = {};
	var i;
	var getItems = window.location.search.substr(1).split("?");

	for (i in getItems) {
		parameters[getItems[i].split("=")[0]] = getItems[i].split("=")[1];
	}

	if (parameters["sensor"] == "" && parameters["file"] == "")
		return false;

	var sensorData = [];
	var data = parameters["file"] + ".json";

	$.getJSON(data, function (result) {
		// console.log(result);
		$.each(result["session"], function (i, entry) {
			// console.log(entry);
			sensorData.push({
				"sensorValue": entry[parameters["sensor"]],
				"time": entry["time"],
				"coordinate": {
					"x": entry["xPos"],
					"z": entry["yPos"],
					"y": entry["zPos"]
				}
			});
		});

		// console.log(sensorData);

		display(sensorData);
	});
});

// display data in 3d space
function display(data) {

	// var subData = {};
	var dataArray = []; // mainly the same as `subData` but compatible with d3

	// scale input data for better representation
	var hscale = d3.scaleLinear()
		.domain([0, 40])
		.range([0, 1]);

	var scene = d3.select("a-scene");

	// console.log(data);
	dataArray.push(data[0]);

	// define subData as all newest values with disjunct position values
	for (var i = 1; i < data.length; i++) {
		// if subData doesn't contain coordinate or older value for that coordianate, add datapoint
		if (data[i].sensorValue != 0) {
			var currPos = data[i]["coordinate"];
			var nearValueExists = false;

			for (var j = 0; j < dataArray.length; j++) {
				var includedPos = dataArray[j]["coordinate"];
				var distance = Math.sqrt(Math.pow(currPos.x - includedPos.x, 2) + Math.pow(currPos.z - includedPos.z, 2) + Math.pow(currPos.y - includedPos.y, 2));
				// console.log(distance);
				if (distance < MINIMAL_DISTANCE)
					nearValueExists = true
			}

			if (!nearValueExists)
				dataArray.push(data[i]);
		}
	}

	console.log(dataArray.length + ", " + data.length);

	// create spheres
	var spheres = scene.selectAll("a-sphere.datapoint").data(dataArray);
	spheres.enter().append("a-sphere").attr("class", "datapoint")
		.attr("position", function (d, i) {
			return d["coordinate"];
		}).attr("radius", function (d, i) {
			return hscale(d["sensorValue"]);
		});

	// TODO: add texts for spheres

	// var texts = scene.selectAll("a-text.datapoint").data(dataArray);
	// texts.enter().append("a-text").attr("class", "datapoint")
	// 	.attr("position", function (d, i) {
	// 		var coordinates = d["coordinates"].substr(1).split(" ");

	// 		 console.log(coordinates);
	// 	});

	// TODO: implement up-down movement

	// update-loop
	function render() {
		requestAnimationFrame(render);

		if (!haveEvents)
			scangamepads(); // check for gamepads

		var cameraPos = {
			"x": 0,
			"y": 0,
			"z": 0
		};
		var j;

		var cameraRotation = cameraPos;

		if (d3.select('a-camera').attr("position") != null)
			cameraPos = d3.select('a-camera').attr("position");

		if (d3.select('a-camera').attr("rotation") != null)
			cameraRotation = d3.select('a-camera').attr("rotation");

		for (j in controllers) {

			var controller = controllers[j];

			var axes = controller["axes"];
			var buttons = controller["buttons"];

			var lr_axis = axes[0];
			var fb_axis = axes[1];
			var rot_axis = axes[2];
			var tilt_axis = axes[3];

			var down_button_pressed = buttons[6].pressed;
			var up_button_pressed = buttons[7].pressed;
			var down_button = buttons[6].value;
			var up_button = buttons[7].value;

			// update camera rotation
			d3.select('a-camera').attr('rotation', function () {
				if (Math.abs(rot_axis) >= CONTROLLER_THRESHOLD)
					cameraRotation['y'] -= rot_axis * ROTATION_SPEED;
				if (Math.abs(tilt_axis) >= CONTROLLER_THRESHOLD)
					cameraRotation['x'] -= tilt_axis * ROTATION_SPEED;
				return cameraRotation;
			});

			// console.log(cameraRotation['y']);

			// update camera position
			d3.select('a-camera').attr('position', function () {
				var radian = -(cameraRotation['y']) * (Math.PI / 180);

				if (Math.abs(fb_axis) >= CONTROLLER_THRESHOLD) {
					cameraPos['z'] -= (-fb_axis * MOVEMENT_SPEED * Math.cos(radian));
					cameraPos['x'] += (-fb_axis * MOVEMENT_SPEED * Math.sin(radian));
				}

				if (Math.abs(lr_axis) >= CONTROLLER_THRESHOLD) {
					radian = -(cameraRotation['y'] - 90) * (Math.PI / 180);
					cameraPos['z'] -= (lr_axis * MOVEMENT_SPEED * Math.cos(radian));
					cameraPos['x'] += (lr_axis * MOVEMENT_SPEED * Math.sin(radian));
				}

				if (down_button_pressed == true)
					cameraPos["y"] -= MOVEMENT_SPEED * down_button;

				if (up_button_pressed == true)
					cameraPos["y"] += MOVEMENT_SPEED * up_button;

				return cameraPos;
			});


		}
	}
	render();
}