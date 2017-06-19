// Copyright (C) 2017 Jean Büsche
// 
// This file is part of visensor-vr.
// 
// visensor-vr is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// visensor-vr is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with visensor-vr.  If not, see <http://www.gnu.org/licenses/>.
// 

var haveEvents = 'ongamepadconnected' in window;
var controllers = {};

var CONTROLLER_THRESHOLD = 0.3; //up to this value movement of the joysticks will be ignored
var ROTATION_SPEED = 2;
var MOVEMENT_SPEED = 0.2;

var MINIMAL_DISTANCE = 1; // minimal distance between measuring points

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

$(document).ready(function () {
	var parameters = {}; // variables declared via http-get
	var i;
	var getItems = window.location.search.substr(1).split(/\?|\&/);

	for (i in getItems) {
		parameters[getItems[i].split("=")[0]] = getItems[i].split("=")[1];
	}

	// either `sensor`or `file`variable are empty
	if (parameters["sensor"] == "" && parameters["file"] == "")
		return false;

	var sensorData = [];
	var m_Data = "Json/" + parameters["file"] + ".json"; // JSON-data-file

	// include obj-file in index.html
	var asset = '<a-asset-item id="room-obj" src="Obj/' + parameters["file"] + '.obj"></a-asset-item>';
	var entity = '<a-entity obj-model="obj: #room-obj"></a-entity>';

	$('a-assets').append(asset);
	$('a-scene').append(entity);

	// save data for requested sensor in `sensorData`-variable
	$.getJSON(m_Data, function (result) {
		// console.log(result);
		$.each(result["session"], function (i, entry) {
			// console.log(entry);
			if (entry[parameters["sensor"]] != 0)
				sensorData.push({
					"sensorValue": entry[parameters["sensor"]],
					"time": entry["time"],
					"coordinate": {
						"x": entry["xPos"],
						"z": (-1 * entry["yPos"]),
						"y": entry["zPos"]
					}
				});
		});

		display(sensorData); //call method for displaying data in 3d-environment
	});
});

// display data in 3d space
function display(m_Data) {

	var dataArray = []; // the filtered data that will be displayed

	// scale input data for better representation
	var hscale = d3.scaleLinear()
		.domain([0, 15])
		.range([0, 2]);

	var scene = d3.select("a-scene"); // select scene for displaying data

	dataArray.push(m_Data[0]); // first element is the only element that must be displayed because later values might be to closed to be represented

	// push all data-elements that are far enough away from every other element
	for (var i = 1; i < m_Data.length; i++) {
		if (m_Data[i].sensorValue != 0) {
			var currPos = m_Data[i]["coordinate"];
			var nearValueExists = false;

			for (var j = 0; j < dataArray.length; j++) {
				var includedPos = dataArray[j]["coordinate"];
				var distance = Math.sqrt(Math.pow(currPos.x - includedPos.x, 2) + Math.pow(currPos.z - includedPos.z, 2) + Math.pow(currPos.y - includedPos.y, 2));
				// console.log(distance);
				if (distance < MINIMAL_DISTANCE)
					nearValueExists = true
			}

			// we don't have to check for time because new values are always on top
			if (!nearValueExists)
				dataArray.push(m_Data[i]);
		}
	}

	// create spheres
	var spheres = scene.selectAll("a-sphere.datapoint").data(dataArray);
	spheres.enter().append("a-sphere").attr("class", "datapoint")
		.attr("position", function (d, i) {
			return d["coordinate"];
		}).attr("radius", function (d, i) {
			return hscale(Math.log(d["sensorValue"]));
		});

	// TODO: add texts for spheres

	// var texts = scene.selectAll("a-text.datapoint").data(dataArray);
	// texts.enter().append("a-text").attr("class", "datapoint")
	// 	.attr("position", function (d, i) {
	// 		var coordinates = d["coordinates"].substr(1).split(" ");

	// 		 console.log(coordinates);
	// 	});

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

		var cameraRotation = cameraPos; // set everything to zero

		// select camery and get camera position
		if (d3.select('a-camera').attr("position") != null)
			cameraPos = d3.select('a-camera').attr("position");

		// get camera rotation
		if (d3.select('a-camera').attr("rotation") != null)
			cameraRotation = d3.select('a-camera').attr("rotation");

		// go through connected controllers
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

			// update camera position
			d3.select('a-camera').attr('position', function () {
				var radian = -(cameraRotation['y']) * (Math.PI / 180); // convert deg to rad

				// update camera position for first controller axis
				if (Math.abs(fb_axis) >= CONTROLLER_THRESHOLD) {
					cameraPos['z'] -= (-fb_axis * MOVEMENT_SPEED * Math.cos(radian));
					cameraPos['x'] += (-fb_axis * MOVEMENT_SPEED * Math.sin(radian));
				}

				// update camera position for second controller axis
				if (Math.abs(lr_axis) >= CONTROLLER_THRESHOLD) {
					radian = -(cameraRotation['y'] - 90) * (Math.PI / 180);
					cameraPos['z'] -= (lr_axis * MOVEMENT_SPEED * Math.cos(radian));
					cameraPos['x'] += (lr_axis * MOVEMENT_SPEED * Math.sin(radian));
				}

				// move camera down if right trigger pressed
				if (down_button_pressed == true)
					cameraPos["y"] -= MOVEMENT_SPEED * down_button;

				// move camera up if left trigger pressed
				if (up_button_pressed == true)
					cameraPos["y"] += MOVEMENT_SPEED * up_button;

				return cameraPos;
			});


		}
	}
	render();
}