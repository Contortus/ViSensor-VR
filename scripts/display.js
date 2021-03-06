// Copyright (C) 2017 Artur Baltabayev, Jean Büsche, Martin Kern, Gabriel Scheibler
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

var CONTROLLER_THRESHOLD = 0.3; //up to this value movement of the joysticks will be ignored
var ROTATION_SPEED = 2; // the speed the camera is rotating with
var MOVEMENT_SPEED = 0.2; // the speed the camera is moving with

var DISPLAYABLE_SENSORS = ["temperature", "illuminance", "humidity"]; // list fo all displayable sensors
var DISPLAYED_SENSOR = "illuminance"; // sensor that will be displayed

var MINIMAL_DISTANCE = 1.5; // minimal distance between measuring points
var MAXIMAL_SIZE = 1.0; // minimal size for spheres
var MINIMAL_SIZE = 0.1; // maximal size for spheres

var SENSOR_CHANGED = true; // true if the sensor is changed in the menu

var DISPLAY_DISTANCE = 10; // sensor-values in this radius are displayed when hovering over datapoint

var sensorData = []; // parsed data from json-file
var parameters = {}; // variables declared via http-get

var haveEvents = 'ongamepadconnected' in window;
var controllers = {}; // list of controllers
var menu_open = false; // true if menu has been opened
var menu_state = "scheme"; // can change between scheme and color
var color_scheme = 2; // the color sheme that is used
var sensor = 1; // sensor that is displayed (see `DISPLAYED_SENSOR`)

var hoveredDatapointPosition; //position of datapoint the cursor is currently looking at

// button states are used because the controller sends continous signals on button press
var button_state = {
	"menu_button": false,
	"left_button": false,
	"right_button": false,
	"up_button": false,
	"down_button": false
}

document.addEventListener('keydown', (event) => {
	const keyName = event.key;

	if (keyName === 'Control') { // user wants to open/close menu
		if (menu_open == false) { // if menu is open then close and reverse
			menu_open = true;
		} else {
			menu_open = false;
		}
	// navigate in menu
	} else if (keyName === 'ArrowRight' && menu_open) {
		if (menu_state == "scheme") {
			if (color_scheme < 2)
				color_scheme++;
		} else {
			if (sensor < 2) {
				sensor++;
				SENSOR_CHANGED = true;
			}
		}
	} else if (keyName === 'ArrowLeft' && menu_open) {
		if (menu_state == "scheme") {
			if (color_scheme > 0)
				color_scheme--;
		} else {
			if (sensor > 0) {
				sensor--;
				SENSOR_CHANGED = true;
			}
		}
	} else if (keyName == 'ArrowDown' && menu_open) {
		menu_state = "sensor";
	} else if (keyName == 'ArrowUp' && menu_open) {
		menu_state = "scheme";
	}

	// change sensor according to selected sensor in menu
	switch (sensor) {
		case 0:
			DISPLAYED_SENSOR = 'temperature';
			break;
		case 1:
			DISPLAYED_SENSOR = 'illuminance';
			break;
		case 2:
			DISPLAYED_SENSOR = 'humidity';
			break;
		default:
			break;
	}

}, false);

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

// executed on first load of page
$(document).ready(function () {
	var i;
	var getItems = window.location.search.substr(1).split(/\?|\&/); // split GET-variables off

	for (i in getItems) {
		parameters[getItems[i].split("=")[0]] = getItems[i].split("=")[1];
	}

	var not_a_sensor = true;

	// test whether the sensor can be displayed
	for (var i = 0; i < DISPLAYABLE_SENSORS.length; i++)
		if (parameters["sensor"] == DISPLAYABLE_SENSORS[i])
			not_a_sensor = false;

	if (!not_a_sensor)
		DISPLAYED_SENSOR = parameters["sensor"];

	// include obj-file in index.html
	var asset = '<a-asset-item id="room-obj" src="Obj/' + parameters["file"] + '.obj"></a-asset-item>';
	var asset_mtl = '<a-asset-item id="room-mtl" src="Obj/' + 'env.mtl"></a-asset-item>';
	var entity = '<a-entity obj-model="obj: #room-obj; mtl: #room-mtl"></a-entity>';

	$('a-assets').append(asset);
	$('a-assets').append(asset_mtl);
	$('a-scene').append(entity);

	setSensorData(function () {
		display(sensorData); //call method for displaying data in 3d-environment
	});
});

