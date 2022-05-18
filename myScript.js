function colorRows() {
	var table = document.getElementById("contacts");
	for (i = 0; i < table.rows.length; i++) {
		if (i % 2 == 0) {
			table.rows[i].style.backgroundColor = "firebrick";
		} else {
			table.rows[i].style.backgroundColor = "khaki";
		}
	}
}

function chgimg(name, txt) {
	var theimage = document.getElementById("placeholder");
	theimage.src = name;
	theimage.alt = txt;
}
 
function generateRandomPassword() {
	event.preventDefault();
	var string_length = 10;
	var result = "";
	var id = 0;
	var chars = [
	 "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
	 "0123456789", 
	 "!%&@#$^*?_~" 
	];
	for(var i = 0; i < string_length; i++) {
	 id = Math.floor(Math.random() * 3);
	 result += chars[id].charAt(Math.floor(Math.random() * chars[id].length));
	}
	document.getElementById("randomPassword").value = result;
}


function checkStrength() {
	let password = document.getElementById("password").value;
	var strength = 0;
	if (password.length < 6) {
		document.querySelector('#result').classList.remove();
		document.querySelector('#result').classList.add('short');
		document.getElementById('result').textContent = "Too short";
	}
	if (password.length > 7) strength += 1
	// If password contains both lower and uppercase characters, increase strength value.
	if (password.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/)) strength += 1
	// If it has numbers and characters, increase strength value.
	if (password.match(/([a-zA-Z])/) && password.match(/([0-9])/)) strength += 1
	// If it has one special character, increase strength value.
	if (password.match(/([!,%,&,@,#,$,^,*,?,_,~])/)) strength += 1
	// If it has two special characters, increase strength value.
	if (password.match(/(.*[!,%,&,@,#,$,^,*,?,_,~].*[!,%,&,@,#,$,^,*,?,_,~])/)) strength += 1
	// Calculated strength value, we can return messages
	// If value is less than 2
	if (strength < 2) {
		document.querySelector('#result').classList.remove();
		document.querySelector('#result').classList.add('weak');
		document.getElementById('result').textContent = "Weak";
	} else if (strength == 2) {
		document.querySelector('#result').classList.remove();
		document.querySelector('#result').classList.add('good');
		document.getElementById('result').textContent = "Good";
	} else {
		document.querySelector('#result').classList.remove();
		document.querySelector('#result').classList.add('strong');
		document.getElementById('result').textContent = "Strong";
	}
}


let map, geocoder, uofmn, userLocation, x;
function initMap() {
	uofmn = { lat: 44.9727, lng: -93.23540000000003 };
	geocoder = new google.maps.Geocoder();
	const options = {
		fields: ["formatted_address", "geometry", "name"],
		strictBounds: false,
	};
	var input;
	if (document.URL.includes("myContacts.html")) {
	  map = new google.maps.Map(document.getElementById("map"), {
		center: uofmn,
		zoom: 14,
	  });
	  if (navigator.geolocation) {
		  navigator.geolocation.getCurrentPosition(
			(position) => {
				userLocation = {
				lat: position.coords.latitude,
				lng: position.coords.longitude,
			  };
			}); 
		}
		input = document.getElementById('start');
		const autocomplete = new google.maps.places.Autocomplete(input, options);
	} 
	if (document.URL.includes("myForm.html")) {
		map2 = new google.maps.Map(document.getElementById("map2"), {
		center: uofmn,
		zoom: 14,
		});
		var infoWindow = new google.maps.InfoWindow();
		var service = new google.maps.places.PlacesService(map2);
		map2.addListener('click', function(event){
			if (event.placeId) {
				event.stop();
				service.getDetails({placeId: event.placeId}, function (place, status) {
					if (status == google.maps.places.PlacesServiceStatus.OK) {
						x = place;
						infoWindow.close();
						infoWindow.setPosition(place.geometry.location);
						infoWindow.setContent(
							'<div>' + '<b>'
							+ place.name + '</b><br>' 
							+ place.formatted_address + '</div>');
						infoWindow.open(map2);
						document.getElementById('location').value = place.formatted_address;
					}
				});
				
			}
		});
		input = document.getElementById('location');
		const autocomplete = new google.maps.places.Autocomplete(input, options);
	}
}

var markers = [];
function markContacts(){
	var table = document.getElementById("contacts");
	var conimg = document.getElementsByClassName("contactImg");
	for (i = 1; i < table.rows.length; i++) {
		var address = table.rows[i].cells[2].innerHTML.replace(/(<br>|\n|\t)/gm,"");
		const contentString = 
			table.rows[i].cells[0].innerHTML + '<br>' +
			'<img src=' + conimg[i-1].src + ' class="markImg"><br>' +
			table.rows[i].cells[3].innerHTML.split('<br>')[0] + '<br>' +
			address;
			createMarker(address, contentString, 'a');
	}
}

var infoWindow;
function createMarker(loc, cont, type) {
	var marker;
	var icon = {
		url: "img/p3.png", 
		scaledSize: new google.maps.Size(40, 40) 
	};
	infoWindow = new google.maps.InfoWindow();
	infoWindow.close();
	if (type == 'a') {
		geocoder.geocode( { 'address' : loc }, function( results, status ) {
		if( status == 'OK') {
				marker = new google.maps.Marker({
				map: map,
				icon: icon,
				position: results[0].geometry.location
				});
				marker.addListener("click", () => {
					infoWindow.setContent(cont);
					infoWindow.open({
						anchor: marker,
						map,
						shouldFocus: false,
					});
				});
				markers.push(marker);
		}
		});
	}
	else {
		geocoder.geocode({ location : loc}, function (results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				cont += results[0].formatted_address;
				marker = new google.maps.Marker({
					map: map,
					icon: icon,
					position: results[0].geometry.location
					});
					marker.addListener("click", () => {
						infoWindow.setContent(cont);
						infoWindow.open({
							anchor: marker,
							map,
							shouldFocus: false,
						});
					});
					markers.push(marker);
			}
		});
	}
}

function nearbyMarkers() {
	event.preventDefault();
	if (directionsRenderer != null) {
		directionsRenderer.setMap(null);
		directionsRenderer.setPanel(null);
		directionsRenderer = null;
		document.getElementById("sidebar").style.display = "none";
	}
	clearMarkers();
	var rad = document.getElementById('radius').value;
	var place = document.getElementById('places').value;
	var service = new google.maps.places.PlacesService(map);
	if (place == 'other'){
		place = document.getElementById('other').value;
		service.nearbySearch({location: uofmn, radius: rad, keyword: [place]}, function( results, status ) {
			if( status == 'OK') {
				for (var i = 0; i < results.length; i++) {
					var contentString = 
						'<b>' + results[i].name + '</b>'
						+ '<br>Address: ';
					createMarker(results[i].geometry.location,contentString, 'l');
				}
				map.setCenter(results[0].geometry.location);			
			}
		});
	} else {
		service.nearbySearch({location: uofmn, radius: rad, type: [place]}, function( results, status ) {
			if( status == 'OK') {
				for (var i = 0; i < results.length; i++) {
					var contentString = 
						'<b>' + results[i].name + '</b>'
						+ '<br>Address: ';
					createMarker(results[i].geometry.location,contentString, 'l');
				}
				map.setCenter(results[0].geometry.location);			
			}
		});
	}
}

function clearMarkers() {
	for (i = 0; i < markers.length; i++) {
		markers[i].setMap(null);
	}
	markers = [];
}

var lat2, lon2;
function updateContactDist(contact) {
	var i = parseInt(contact);
	var x = document.getElementsByClassName("address");
	var address = x[i].innerHTML.replace(/(<br>|\n|\t)/gm,"");
	geocoder.geocode( { 'address' : address }, function( results, status ) {
		if( status == 'OK') {
			lat2 = results[0].geometry.location.lat();
			lon2 = results[0].geometry.location.lng();	
		}
	});
	setInterval(calcDist, 250);
}

function calcDist() {
	lat1 = parseFloat(document.getElementById("lat1").value);
	lon1 = parseFloat(document.getElementById("lon1").value);
	
	const R = 6371e3; // metres
	const x1 = lat1 * Math.PI/180;
	const x2 = lat2 * Math.PI/180;
	const dx = (lat2-lat1) * Math.PI/180;
	const dy = (lon2-lon1) * Math.PI/180;

	const a = Math.sin(dx/2) * Math.sin(dx/2) +
			  Math.cos(x1) * Math.cos(x2) *
			  Math.sin(dy/2) * Math.sin(dy/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	const d = R * c; // in metres
	document.querySelector('.result-dist').textContent = d;
}

function enableOther() {
	var x = document.getElementById('places').value;
	if (x == 'other') {
		document.getElementById('other').disabled = false;
	} else {
		document.getElementById('other').disabled = true;
	}
}

var directionsRenderer, directionsService;
function getDirections() {
	event.preventDefault();
	clearMarkers();
	if (directionsRenderer != null) {
		directionsRenderer.setMap(null);
		directionsRenderer.setPanel(null);
		directionsRenderer = null;
	}
	directionsRenderer = new google.maps.DirectionsRenderer();
	directionsService = new google.maps.DirectionsService();
	directionsRenderer.setMap(map);
	directionsRenderer.setPanel(document.getElementById("sidebar"));
	
	const mode = document.querySelector('input[name="mode"]:checked').value;
	var start = document.getElementById("start").value;
	if (start == 'Default (current location)') {
		start = userLocation;
	}
	const contactName = document.getElementById("contName").value;
	var x = true;
	var i = 1;
	var table = document.getElementById("contacts");
	var end;
	while (x) {
		if (table.rows[i].cells[0].innerHTML == contactName) {
			end = table.rows[i].cells[2].innerHTML.replace(/(<br>|\n|\t)/gm,"");
			x = false;
		}
		i++;
	}
	directionsService
		.route({
		  origin: start,
		  destination: end,
		  travelMode: google.maps.TravelMode[mode],
		})
		.then((response) => {
		  directionsRenderer.setDirections(response);
    })
	.catch((e) => window.alert("Directions request failed due to " + status));
	document.getElementById("sidebar").style.display = "block";
}