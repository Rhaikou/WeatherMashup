
// Komponentti jolla valitaan paikka, jonka säätiedot näytetään
class PlaceSelect extends React.Component{

	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
	}

	render() {
		var places_array = [];
		for (let i = 0; i < this.props.places.length; i++) {
		    places_array.push(<option value={this.props.places[i]["name"]} key={i}>{this.props.places[i]["name"]}</option>);
		}

		return (
			<div className="PlaceSelect">
			<select value={this.props.selectedPlace} onChange={this.handleChange}>
			{ places_array }
			</select>
			</div>
		);
	}

	// Hoitaa valitun paikan vaihtamisen
	handleChange(e) {
		this.props.change(e.target.value);
	}
}

// Komponentti joka esittää säätiedot taulukossa
class WeatherInfo extends React.Component{

	render(){
		return (
		<table>
		<thead>
			<tr>
			<th>Säätieto</th>
			<th>Mittaus</th>
			</tr>
		</thead>
		<tbody>
			<tr>
			<td>Ilman lämpötila</td>
			<td>{this.props.airTemp}</td>
			</tr>
			<tr>
			<td>Tien lämpötila</td>
			<td>{this.props.roadTemp}</td>
			</tr>
			<tr>
			<td>Maan lämpötila</td>
			<td>{this.props.groundTemp}</td>
			</tr>
			<tr>
			<td>Tuulennopeus</td>
			<td>{this.props.windSpeed}</td>
			</tr>
			<tr>
			<td>Tuulen suunta</td>
			<td>{this.props.windDir}</td>
			</tr>
			<tr>
			<td>Ilmankosteus</td>
			<td>{this.props.humidity}</td>
			</tr>
			<tr>
			<td>Näkyvyys</td>
			<td>{this.props.visibility}</td>
			</tr>
		</tbody>
		</table>
		);
	}
}

// Komponentti joka pitää sisällään muut sovelluksen komponentit ja tilan
class WeatherComponent extends React.Component{

	constructor(props) {
		super(props);
		this.state = {
			places: [],
			selectedPlace: "",
			selectedStation: "",
			stationCoordinates: "",
			weatherInfo: "",
			viewedPlaces: [],
			forecast: [],
			selectedUrl: "",
			logged: false,
			user: ""
		};
		this.changeSelected = this.changeSelected.bind(this);
		this.changeByLatLon = this.changeByLatLon.bind(this);
		this.removeFromList = this.removeFromList.bind(this);
		this.moveUp = this.moveUp.bind(this);
		this.moveDown = this.moveDown.bind(this);
		this.login = this.login.bind(this);
		this.save = this.save.bind(this);
		this.changeFromList = this.changeFromList.bind(this);
	}

	componentDidMount() {
		this.getPlaces();
	}

	// Hakee paikat ja niiden tiedot sovellukseen
	getPlaces() {
		$.ajax({
		url:"http://users.jyu.fi/~riherund/cgi-bin/VT7/flask.cgi/hae_paikat",
		dataType: "json",
		cache: true,
		success: function(data) {
			let places = data;
			this.setState({places: places});
			this.getLastPlace();
		}.bind(this),
			error: function(xhr, status, err) {
			console.log(status, err.toString());
		}.bind(this)
		});
	}
	
	// Hakee viimeksi katsotun paikan ja sessioon tallentuneen listauksen
	getLastPlace() {
		$.ajax({
		url:"http://users.jyu.fi/~riherund/cgi-bin/VT7/flask.cgi/viimeisin",
		dataType: "json",
		cache: true,
		success: function(data) {
			var place = data["place"];
			var station = data["station"];
			var viewed = data["viewedPlaces"];
			var coordinates = this.getCoordinates(place);
			this.setState( {selectedPlace: place, selectedStation: station, stationCoordinates: coordinates,
			selectedUrl: this.getUrl(place)} )
			this.setState({viewedPlaces: viewed});
			this.getWeatherInfo(station);
			this.getForecast(this.getUrl(place));
		}.bind(this),
			error: function(xhr, status, err) {
			console.log(status, err.toString());
		}.bind(this)
		});
	}

