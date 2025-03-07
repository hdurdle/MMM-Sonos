/* Magic Mirror
 * Module: MagicMirror-Sonos-Module
 *
 * By Christopher Fenner https://github.com/CFenner
 * MIT Licensed.
 */
 Module.register('MMM-Sonos', {
	defaults: {
		showStoppedRoom: true,
		showAlbumArt: true,
		showRoomName: true,
		animationSpeed: 1000,
		updateInterval: 0.5, // every 0.5 minutes
		artBase: '',
		apiBase: 'http://localhost',
		apiPort: 5005,
		apiEndpoint: 'zones',
 		exclude: []
	},
	roomList: [],
	start: function() {
		Log.info('Starting module: ' + this.name);
		this.update();
		// refresh every x minutes
		setInterval(
			this.update.bind(this),
			this.config.updateInterval * 60 * 1000);
	},
	update: function(){
		this.sendSocketNotification(
			'SONOS_UPDATE',
			this.config.apiBase + ":" + this.config.apiPort + "/" + this.config.apiEndpoint);
	},
	getRoomName: function(room){
		var roomList = [];
		if(room.members.length > 1){
			room.members.forEach(function (member) {
				if (!this.isRoomExcluded(member.roomName))
					roomList.push(member.roomName);
                        }.bind(this));
                }else{
			if (!this.isRoomExcluded(room.coordinator.roomName))
				roomList.push(room.coordinator.roomName);
                }
		return roomList.join(', ');
	},
	isRoomExcluded: function(roomName){
		var state = this.config.exclude.indexOf(roomName) !== -1;
		return state;
	},
	isInTVMode: function(artist, track, cover){
                // if Sonos Playbar is in TV mode, no title is provided and therefore the room should not be displayed
                var state = (artist && artist.length) == 0
                	&& (track && track.length) == 0
                        && (cover && cover.length) == 0;
		return state;
	},
	updateRoomList: function(data){
		var roomList = [];
		data.forEach(function (item) {
			var roomName = this.getRoomName(item);
			if(roomName !== ''){
				var currentTrack = item.coordinator.state.currentTrack;
				var artist = currentTrack.artist;
				var track = currentTrack.title;
				var cover = currentTrack.albumArtUri;
//				var streamInfo = currentTrack.streamInfo;
//				var type = currentTrack.type;

				// clean data
        artist = artist?artist.trim():'';
        track = track?track.trim():'';
        cover = cover?cover.trim():'';
        track = track == currentTrack.uri?'':track;
				cover = cover?cover:currentTrack.absoluteAlbumArtUri;
        cover = cover.startsWith('/getaa')?this.config.artBase+cover:cover;

        roomList.push({
          'name': roomName,
          'state': this.isInTVMode(artist, track, cover)?'TV':item.coordinator.state.playbackState,
          'artist': artist,
          'track': track,
          'albumArt': cover,
        });
			}
		}.bind(this));
		this.loaded = true;
		if (JSON.stringify(this.roomList) === JSON.stringify(roomList)){
			return;
		}
		this.roomList = roomList;
		this.updateDom(this.config.animationSpeed);
	},
	getStyles: function() {
		return [`${this.name}.css`];
	},
	getTemplate: function() {
		return `${this.name}.njk`;
	},
	getTemplateData: function() {
		return {
			flip: this.data.position.startsWith('left'),
			loaded: this.loaded,
			showAlbumArt: this.config.showAlbumArt,
			showRoomName: this.config.showRoomName,
			showStoppedRoom: this.config.showStoppedRoom,
			roomList: this.roomList,
		};
	},
	socketNotificationReceived: function(notification, payload) {
		if (notification === 'SONOS_DATA') {
        		Log.debug('received SONOS_DATA');
			this.updateRoomList(payload);
      		}
  	}
});
