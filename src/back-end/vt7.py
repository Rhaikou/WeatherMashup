# -*- coding: utf-8 -*-

# Author: Riku Rundelin

from flask import Flask, session, redirect, url_for, escape, request, Response, render_template, make_response
import urllib2
import logging
import os
try:
	import simplejson as json
except:
	import json
import math
import sys
from xml.dom.minidom import parse
from lxml import etree
import hashlib

app = Flask(__name__)
app.secret_key = # Salainen avain
app.debug = True

# Etäisyyksien laskemista varten, lähde: http://www.movable-type.co.uk/scripts/latlong.html
def calculate_distance(lat1, lon1, lat2, lon2):
	R = 6371e3
	latitude1 = math.radians(lat1)
	latitude2 = math.radians(lat2)
	d_latitude = math.radians(lat2-lat1)
	d_longtitude = math.radians(lon2-lon1)
	
	a = math.sin(d_latitude/2) * math.sin(d_latitude/2) + math.cos(latitude1) * math.cos(latitude2) * math.sin(d_longtitude/2) * math.sin(d_longtitude/2)
	c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
	
	d = R * c
	
	return d

# Haetaan sääennuste annetusta url:sta
@app.route("/hae_saaennuste", methods=["POST","GET"])
def get_forecast():
	# Selvitetään postattu parametri
	try:
		url = request.values["url"]
	except:
		url = "https://www.yr.no/stad/Finland/V%C3%A4stra_Finland/Jyv%C3%A4skyl%C3%A4/varsel.xml"
	# Avataan dokumentti
	doc = urllib2.urlopen(url).read(100000)
	# Luodaan etree
	root = etree.fromstring(doc)
	# Etsitään puusta elementit jotka pitävät sisällään säätiedot
	times = [ t for t in root.iterfind(".//time") ]
	# Tehdään lsita johon heitetään ajat ja säätiedot
	winfo = []
	for t in times:
		time = t.get("from")
		temperature = t.find("temperature").get("value")
		pressure = t.find("pressure").get("value")
		wind_speed = t.find("windSpeed").get("mps")
		winfo.append( dict( time = time, temp = temperature, press = pressure, ws = wind_speed ) )
	resp = make_response( json.dumps(winfo) )
	resp.charset = "UTF-8"
	resp.mimetype = "application/json"
	return resp

# Ei käytössä
@app.route("/")
def default():
	return "hello"

# Haetaan sessiosta viimeksi katsottu paikka ja listaus, defaultataan Jyväskylään
@app.route("/viimeisin", methods=["POST","GET"])
def get_last():
	try:
		info = {"place": session["last_place"], "station": session["last_station"]}
	except:
		info = {"place": "Jyväskylä", "station": "9014"}
	try:
		info["viewedPlaces"] = session["viewed_places"]
	except:
		info["viewedPlaces"] = []
	try:
		resp = make_response( json.dumps(info) )
	except:
		resp = ""
	resp.charset = "UTF-8"
	resp.mimetype = "application/json"
	return resp
	
# Hakee paikkakunnat tiedostosta
@app.route("/hae_paikat", methods=["POST","GET"])
def get_places():
	
	# Luetaan tiedosto
	data = urllib2.urlopen("http://appro.mit.jyu.fi/web-sovellukset/vt/vt7/verda.txt").read(100000).decode("UTF-8")
	# Splitataan rivinvaihdoista
	data = data.split("\n")
	
	places = []
	prev = ""
	
	# Käydään läpi tiedoston rivit
	for line in data:
		# Splitataan rivi
		d = line.split("\t")
		# Listäään paikkakuntiin suomalaiset paikat ja skipataan duplikaatit
		if d[0] == "FI" and d[3] != prev:
			places.append( dict( name = d[3], lat = d[12], lon = d[13], station="", url = d[15] ) )
			prev = d[3]
		
	# Järjestetään paikkakunnat
	places = sorted(places, key=lambda k: k["name"])
		
	# Haetaan sääasemat
	resp = urllib2.urlopen("https://tie.digitraffic.fi/api/v1/metadata/weather-stations")
	# Puretaan json
	station_data = json.loads(resp.read())
	stations = station_data["features"]
	
	# Etstitään lähimmät asemat
	for p in places:
		shortest = sys.maxint
		for s in stations:
			distance = calculate_distance(float(p["lat"]), float(p["lon"]), float(s["geometry"]["coordinates"][1]), float(s["geometry"]["coordinates"][0]))
			if distance < shortest:
				shortest = distance
				p["station"] = s["id"]
	
	resp = make_response( json.dumps(places) )
	resp.charset = "UTF-8"
	resp.mimetype = "application/json"
	return resp

# Hakee sääaseman tiedot
@app.route("/hae_saatiedot", methods=["POST","GET"])
def get_weather():
	# Selvitetään postattu parametri
	try:
		station = request.values["station"]
		session["last_station"] = station
	except:
		station = 9014
	try:
		place = request.values["place"]
		session["last_place"] = place
	except:
		place = "Jyväskylä"
	try:
		viewed_places = json.loads(request.values["viewedPlaces"])
		session["viewed_places"] = viewed_places
	except:
		viewedPlaces = []
	# Haetaan sääaseman tiedot
	resp = urllib2.urlopen("https://tie.digitraffic.fi/api/v1/data/weather-data/" + station)
	station_data = json.loads(resp.read())
	resp = make_response( json.dumps(station_data) )
	resp.charset = "UTF-8"
	resp.mimetype = "application/json"
	return resp

# Tarkistaa sovellukseen kirjautumisen ja lähettää tallennetun listauksen
@app.route('/kirjaudu', methods=['POST','GET'])
def login():
	try:
		username = request.form['username']
		password = request.form['password']
		
	except:
		username = ""
		password = ""
	try:
		data = json.load(open('viewed.txt'))
	except:
		data = ""
	err = {'user':"", 'pass':"", 'success':0, 'viewed':""}
	m = hashlib.sha512()
	key = # salausavain
	m.update(key)
	m.update(password)
	right_pass = #salattu salasana
	# Tarkistetaan annetiinko oikeat tiedot
	if username == #username
	 and m.digest() == right_pass:
		err['success'] = 1
		err['user'] = username
		err['viewed'] = data
	# Tarkistetaan oliko virhe käyttäjätunnuksessa
	if username != #username
	:
		err['user'] = u'Käyttäjätunnusta ei löytynyt'
		err['success'] = 0
	# Tarkistetaan oliko virhe salasanassa
	if username == #username
	 and m.digest() != right_pass:
		err['pass'] = u'Salasana oli väärä'
		err['success'] = 0
	resp = make_response( json.dumps(err) )
	resp.charset = "UTF-8"
	resp.mimetype = "application/json"
	return resp

# Tallentaa listauksen tiedostoon
@app.route('/tallenna', methods=['POST','GET'])
def save():
	try:
		viewed_places = json.loads(request.values["viewedPlaces"])
		session["viewed_places"] = viewed_places
		user = request.values["user"]
		data = json.dumps(dict(user = user, viewed = viewed_places))
		with open("viewed.txt", "w") as f:
			f.write(data)
		resp = make_response( json.dumps(dict(status = "ok")) )
		resp.charset = "UTF-8"
		resp.mimetype = "application/json"
		return resp
	except:
		resp = make_response( json.dumps(dict(status = "failed")) )
		resp.charset = "UTF-8"
		resp.mimetype = "application/json"
		return resp

if __name__ == "__main__":
	app.debug = True
	app.run(debug=True)