// fill array with datapoints
function setSensorData(callback) {
	var m_Data = "Json/" + parameters["file"] + ".json"; // JSON-data-file

	// save data for requested sensor in `sensorData`-variable
	$.getJSON(m_Data, function (result) {
		$.each(result["session"], function (i, entry) {
			if (entry[DISPLAYED_SENSOR] != 0)
				sensorData.push({
					"illuminance": entry["illuminance"],
					"humidity": entry["humidity"],
					"temperature": entry["temperature"],
					"time": entry["time"],
					"coordinate": {
						"x": entry["xPos"],
						"z": (-1 * entry["yPos"]),
						"y": entry["zPos"]
					}
				});
		});

		callback();
	});
}

// display data in 3d space
function display() {

	var dataArray = []; // the filtered data that will be displayed

	var scene = d3.select("a-scene"); // select scene for displaying data

	dataArray.push(sensorData[0]); // first element is the only element that must be displayed because later values might be to closed to be represented

	// push all data-elements that are far enough away from every other element
	for (var i = 1; i < sensorData.length; i++) {
		if (sensorData[i][DISPLAYED_SENSOR] != 0) {
			var currPos = sensorData[i]["coordinate"];
			var nearValueExists = false;

			for (var j = 0; j < dataArray.length; j++) {
				var includedPos = dataArray[j]["coordinate"];
				var distance = Math.sqrt(Math.pow(currPos.x - includedPos.x, 2) + Math.pow(currPos.z - includedPos.z, 2) + Math.pow(currPos.y - includedPos.y, 2));

				if (distance < MINIMAL_DISTANCE)
					nearValueExists = true
			}

			// we don't have to check for time because new values are always on top
			if (!nearValueExists)
				dataArray.push(sensorData[i]);
		}
	}

	var max = getMaxValue(dataArray); // maximal value for displayed sensor
	var min = getMinValue(dataArray); // minimal value for displayed sensor

	// scale input data for better representation
	var hscale = (DISPLAYED_SENSOR == "illuminance") ?
		d3.scaleLog()
			.domain([min, Math.round(max)])
			.range([MINIMAL_SIZE, MAXIMAL_SIZE]) :
		d3.scaleLinear()
			.domain([min, Math.round(max)])
			.range([MINIMAL_SIZE, MAXIMAL_SIZE]);

	// create spheres
	var entities = scene.selectAll('a-entity.datapoint').data(dataArray);

	var entity = entities.enter()
		.append('a-entity')
		.attr("class", "datapoint")
		.attr("id", function (d, i) {
			return "datapoint_" + i;
		})
		.attr("position", function (d, i) {
			return d["coordinate"];
		});

	entity.append("a-sphere").attr("class", "datapoint")
		.attr("radius", function (d, i) {
			return (hscale(d[DISPLAYED_SENSOR]));
		})
		.attr("color", function (d, i) {
			var arr = infraRed(hscale(d[DISPLAYED_SENSOR]), hscale(max), hscale(min));
			return "rgb(" + arr[0] + "," + arr[1] + "," + arr[2] + ")";
		})
		.attr("opacity", 0.8);

	// text with value for datapoint
	entity.append("a-text").attr("class", "datapoint")
		.attr("position", function (d, i) {
			return {"x": 0, "y": (hscale(d[DISPLAYED_SENSOR])) + 0.5, "z": 0};
		})
		.attr("value", function (d, i) {
			return Math.round(d[DISPLAYED_SENSOR]* 100) / 100;
		})
		.attr("align", "center")
		.attr("visible", false);

	// ° sign cannot be displayed so a plane with texture will be rendered instead
	entity.select('a-text').append("a-plane").attr("class", "datapoint")
		.attr("position", function (d, i) {
			return {"x": 0.45, "y": 0, "z": 0};
		})
		.attr("scale", "0.16 0.16 0.16")
		.attr("color", "white")
		.attr("transparent", true)
		.attr("visible", false)
		.attr("src", "centigrades_texture.png");

	// update-loop
	function render() {
		requestAnimationFrame(render);

		var scene = d3.select("a-scene"); // select scene for displaying data
		var entities = scene.selectAll('a-entity.datapoint').data(dataArray);

		// values of datapoints will be displayed if mouse hovers over them
		entities.on('mouseenter', function () {
			d3.select(this)
				.select('a-text')
				.attr('visible', true);

			hoveredDatapointPosition = d3.select(this).attr('position');
		})

		entities.on('mouseleave', function () {
		d3.select(this)
			.select('a-text')
			.attr('visible', false);

		hoveredDatapointPosition = null;
		})

		switch (DISPLAYED_SENSOR) {
			case 'temperature':
				sensor = 0;
				break;
			case 'illuminance':
				sensor = 1;
				break;
			case 'humidity':
				sensor = 2;
				break;
			default:
				break;
		}


		// change menu button states according to selected sensor
		if (sensor == 0) {
			DISPLAYED_SENSOR = "temperature";
			d3.select('#temperature').attr("color", "blue");
			d3.select('#illuminance').attr("color", "red");
			d3.select('#humidity').attr("color", "red");
		} else if (sensor == 1) {
			DISPLAYED_SENSOR = "illuminance";
			d3.select('#temperature').attr("color", "red");
			d3.select('#illuminance').attr("color", "blue");
			d3.select('#humidity').attr("color", "red");
		} else {
			DISPLAYED_SENSOR = "humidity";
			d3.select('#temperature').attr("color", "red");
			d3.select('#illuminance').attr("color", "red");
			d3.select('#humidity').attr("color", "blue");
		}

		// change menu state
		if (menu_state == "sensor") {
			d3.select('#sensor').attr("color", "black");
			d3.select('#scheme').attr("color", "grey");
		} else {
			d3.select('#scheme').attr("color", "black");
			d3.select('#sensor').attr("color", "grey");
		}

		var max = getMaxValue(dataArray); // maximal value of current sensor
		var min = getMinValue(dataArray); // minimal value of current sensor

		// scale input data for better representation
		var hscale = (DISPLAYED_SENSOR == "illuminance") ?
			d3.scaleLog()
				.domain([min, Math.round(max)])
				.range([MINIMAL_SIZE, MAXIMAL_SIZE]) :
			d3.scaleLinear()
				.domain([min, Math.round(max)])
			.range([MINIMAL_SIZE, MAXIMAL_SIZE]);

		// change color of spheres
		entities.select('a-sphere')
		.attr("color", function (d, i) {
			if (color_scheme == 0) {
				var arr = blackWhite(hscale(d[DISPLAYED_SENSOR]), hscale(max), hscale(min));
				d3.select('#black_white').attr("color", "blue");
				d3.select('#blue_white').attr("color", "red");
				d3.select('#infrared').attr("color", "red");

				d3.select('#color_theme_img').attr('src', 'bw.png');
			} else if (color_scheme == 1) {
				var arr = whiteBlue(hscale(d[DISPLAYED_SENSOR]), hscale(max), hscale(min));
				d3.select('#black_white').attr("color", "red");
				d3.select('#blue_white').attr("color", "blue");
				d3.select('#infrared').attr("color", "red");

				d3.select('#color_theme_img').attr('src', 'wb.png');
			} else {
				var arr = infraRed(hscale(d[DISPLAYED_SENSOR]), hscale(max), hscale(min));
				d3.select('#black_white').attr("color", "red");
				d3.select('#blue_white').attr("color", "red");
				d3.select('#infrared').attr("color", "blue");

				d3.select('#color_theme_img').attr('src', 'infrared.png');
			}

			return "rgb(" + arr[0] + "," + arr[1] + "," + arr[2] + ")";
		});

		// runs only if sensor has been changed in menu
		// spehers and texts must be adapted to new sensor-values
		if (SENSOR_CHANGED) {
			entities.select('a-sphere')
				.attr("radius", function (d, i) {
					return (hscale(d[DISPLAYED_SENSOR]));
				}).attr("color", function (d, i) {
					var arr = infraRed(hscale(d[DISPLAYED_SENSOR]), hscale(max), hscale(min));
					return "rgb(" + arr[0] + "," + arr[1] + "," + arr[2] + ")";
				}).attr("opacity", 0.8);

			entities.select('a-text')
				.attr("position", function (d, i) {
					return {x: 0, y: (hscale(d[DISPLAYED_SENSOR])) + 0.5, z: 0};
				})
				.attr("value", function (d, i) {
					var e = null;

					switch (DISPLAYED_SENSOR) {
						case "temperature":
							e = "";
							entity.select('a-plane').attr("visible", true);
							d3.selectAll('.degSign').attr("visible", true);
							break;
						case "humidity":
							e = "%";
							entity.select('a-plane').attr("visible", false);
							d3.selectAll('.degSign').attr("visible", false);
							break;
						case "illuminance":
							e = "lx";
							entity.select('a-plane').attr("visible", false);
							d3.selectAll('.degSign').attr("visible", false);
							break;
						default:
							break;
					}

					// set min, max values in menu
					d3.select('#min_value').attr('value',  Math.round(min * 100) / 100 + " " + e);
					d3.select('#max_value').attr('value', Math.round(max * 100) / 100 + " " + e);

					return Math.round(d[DISPLAYED_SENSOR]* 100) / 100 + " " + e;
				});

			SENSOR_CHANGED = false;
		}

		// display data-values only if selected sphere is close
		entities.select('a-text')
				.attr("visible", function (d, i) {
					if (hoveredDatapointPosition == null)
						return false;

					var distance = calcDistance(hoveredDatapointPosition, d3.select(this.parentNode).attr('position'));

					if (distance <= DISPLAY_DISTANCE)
						return true;

					return false;
				});

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

		// rotate text towards camera
		entities.select('a-text')
				.attr("rotation", function (d, i) {
					var thisPos = d3.select(this.parentNode).attr('position') != null ? d3.select(this.parentNode).attr('position') : {"x": 0, "y": 0, "z": 0};

					var d = Math.sqrt(Math.pow(thisPos["x"] - cameraPos["x"], 2) + Math.pow(thisPos["z"] - cameraPos["z"], 2) + Math.pow(thisPos["y"] - cameraPos["y"], 2));
					var dx = thisPos["x"] - cameraPos["x"];
					var dy = thisPos["y"] -  cameraPos["y"];
					var dz = thisPos["z"] - cameraPos["z"];

					var h_angle = ((Math.atan2(dx, dz) * (180 / Math.PI)) + 180) % 360 ;

					var v_angle = ((Math.asin(dy / d) * (180 / Math.PI)) + 360) % 360 ;

					return {x: v_angle, y: h_angle, z: 0};
				});

		// handle gamepad events for menu
		if (menu_open)
			d3.select('#menu').attr("visible", true);
		else
			d3.select('#menu').attr("visible", false);


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
			var menu_button = buttons[9].pressed;
			var menu_left_button = buttons[14].pressed;
			var menu_right_button = buttons[15].pressed;
			var menu_up_button = buttons[12].pressed;
			var menu_down_button = buttons[13].pressed;

			// check for menu open request
			if (!button_state["menu_button"] && menu_button) {
				if (menu_open == false) {
					menu_open = true;
				} else {
					menu_open = false;
				}
			}

			if (!button_state["left_button"] && menu_left_button) {
				if (menu_state == "scheme") {
					if (color_scheme > 0)
						color_scheme--;
				} else {
					if (sensor > 0) {
						sensor--;
						SENSOR_CHANGED = true;
					}
				}
			}

			if (!button_state["right_button"] && menu_right_button) {
				if (menu_state == "scheme") {
					if (color_scheme < 2)
						color_scheme++;
				} else {
					if (sensor < 2) {
						sensor++;
						SENSOR_CHANGED = true;
					}
				}
			}

			switch (sensor) {
				case 0:
					DISPLAYED_SENSOR = 'temperature';
					break;
				case 1:
					DISPLAYED_SENSOR = 'illuminance';
					break;
				case 2:
					DISPLAYED_SENSOR = 'humidity';
					break;
				default:
					break;
			}

			if (!button_state["up_button"] && menu_up_button) {
				menu_state = "scheme";
			}

			if (!button_state["down_button"] && menu_down_button) {
				menu_state = "sensor";
			}

			button_state["menu_button"] = menu_button;
			button_state["left_button"] = menu_left_button;
			button_state["right_button"] = menu_right_button;

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

// black-white color mapping
function blackWhite(value, max, min) {
	var bw;
	if (value <= min) {
		bw = 0;
	} else if (value >= max) {
		bw = 1;
	} else {
		bw = (value - min) / (max - min);
	}
	bw = Math.floor(bw * 255);
	var ret = [bw, bw, bw];
	return ret;
}

// white-blue color mapping
function whiteBlue(value, max, min) {
	var nb;

	if (value <= min) {
		nb = 1;
	} else if (value >= max) {
		nb = 0;
	} else {
		nb = 1 - (value - min) / (max - min);
	}
	nb = Math.floor(nb * 255);
	var ret = [nb, nb, 255];
	return ret;
}

// infrared color mapping
function infraRed(value, max, min) {
	var x1, x2, x3, x4, x5, x6;
	var offset = (max - min) / 7;
	x1 = min + offset;
	x2 = min + 2 * offset;
	x3 = min + 3 * offset;
	x4 = min + 4 * offset;
	x5 = min + 5 * offset;
	x6 = min + 6 * offset;

	var r, g, b;

	if (value <= min) {
		r = 0;
		g = 0;
		b = 0;
	} else if (value > min && value <= x1) {
		r = (value - min) / offset;
		g = 0;
		b = r;
	} else if (value > x1 && value <= x2) {
		r = 1 - (value - x1) / offset;
		g = 0;
		b = 1;
	} else if (value > x2 && value <= x3) {
		r = 0;
		g = (value - x2) / offset;
		b = 1;
	} else if (value > x3 && value <= x4) {
		r = 0;
		g = 1;
		b = 1 - (value - x3) / offset;
	} else if (value > x4 && value <= x5) {
		r = (value - x4) / offset;
		g = 1;
		b = 0;
	} else if (value > x5 && value <= x6) {
		r = 1;
		g = 1 - (value - x5) / offset;
		b = 0;
	} else if (value > x6 && value <= max) {
		r = 1;
		g = (value - x6) / offset;
		b = g;
	} else {
		r = 1;
		g = 1;
		b = 1;
	}
	r = Math.floor(r * 255);
	g = Math.floor(g * 255);
	b = Math.floor(b * 255);

	var ret = [r, g, b];
	return ret;
}

// get maximal value for current sensor
function getMaxValue(dataArray) {
	var max = dataArray[0][DISPLAYED_SENSOR];
	for (var i = 1; i < dataArray.length; i++) {
		max = (dataArray[i][DISPLAYED_SENSOR] > max) ? dataArray[i][DISPLAYED_SENSOR] : max;
	}
	return max;
}

// get minimal value for current sensor
function getMinValue(dataArray) {
	var min = dataArray[0][DISPLAYED_SENSOR];
	for (var i = 1; i < dataArray.length; i++) {
		min = (dataArray[i][DISPLAYED_SENSOR] < min) ? dataArray[i][DISPLAYED_SENSOR] : min;
	}
	return min;
}

// calculate distance between two points
function calcDistance(pos1, pos2) {
	return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2) + Math.pow(pos2.z - pos1.z, 2));
}