
 var origin = new H.geo.Point(27.48640, -99.53080 );
 var destination = new H.geo.Point(28.02181, -81.96317  );

function calculateRouteFromAtoB(platform) {
  var router = platform.getRoutingService(null, 8),
      routeRequestParams = {
        routingMode: 'fast',
        transportMode: 'truck',
        origin: '27.4864,-99.5308', 
        destination: '28.02181,-81.96317',  
        return: 'polyline'
    };
  router.calculateRoute(
    routeRequestParams,
    onSuccess,
    onError
  );
}
function onSuccess(result) {
  var route = result.routes[0];
  console.log(route);
  addRouteShapeToMap(route);
}

function onError(error) {
  alert('Can\'t reach the remote server');
}

var mapContainer = document.getElementById('map'),
  routeInstructionsContainer = document.getElementById('panel');
var platform = new H.service.Platform({
  apikey: 'USE YOUR KEY'
});

var defaultLayers = platform.createDefaultLayers();
var map = new H.Map(mapContainer,
  defaultLayers.vector.normal.map, {
  center: {lat: 27.4864, lng: -99.5308},
  zoom: 13,
  pixelRatio: window.devicePixelRatio || 1
});

window.addEventListener('resize', () => map.getViewPort().resize());
var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
var ui = H.ui.UI.createDefault(map, defaultLayers);
function addRouteShapeToMap(route) {
  route.sections.forEach((section) => {
     let linestring = H.geo.LineString.fromFlexiblePolyline(section.polyline);
     let polyline = new H.map.Polyline(linestring, {
      style: {
        lineWidth: 4,
        strokeColor: 'rgba(0, 128, 255, 0.7)'
      }
    });
    const decoded = decode(section.polyline);
    const points = decoded.polyline.map((p) => {
      return {
        x: p[0],
        y: p[1]
      }
    });
    console.log("Ployline Points", points);
    simplified = simplify(points, 0.0002, true);
    console.log("Simplyfied Polyline Points", simplified);
  
    var markersGroup = new H.map.Group();
    map.addObject(markersGroup);
    markersGroup.addEventListener('tap', function (evt) {
      var bubble = new H.ui.InfoBubble(evt.target.getGeometry(), {
        content: evt.target.getData()
      });
      ui.addBubble(bubble);
    }, false);

    usingGeoCordinatesData(simplified, markersGroup, 10);
   // usingHereMapDiscoverApi(simplified, markersGroup, 10);

    // Add the polyline to the map
    map.addObject(polyline);

    // And zoom to its bounding rectangle
    map.getViewModel().setLookAtData({
      bounds: polyline.getBoundingBox()
    });
  });
}

function usingGeoCordinatesData(simplified, markersGroup, maxDistance){
    let nearByStations = [];
    console.log(stations);
    for(const sp of simplified) {
      for(const station of stations) {
      const distance = calcCrow(station.latitude,station.longitude,sp.x, sp.y).toFixed(1);
      const miles = kmToMiles(+distance);
        if(miles < maxDistance) { // Near 10 KM from polyline
          if(!station.hasOwnProperty('distanceFromPoint')) {
          station.distanceFromPoint = [];
          }
          const ns = nearByStations.find((s) => s.site == station.site);
          if(ns) {
            ns.distanceFromPoint.push({
              distance: miles, 
              points: sp
            });
          } else {
            station.distanceFromPoint.push({
              distance: miles, 
              points: sp
            });
            nearByStations.push(station);
          }
        }
      }
    }
    nearByStations = nearByStations.map((s) => {
      const sorted = s.distanceFromPoint.sort((a,b) => { return (a.distance - b.distance) });
      if(Array.isArray(sorted)) {
        s.distance = sorted[0].distance;
      }
      return s;
    });
  console.log(nearByStations);

  nearByStations.forEach((location) => {
    var marker = new H.map.Marker({ lat: location.latitude, lng: location.longitude });
    const label = "Site: " + location.site + ' ' + " Distance: " + location.distance + " km";
    marker.setData("<div>"+ label +"</div>");
    markersGroup.addObject(marker);
  });
}

function usingHereMapDiscoverApi(simplified, markersGroup, distance){
  const simplified_polyline = simplified.map((p) => {
    return [p.x, p.y];
  });
  // USING DISCOVER API
  const encoded_polyline = encode({ polyline: simplified_polyline });
  var geocoder = platform.getSearchService();
  geocodingParameters = {
    q: 'PILOT',
    route: encoded_polyline, // This size must be under 2048 characters 
    w: distance * 1000,
    at: '27.4864,-99.5308'
  };

    geocoder.discover(
      geocodingParameters,
      (result) => {
        console.log(result.items);
         if(Array.isArray(result.items)) {
          result.items.forEach((location) => {
            var marker = new H.map.Marker(location.position);
            const label = location.hasOwnProperty('address') ? location.address.label  : 'unknown';
            marker.setData("<div>"+ label +"</div>");
            markersGroup.addObject(marker);
        //    map.addObject(marker);
          })
        }
      },
      (err) => {
        console.log(err)
      }
    );
    // END DISCOVER API 
}

// Now use the map as required...
calculateRouteFromAtoB(platform);
  //This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
  function calcCrow(lat1, lon1, lat2, lon2) 
  {
    var R = 6371; // km
    var dLat = toRad(lat2-lat1);
    var dLon = toRad(lon2-lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c;
    return d; // In KM 
  }
  // Converts numeric degrees to radians
  function toRad(Value) 
  {
      return Value * Math.PI / 180;
  }
  function getMiles(meters) {
    return (meters*0.000621371192).toFixed(2);
}

function kmToMiles(kilometers){
  // conversion factor
  const factor = 0.621371
  // calculate miles
  return (kilometers * factor).toFixed(2);
}
