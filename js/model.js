//Initializing global variables
var lat = 53.345615,
	lng = -6.264155,
	fsClientId = '1LJNHGRXVKQUREYLERJFYKAOCBEBJCOTRN5W5CGH5YN3P1AB',
	fsClientSecret = 'PM5IMHDOH2OJ1T3ODPQWMAO3LN2AD4ELC2NQ255QUANZIAA0',
	vm = '';

// Constructor for Place
var Place = function(data) {
	this.name = data.name;
	this.lat = data.lat;
	this.lng = data.lng;
	this.imgSrc = data.imgSrc;
	this.imgAttribute = data.imgAttribute;
	this.description = data.description;
	this.phone = data.phone;
	this.url = data.url;
	this.rate = data.rate;
	this.canonicalUrl = data.canonicalUrl;
	this.address = data.address;
};

//Main function to create google map
function initMap() {
	//Set the variable for the starting point
	var startPoint = new google.maps.LatLng(lat, lng);
	vm = new ViewModel();
	//Start knockout dependency tracking
	ko.applyBindings(vm);


	//Set the variable for the google map option
	var mapOptions = {
		zoom: 18,
		center: startPoint,
		disableDefaultUI: true
	};

	//Create a new map object
	vm.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions); 

	// Initialize markers
	vm.markers = [];

	// Initialize infowindow
	vm.infowindow = new google.maps.InfoWindow();

	// Render all markers with data from the data model.
	vm.renderMarkers(vm.placeList());

	// Add event listener for map click event (when user click on other areas of the map beside of markers)
	google.maps.event.addListener(vm.map, 'click', function(event) {
		// Every click change all markers icon back to defaults.
		vm.deactivateAllMarkers();

		// Every click close all indowindows.
		vm.infowindow.close();
	});
}

//create knockout model to bind to the search element												
function ViewModel() {
	// set this to the self variable
 	var self = this;

	//set the bind-data to the search field to "Temple Bar"
	self.searchTerm = ko.observable('Temple Bar');

	// Set location list observable array from PlaceData
	self.placeList = ko.observableArray([]);

	//Inicialize the list
	self.foursquare(lat, lng, self.searchTerm());

	// Initial current location to be the first one.
	self.currentPlace = ko.observable(this.placeList()[0]);

	// Initially blank
	self.errorMessage = ko.observable(''); 

	// Functions invoked when user clicked an item in the list.
	this.setPlace = function(clickedPlace) {
		// Set current location to which user clicked.
		self.currentPlace(clickedPlace);

		// Find index of the clicked location and store for use in activation of marker.
		var index = self.filteredItems().indexOf(clickedPlace);

		// Prepare content for Google Maps infowindow
		self.updateContent(clickedPlace);

		// Activate the selected marker to change icon.
		// function(marker, context, infowindow, index)
		self.activateMarker(self.markers[index], self, self.infowindow, index)();
	};

	// Filter location name with value from search field.
	this.filteredItems = ko.computed(function() {
		var searchTerm = self.searchTerm().toLowerCase();
		if (!searchTerm) {
			return self.placeList();
		} else {
			return ko.utils.arrayFilter(self.placeList(), function(item) {
				// return true if found the typed keyword, false if not found.
				return item.name.toLowerCase().indexOf(searchTerm) !== -1;
			});
		}
	});

	//function to update the view model	
	self.updatefsResults = function(){
		//return the updated data from the search field
		//then run the ajax function to create the foursquare list
		ko.computed(function(){
			self.renderMarkers(self.filteredItems());
			//self.foursquare(lat, lng, self.searchTerm());
		}, self);
	};

	//Get user current location
	self.getMyLocation = function(){
		ko.computed(function(){
			self.geoFindMe(self.searchTerm());
		}, self);
	};

	self.colapseNav = function(){
		ko.computed(function(){
			self.showOrHideNav();
		}, self);
	};
}