	// Hakee säätiedot valitulle paikalle
	getWeatherInfo(station, place) {

		$.ajax({
		url:"http://users.jyu.fi/~riherund/cgi-bin/VT7/flask.cgi/hae_saatiedot",
		type: "POST",
		data: {
			"station": station,
			"place": place,
			"viewedPlaces": JSON.stringify(this.state.viewedPlaces)
		},
		dataType: "json",
		cache: true,
		success: function(data) {
			this.setState({weatherInfo: data["weatherStations"][0]});
		}.bind(this),
			error: function(xhr, status, err) {
			console.log(status, err.toString());
		}.bind(this)
		});
	}
	
	// Hakee sääennusteen valitulle paikalle
	getForecast(url) {
		$.ajax({
		url:"http://users.jyu.fi/~riherund/cgi-bin/VT7/flask.cgi/hae_saaennuste",
		type: "POST",
		data: {
			"url": url
		},
		dataType: "json",
		cache: true,
		success: function(data) {
			let forecast = data;
			this.setState({forecast: forecast});
		}.bind(this),
			error: function(xhr, status, err) {
			console.log(status, err.toString());
		}.bind(this)
		});
	}
	
	// Hakee tietyn suureen säätiedoista
	getWeatherValue(valueName) {
		var value = "";
		for ( let i = 0; i < this.state.weatherInfo["sensorValues"].length; i++ ) {
			let sensor = this.state.weatherInfo["sensorValues"][i];
			if ( sensor["name"] == valueName ) {
				value = sensor["sensorValue"] + " " + sensor["sensorUnit"];
				break;
			}
		}
		if ( value != "" ) {
			return value;
		}
		return "n/a";
	}

	// Käsittelee valitun paikan vaihtamisen
	changeSelected(s) {
		this.setState({selectedPlace: s});
		for (let i = 0; i < this.state.places.length; i++) {
			if (s == this.state.places[i]["name"]) {
				let station = this.state.places[i]["station"];
				let coordinates = {"lat": this.state.places[i]["lat"],"lon": this.state.places[i]["lon"]};
				this.setState({selectedStation: station, stationCoordinates: coordinates, selectedUrl: this.getUrl(s)});
				this.addToList(s);
				this.getWeatherInfo(station, s);
				this.getForecast(this.getUrl(s));
			}
		}
	}

	// Käsittelee valitun paikan vaihtamisen kartasta saatujen koordinaattien perusteella
	changeByLatLon(lat, lon) {
		let shortest = Number.MAX_SAFE_INTEGER;
		for (let i = 0; i < this.state.places.length; i++) {
			let dist = this.distance(lat, lon, this.state.places[i]["lat"], this.state.places[i]["lon"]);
			if (dist < shortest) {
				shortest = dist;
				var place = this.state.places[i]["name"];
			}
		}
		this.changeSelected(place);
	}

