/*
 * 
*Things that would be nice to do, or might suck:
* 
*1: Add in persistent data storage - Google Fusion Tables? MongoDB? Something with easy js API.
*2: Add ability for individual room members to save custom data - like zoai love, 
*3: do something about "special characters" cause ttfm seems to render them funny
*4: Refactor speak commands as objects for easier enumeration of properties / methods 
*/

var Bot     = require('ttapi');
var request = require('request');
var repl    = require('repl');

//set the authentication details in a file that 
//doesn't get uploaded to github
var AUTH   = require('./details.js').auth();
var USERID = require('./details.js').userid();
var ROOMID = require('./details.js').roomid();
var lastfmkey = require('./details.js').lastfmkey();

var bot = new Bot(AUTH, USERID, ROOMID);

//set up some global variables
var playing;
var userlist = [];

//this would be perfect for persistent storage 
var goodBands = [
		"The Who",
		"Jethro Tull",
		"Modest Mouse",
		"Das Racist"];

//init upon enter the room
bot.on('roomChanged', function(data) {
	userlist = data.users;
	//set the crruent playing song data in global variable
	playing  = {"artist": data.room.metadata.current_song.metadata.artist, 
				"song"  : data.room.metadata.current_song.metadata.song, 
				"album" : data.room.metadata.current_song.metadata.album}; 
	});

bot.on('newsong', function (data) {
	//set the crruent playing song data in global variable
	playing = { "artist": data.room.metadata.current_song.metadata.artist, 
				"song"  : data.room.metadata.current_song.metadata.song, 
				"album" : data.room.metadata.current_song.metadata.album};
	
	var response = [
		"Man i freaking love " + playing.artist ,
		"I saw " + playing.artist + " before they drown in their own vomit"];

	if (goodBands.indexOf(playing.artist) >= 0){
		bot.speak(response[Math.floor(Math.random() * response.length).toString()]);
		}
	});


//new user enters the room. Add them to list of users and greet them
bot.on('registered', function (data) {
	userlist.push(data.user[0].name);
	if (data.user[0].name != "@c4leb"){
		bot.speak('Welcome '+  data.user[0].name + ' all your music is belong to code4lib')}
	});
	

//take 'em off the list'
bot.on('unregistered', function (data) {
	userlist.splice(userlist.indexOf(data.user[0].name));
	});



//define commands you can say to c4leb 
var options = {
			"who"   :{"call":"/who",   "help":"Here's how to use it"},
			"define":{"call":"/define","help":"Here's how to use it"},
			"artist":{"call":"/artist","help":"Here's how to use it"},
			"song"  :{"call":"/song",  "help":"Here's how to use it"}
			};	


bot.on('speak', function (data) {
if (data.name != "@noamchomsky666"){	
	//define options for each command to the bot 			
	text =  data.text.split(' ');
	switch(text[0]){
		case "/who":
			who = userlist[Math.floor(Math.random() * userlist.length)].name;
			bot.speak(who + ' ' + text.slice(1).join(' '));
			break; 
			
		case "/hi":
			bot.speak('Whats up '+data.name+' ?');
			break;
		
		case "/define": //get a definition from wordnik. Just grab the first one.
			lookup = 'http://api.wordnik.com/v4/word.json/' + encodeURIComponent(text.slice(1).join(' '))
				+ '/definitions?includeRelated=false&includeTags=false&limit=75&sourceDictionaries=all'
				+ '&useCanonical=true&api_key=b4c023927de28ebe1643f9c7ed80594340d0fb9fe771b2869';
			request(lookup, function (error, response, body) { 
						if(!error && response.statusCode == 200) {
						var formatted = JSON.parse(body);
						bot.speak(formatted[0].text); // just grabbing the first defiition - maybe loop through all defs? 
						} });
			break;
			
		case '/help':
			if (text.length === 1){
				var helpOptions = [];
				for (var option in options){
					helpOptions.push(options[option].call);
				}
				bot.speak(data.name + ': ' + helpOptions.join(' | '));
			}
			else{
				bot.speak(options[text[1]].help);
			}
			break;
			
		case "/artist":
			switch(text[1]){
				// for variable commands on artist
				case 'info': //meh - doesn't play nice with html tags. maybe some serverside jquery innerHtml magic?
				console.log(playing.artist);
				request('http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist='
					+ encodeURIComponent(playing.artist) 
					+ '&api_key='+ lastfmkey + '&format=json', 
					function (error, response, body){ //now parse the response
						if(!error && response.statusCode == 200) {
							info = JSON.parse(body);
							bot.speak(info.artist.bio.summary);
				}
				else{bot.speak("Don't seem to ahev any info on " + playing.artist + " right now.")}
				 });
				break; 
				
				case 'similar':
				var similar = [];
				console.log(playing.artist);
				request('http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist='
					+ encodeURIComponent(playing.artist) 
					+ '&api_key='+ lastfmkey + '&format=json&limit=5', 
					function (error, response, body){ //now parse the response
						if(!error && response.statusCode == 200) {
							sim = JSON.parse(body);
							for (artist in sim.similarartists.artist){
								similar.push(sim.similarartists.artist[artist].name 
								+ ' - http://' + sim.similarartists.artist[artist].url);		
							}
							bot.speak(similar.join(' | ') );
						}
						else
						{bot.speak("Don't seem to ahev any info on " + playing.artist + " right now.")}
					});
			}
			break;
			
			case options.song.call:
				switch(text[1]){
				// for variable commands on artist
				case 'info': //meh - doesn't play nice with html tags. maybe some serverside jquery innerHtml magic?
				console.log(playing.song);
				request('http://ws.audioscrobbler.com/2.0/?method=track.getinfo&artist='
					+ encodeURIComponent(playing.artist) 
					+ '&track=' + encodeURIComponent(playing.song)
					+ '&api_key='+ lastfmkey + '&format=json', 
					function (error, response, body){ //now parse the response
						if(!error && response.statusCode == 200) {
							info = JSON.parse(body);
							 if (info.track.wiki != 'undefined'){ 
							 	bot.speak(info.track.wiki.summary);}
							else {bot.speak('You know as much asI do, mate');}
				}
				else{bot.speak("Don't seem to ahev any info on " + playing.song + " right now.")}
				 });
				break; 
				
				case 'similar':
				var similar = [];
				console.log(playing.song);
				request('http://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist='
					+ encodeURIComponent(playing.artist)
					+ '&track=' + encodeURIComponent(playing.song) 
					+ '&api_key='+ lastfmkey + '&format=json&limit=5', 
					function (error, response, body){ //now parse the response
						if(!error && response.statusCode == 200) {
							sim = JSON.parse(body);
							for (track in sim.similartracks.track){
								similar.push(sim.similartracks.track[track].name
								+ ' by ' + sim.similartracks.track[track].artist.name
								+ ' - http://' + sim.similartracks.track[track].url);		
							}
							bot.speak(similar.join(' | ') );
						}
						else
						{bot.speak("Don't seem to ahev any info on " + playing.song + " right now.")}
					});
					break;
			}
			break;	 	
		default:
			pass;
   		}
   	}
	});