// Method for clear all markers.
ViewModel.prototype.clearMarkers = function() {
	for (var i = 0; i < this.markers.length; i++) {
		this.markers[i].setMap(null);
	}
		this.markers = [];
};

// Method for render all markers.
ViewModel.prototype.renderMarkers = function(arrayInput) {
	// Clear old markers before render
	this.clearMarkers();
	var infowindow = this.infowindow;
	var placeToShow = arrayInput;
	var bounds = new google.maps.LatLngBounds();

	// Create new marker for each place in array and push to markers array
	for (var i = 0, len = placeToShow.length; i < len; i ++) {
		var location = {lat: placeToShow[i].lat, lng: placeToShow[i].lng};
		var currentLatlng = new google.maps.LatLng(placeToShow[i].lat, placeToShow[i].lng);
		var marker = new google.maps.Marker({
				position: location,
				map: this.map
			});

		this.markers.push(marker);

		bounds.extend(currentLatlng);

		//render in the map
		this.markers[i].setMap(this.map);

		// add event listener for click event to the newly created marker
		marker.addListener('click', this.activateMarker(marker, this, infowindow, i));
	}
	this.map.fitBounds(bounds);
};

// Set all marker icons back to default icons.
ViewModel.prototype.deactivateAllMarkers = function() {
	var markers = this.markers;
	for (var i = 0; i < markers.length; i ++) {
		markers[i].setAnimation(null);
		//markers[i].setIcon('img/map-pin-01.png');
	}
};

// Set the target marker to change icon and open infowindow
// Call from user click on the menu list or click on the marker
ViewModel.prototype.activateMarker = function(marker, context, infowindow, index) {
	return function() {

		// check if have an index. If have an index mean request come from click on the marker event
		if (!isNaN(index)) {
			var place = context.filteredItems()[index];
			if (place !== undefined){
				context.updateContent(place);
			}
		}
		// closed opened infowindow
		infowindow.close();

		// deactivate all markers
		context.deactivateAllMarkers();

		// Open targeted infowindow and change its icon.
		infowindow.open(context.map, marker);
		
		vm.toggleBounce(marker, index);
	};
};

//Function to animate the marker 
ViewModel.prototype.toggleBounce = function(mk, i) {
	//Create the variable       		
	var fsMarkerDetailUl =  $('.fs-list').find('ul'),
		fsMarkerDetailPos = 180 * i;

	//If the marker has animation attribute then remove the animation attribute
	//also remove the show className from the fs-list ul dom to slide left
	//also remove the active className from the active fs-list ul li dom         
	if (mk.getAnimation() !== null) {
		mk.setAnimation(null);

	//If marker does not have animation attribue
	//remove animation attribute from any other markers that are animated
	//then set the animation attribute to the clicked marker
	//add the show className from the fs-list ul dom to slide right
	//also add the active className to the fs-list ul li dom         
	} else {
		for(var am in allMarkers){
			// iterate through all the markers and see if it has the animation attribute
			var isMoving = allMarkers[am].getAnimation();
			//if marker is animating and index is not self
			//then set the animated marker's animation attribute to null
			if(isMoving && am !== i){
				allMarkers[am].setAnimation(null);
			}
		}
		
		//Add the Bounce animation to the clicked marker using google map's animation method
		//also add the show className from the fs-list ul dom to slide right and animate the child dom to the top
		//also add the active className to the fs-list ul li dom         			
		mk.setAnimation(google.maps.Animation.BOUNCE);
		fsMarkerDetailUl.addClass('show').animate({
			scrollTop: fsMarkerDetailPos
		}, 300);
	}
};

// Change the content of infowindow
ViewModel.prototype.updateContent = function(place){
	var html = '<div class="info_content">' +
		'<h4>' + place.name + '</h4>' +
		'<p>' + place.phone + '</p>'+
		'<p class="review"><img src="' + place.imgSrc + '">'+
		'<em>' + place.description + '</em></p></div>';

	this.infowindow.setContent(html);
};