	// Laskee etäisyyden kahden koordinaatin välillä, lähde: http://www.movable-type.co.uk/scripts/latlong.html
	distance(lat1, lon1, lat2, lon2) {

		var radians = function(degrees) {
  			return degrees * Math.PI / 180;
		};

		var R = 6371000;
		var latitude1 = radians(lat1);
		var latitude2 = radians(lat2);
		var d_latitude = radians(lat2-lat1);
		var d_longtitude = radians(lon2-lon1);
	
		var a = Math.sin(d_latitude/2) * Math.sin(d_latitude/2) + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(d_longtitude/2) * Math.sin(d_longtitude/2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	
		var d = R * c;

		return d;
	}
	
	// Selvittää koordinaatit valitulle paikalle
	getCoordinates(place) {
		for (let i = 0; i < this.state.places.length; i++) {
			if (place == this.state.places[i]["name"]) {
				let station = this.state.places[i]["station"];
				var coordinates = {"lat": this.state.places[i]["lat"],"lon": this.state.places[i]["lon"]};
			}
		}

	return coordinates;
	}
	
	// Selvittää url:n valitulle paikalle
	getUrl(place) {
		for (let i = 0; i < this.state.places.length; i++) {
			if (place == this.state.places[i]["name"]) {
				let station = this.state.places[i]["station"];
				var url = this.state.places[i]["url"];
			}
		}

	return encodeURI(url);
	}
	
	// Lisää paikan viimeksi katsottuje listaukseen
	addToList(place) {
		var newItems = this.state.viewedPlaces;
		newItems.unshift(place);
		this.setState({viewedPlaces: newItems});
	}

	// Poistaa alkion viimeksi katsottujen listauksesta
	removeFromList(i) {
		let list = this.state.viewedPlaces;
		list.splice(i,1);
		this.setState({viewedPlaces: list});
	}

	// Siirtää listassa olevaa alkiota ylös yhdellä
	moveUp(i) {
		if( i <= 0 ) return;
		let list = this.state.viewedPlaces;
		list.splice(i-1, 0, list.splice(i, 1)[0]);
		this.setState({viewedPlaces: list});
	}

	// Siirtää listassa olevaa alkiota alas yhdellä
	moveDown(i) {
		if( i >= (this.state.viewedPlaces.length - 1) ) return;
		let list = this.state.viewedPlaces;
		let item = this.state.viewedPlaces[i];
		list.splice(i, 1);
		list.splice((parseInt(i)+1), 0, item);
		this.setState({viewedPlaces: list});
	}

	// Käsittelee kirjautumisen
	login(user, viewed) {
		this.setState({logged: true, user: user});
		if (viewed != "") this.setState({viewedPlaces: viewed});
	}

	// Käsittelee listauksen tallentamisen palvelimelle
	save() {
		$.ajax({
		url:"http://users.jyu.fi/~riherund/cgi-bin/VT7/flask.cgi/tallenna",
		type: "POST",
		data: {
			"user": this.state.user,
			"viewedPlaces": JSON.stringify(this.state.viewedPlaces)
		},
		dataType: "json",
		success: function(data) {
			alert("Tallennus onnistui!");
		}.bind(this),
			error: function(xhr, status, err) {
			console.log(status, err.toString());
		}.bind(this)
		});
	}
	
	// Vaihtaa valitun paikan listasta tulleen klikkauksen perusteella
	changeFromList(name) {
		this.changeSelected(name);
	}

	render(){
		if (this.state.weatherInfo != "") {
		return (
			<div id="component">
				<div id="top">
				<LoginComponent login={this.login} logged={this.state.logged}
				save={this.save}/>
				<div id="weather-table">
				<PlaceSelect places={this.state.places} selectedPlace={this.state.selectedPlace}
				change = {this.changeSelected}/>
				<WeatherInfo airTemp= {this.getWeatherValue("ILMA")}
					roadTemp = {this.getWeatherValue("TIE_1")}
					groundTemp = {this.getWeatherValue("MAA_1")}
					windSpeed = {this.getWeatherValue("KESKITUULI")}
					windDir = {this.getWeatherValue("TUULENSUUNTA")}
					humidity = {this.getWeatherValue("ILMAN_KOSTEUS")}
					visibility = {this.getWeatherValue("NAKYVYYS")}
				/>
				</div>
				<MapComponent coordinates={this.state.stationCoordinates} change = {this.changeByLatLon}/>
				<ViewedList items={this.state.viewedPlaces} remove={this.removeFromList}
				up={this.moveUp} down={this.moveDown} change={this.changeFromList}/>
				</div>
				<div id="bot">
				<TemperatureChart forecast={this.state.forecast} url={this.state.selectedUrl}/>
				</div>
			</div>
		);
	}
		else return (<p></p>);
	}
}

// Komponentti joka hoitaa kirjautumisen ja tallentamisen
class LoginComponent extends React.Component{

	constructor(props) {
		super(props);
		
		this.state = {
		};

		this.handleLogin = this.handleLogin.bind(this);
		this.handleSave = this.handleSave.bind(this);
	}

	// Käsittelee kirjautumisen
	handleLogin() {
		$.ajax({
			asnyc: true,
			url: "/~riherund/cgi-bin/VT7/flask.cgi/kirjaudu",
			type: "POST",
			data: {
				"username": $( "#username" ).val(),
				"password": $( "#password" ).val()
			},
			dataType: "json",
			success: function(data) {
				if(data["success"] == 1) {
					this.props.login(data["user"], data["viewed"]["viewed"]);
				} else {
					alert("Salasana tai käyttäjätunnus oli väärin.");
				}
			}.bind(this),
			error: function(xhr, status, err) {
			console.log(status, err.toString());
			}
		});
	}

	// Käsittelee tallentamisen
	handleSave() {
		this.props.save();
	}

	render() {
		var content = "";
		if (!this.props.logged) {
			content = <div><label className="login-field"><input type="submit" id="login_button"
					onClick={this.handleLogin} value="Kirjaudu"/></label>
					<label className="login-field">Salasana: <input id="password" 
					type="password"/></label>
					<label className="login-field">Käyttäjätunnus: <input id="username"
					type="text"/></label></div>
		} else {
			content = <label className="login-field"><input type="submit" id="save_button"
					onClick={this.handleSave} value="Tallenna listaus"/></label>
		}

		return(
			<div id="login-bar">
				{content}	
			</div>
		);
	}
}

// Komponentti joka esittää Google Maps kartan
class MapComponent extends React.Component{
	
	componentWillReceiveProps() {
		this.updateMap();
	}
	
	componentDidMount() {
		this.initMap();
	}
	
	constructor(props) {
		super(props);
		
		this.state = {
			mapObject: ""
		};
		this.handleClick = this.handleClick.bind(this);
	}
	
	// Alustaa kartan
	initMap() {
		var geocoder;
		var latlng;
		
		// Geokoodaaja
		geocoder = new google.maps.Geocoder();
		// Jyväskylän koordinaatit
		latlng = new google.maps.LatLng(this.props.coordinates["lat"], this.props.coordinates["lon"]);
		// asetetaan kartan asetukset ja keskipisteeksi Jyväskylä
		var myOptions = {
			zoom: 13,
			center: latlng,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			zoomControl: true,
			mapTypeControl: true
		};

		var newMap = new google.maps.Map(document.getElementById("map"), myOptions);

		google.maps.event.addListener(newMap, 'dblclick', this.handleClick);

		this.setState( {mapObject: newMap} );
	}

	// Käsittelee kartan tuplaklikkauksen
	handleClick(event) {
		var lat = event.latLng.lat();
		var lon = event.latLng.lng();
		this.props.change(lat, lon);
	}

	// Päivittää kartan
	updateMap() {
		this.state.mapObject.setCenter(new google.maps.LatLng(this.props.coordinates["lat"], this.props.coordinates["lon"]) );
		this.state.mapObject.setZoom(13);
	}
	
	render() {
		return (
			<div id="map" style={{width:"400px",height:"400px",float:"left"}}></div>
		);
	}
	
}

// Esittää viimeksi katsotut paikat
class ViewedList extends React.Component{
	
	constructor(props) {
		super(props);	
		this.state = {
			
		};
		this.handleRemove = this.handleRemove.bind(this);
		this.handleDown = this.handleDown.bind(this);
		this.handleUp = this.handleUp.bind(this);
		this.handleClick = this.handleClick.bind(this);
	}
	
	componentWillReceiveProps(nextProps) {
	}
	
	componentDidMount() {
	}

	// Käsittelee alkion poiston
	handleRemove(event) {
		this.props.remove(event.target.id);
	}

	// Käsittelee alkion siirtämisen alaspäin
	handleDown(event) {
		this.props.down(event.target.id);
	}

	// Käsittelee alkion siirtämisen ylöspäin
	handleUp(event) {
		this.props.up(event.target.id);
	}

	// Käsittelee paikan valitsemisen listasta
	handleClick(event) {
		this.props.change(event.target.id);
	}
	
	render() {
		var viewed = [];
		for (let i = 0; i < this.props.items.length; i++) {
		    viewed.push(<li key={i} > 
				<div className="viewed_li">
				<span id={this.props.items[i]} onClick={this.handleClick}>{this.props.items[i]}</span>
				<div id={i} onClick={this.handleRemove}
				className="remove_icon" title="poista"/>
				<div id={i} onClick={this.handleDown} className="down_icon"/>
				<div id={i} onClick={this.handleUp} className="up_icon"/>				
				</div></li>);
		}

		return (
			<div id="viewed-list">
				<ul>
				{viewed}
				</ul>
			</div>
		);
	}
}

// Esittää viivakaavion sääennusteesta
class TemperatureChart extends React.Component{	
	