// Method for foursquare API call
ViewModel.prototype.foursquare = function(lat, lng, search) {

	var config = {
		client_id: fsClientId,
		client_secret: fsClientSecret,
		query: search
	};
	var url = "https://api.foursquare.com/v2/venues/explore?ll="+lat+","+lng+"&client_id="+config.client_id+"&client_secret="+config.client_secret+"&v=20160302&query="+config.query+"";

	//Set timeout in case of fail
	var fAjaxRequestTimeout = setTimeout(function(){
		vm.errorMessage('Oh no! Seems that we can\'t find anything.');
	},8000);

	$.ajax({
		type: "GET",
		url : url,
		dataType : 'jsonp',
	}).done(function(data){
		var results = data.response.groups[0].items;

		//Clear the foursquareList to add new entries
		vm.placeList.removeAll();
		vm.clearMarkers();


	//If no data is returned				
	if(results.length > 0){	
		//Loop through the returned data
		//then create the variable for to use in populating the fs-list					
		for (result in results){
			var business = results[result];
			var data = {};
			data.name = business.venue.name;
			data.lat = business.venue.location.lat;
			data.lng = business.venue.location.lng;
			data.imgSrc = business.venue.categories[0].icon.prefix+'64'+business.venue.categories[0].icon.suffix;
			data.phone = business.venue.contact.formattedPhone ? business.venue.contact.formattedPhone : '';
			data.url = business.venue.url ? business.venue.url : '#';
			data.rate = business.venue.rating ? business.venue.rating : '0.0';
			data.canonicalUrl = (business.hasOwnProperty('tips') && (0 < business.tips.length)) ? business.tips[0].canonicalUrl : '#';
			data.address = business.venue.location.formattedAddress;
			data.imgAttribute = (business.hasOwnProperty('tips') && (0 < business.tips.length)) ? business.tips[0].text : '';
			data.description = (business.hasOwnProperty('tips') && (0 < business.tips.length)) ? business.tips[0].text : '';

			vm.placeList.push(new Place(data));

		}
			vm.renderMarkers(vm.placeList());
			clearTimeout(fAjaxRequestTimeout);
		} else {
			vm.searchTerm = ko.observable('');
			vm.errorMessage('<h3>Oh no!</br> Seems that we can\'t find anything.</h3>');
			//Use google map api to clear the markers on the map													
			google.maps.event.addDomListener(window, 'load', addGoogleMapsMarkers(markers));
		}	
	});
};

//Find current location, using HTML5 Geolocation
ViewModel.prototype.geoFindMe = function (search) {
	if (navigator.geolocation) {
		var location_timeout = setTimeout("geolocFail()", 10000);

		navigator.geolocation.getCurrentPosition(function(position) {
			clearTimeout(location_timeout);

			myLat = position.coords.latitude;
			myLng = position.coords.longitude;

			var startPoint = new google.maps.LatLng(lat, lng);

			//Set the variable for the google map option
			var mapOptions = {
				zoom: 16,
				center: startPoint,
				disableDefaultUI: true
			};

			//Create a new map object
			vm.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

			//Call getVenue to show places on the map and show the list
			vm.foursquare(myLat, myLng, vm.searchTerm());

		}, function(error) {
			clearTimeout(location_timeout);
			geolocFail();
		});
	} else {
		// Fallback for no geolocation
		geolocFail();
	}
}

function geolocFail(){
	vm.searchTerm ('');
	vm.errorMessage('Oh no! Seems that we can\'t find anything.');

	//Use google map api to clear the markers on the map													
	google.maps.event.addDomListener(window, 'load', addGoogleMapsMarkers(markers));
}

function googleError() {
	//This will be called when there was an error
	alert('Oh no! Seems that we can\'t find anything.');
	//$('.results').addClass('open').append('<li><h3>Oh no!</br> Seems that we can\'t load Google Maps.</h3></li>');
}

ViewModel.prototype.showOrHideNav = function() {
	$('.showHide').toggle();
}