	constructor (props){
		super(props);
		this.state = {
			selected: mode.TEMP
		};
		this.changeSelected = this.changeSelected.bind(this);
	}
  
	componentDidMount() {
		this.draw(this.state.selected);
	}
	
	componentDidUpdate() {
		this.draw(this.state.selected);
	}
	
	// Käsittelee esitettävän suureen vaihdon
	changeSelected(e) {
		this.setState({selected: e});
		this.draw(e);
	}
	
	// Piirtää kaavion halutulla suureella
	draw(mode) {
		switch (mode) {
			case 0:
				this.drawChart( "Lämpötila", "°C", "temp");
				break;
			case 1:
				this.drawChart( "Tuulennopeus", "m/s", "ws");
				break;
			case 2:
				this.drawChart( "Ilmanpaine", "hPa", "press");
				break;
			default:
				this.drawChart( "asd", "°C", "temp");
		}
	}
	
	// ex: drawChart( Lämpötila, "°C", temp ) lämpötilakaavion piirtämiseksi
	drawChart(name, unit, shorthand) {
		
		var tempFormat = new google.visualization.NumberFormat({
			pattern: "# " + unit
			});
		
		var weatherData = [];
		weatherData[0] = ["Aika", name];
		for (let i = 1; (i <= this.props.forecast.length) && (i < 20) ; i++) {
			let id = i - 1
			weatherData[i] = [this.formatTime(this.props.forecast[id]["time"]), 
				parseFloat(this.props.forecast[id][shorthand])];
		}
		
        var data = new google.visualization.arrayToDataTable(weatherData);
		
        // Set chart options
        var options = {"title":"Sääennuste",
						vAxis: {format:"# " + unit},
						hAxis : { 
							textStyle : {
								fontSize: 9 // or the number you want
							}
						},
						"colors": ["red", "red"],
                        "width":800,
                        "height":400,
						"backgroundColor": { fill:'transparent' }};
		
		tempFormat.format(data, 1); // Apply formatter to second column
		
        // Instantiate and draw our chart, passing in some options.
        var chart = new google.visualization.LineChart(document.getElementById("chart-div"));
        chart.draw(data, options);
	}
	
	// Formatoi ajan hyvään muotoon
	formatTime(t) {
		var weekdays = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"]
		var date = new Date(t);
		var dayNumber = date.getDay();
		return weekdays[dayNumber] + " " + t.substr(11,2);
	}
	
	render() {
		return(
			<div id="chart">
				<div id="chart-div" style={{width: "800px", height: "400px", float: "left"}}></div>
				<ModeSelect change = {this.changeSelected}/>
				<a id="credit-link" href={this.props.url.substr(0, this.props.url.length - 10)}>
				"Vêrvarsel frå Yr, levert av NRK og Meteorologisk institutt"</a>

			</div>
		);
	}
}

// Alasvetovalikko, josta voi valita minkä suureen viivakaavio esittää
class ModeSelect extends React.Component {
	
	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
	}
	
	// Käsittelee valinnan vaihdon
	handleChange(e) {
		this.props.change(parseInt(e.target.value));
	}
	
	render() {	
		return (
			<div id="mode-select">
			<label>Valitse näytettävä suure<select onChange={this.handleChange}>
				<option value={mode.TEMP}>Lämpötila</option>
				<option value={mode.WIND}>Tuulennopeus</option>
				<option value={mode.PRESS}>Ilmanpaine</option>
			</select></label>
			</div>
		);
	}
}

// Display modes for linechart
var mode = {
		TEMP: 0,
		WIND: 1,
		PRESS: 2
	};

//Load the Visualization API and the corechart package.
google.charts.load("current", {"packages":["corechart"]});

// Renderöidään vasta kun charts api on latautunut
google.charts.setOnLoadCallback(init);

function init() {
	ReactDOM.render(
	<WeatherComponent/>,
	document.getElementById("root")
);
}

init();









