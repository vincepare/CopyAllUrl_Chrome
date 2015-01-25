/**
* Gére l'accès au presse papier
* (on est obligé de passer par la background page pour y accéder, cf: http://stackoverflow.com/questions/6925073/copy-paste-not-working-in-chrome-extension)
*/
Clipboard = {
	/**
	* Ecrit la chaîne passée en paramètre dans le presse papier (fonction "Copier")
	*
	* On a pas accès au presse papier via l'API Google Chrome,
	* donc l'astuce consiste à placer le texte à copier dans un <textarea>,
	* de sélectionner tout le contenu de ce <textarea>, et de copier.
	*
	* @param String str Chaîne à copier dans le presse-papier
	* @param Bool extended_mime Indique si on doit copier le type MIME text/html en plus du texte brut
	*/
	write: function(str, extended_mime){
		if(str == '' || str == undefined){
			str = '<empty>';
		}
		
		// Copie par défaut, via le clipboardBuffer
		clipboardBuffer.val(str);
		clipboardBuffer.select();
		
		// Copie via l'API (clipboardData)
		var oncopyBackup = document.oncopy;
		document.oncopy = function(e){
			// Si on n'utilise pas le type MIME html, on sort tout de suite pour laisser la main à la méthode par défaut : clipboardBuffer
			if( typeof extended_mime == "undefined" || extended_mime != true ){
				return;
			}
			e.preventDefault();
			e.clipboardData.setData("text/html", str);
			e.clipboardData.setData("text/plain", str);
		};
		document.execCommand('copy');
		document.oncopy = oncopyBackup;
	},
	
	/**
	* Retourne le contenu du presse papier (String)
	*/
	read: function(){
		clipboardBuffer.val('');
		clipboardBuffer.select();
		document.execCommand('paste')
		return clipboardBuffer.val();
	}
};

/**
* Objet qui gère les actions (clic sur liens de fonctionnalités dans popup.html)
*/
Action = {
	/**
	* Copie les URLs de la fenêtre passé en paramètre dans le presse papier
	* @param opt.window  : fenêtre dont on copie les URL
	* @param opt.gaEvent : données nécessaires à la génération le l'event ga (action, label, actionMeta)
	*/
	copy: function(opt){
		// Par défaut, on récupère tous les onglets de la fenêtre opt.window
		var tabQuery = {windowId: opt.window.id};
		
		// Si "Copy tabs from all windows" est coché, suppression du filtre sur fenêtre courante
		try {
			if (localStorage["walk_all_windows"] == "true") {
				tabQuery.windowId = null;
			}
		} catch(ex) {}
		
		chrome.tabs.query(tabQuery, function(tabs){
			// Récupération configuration
			var format = localStorage['format'] ? localStorage['format'] : 'text';
			var highlighted_tab_only = localStorage['highlighted_tab_only'] == 'true' ? true : false;
			var extended_mime = typeof localStorage['mime'] != 'undefined' && localStorage['mime'] == 'html' ? true : false;
			var outputText = '';
			
			// Filtrage des onglets
			var tabs_filtered = [];
			for (var i=0; i < tabs.length; i++) {
				if( highlighted_tab_only && !tabs[i].highlighted ) continue;
				tabs_filtered.push(tabs[i]);
			}
			tabs = tabs_filtered;
			
			// Génération des données copiées
			if( format == 'html' ){
				outputText = CopyTo.html(tabs);
			} else if( format == 'custom' ) {
				outputText = CopyTo.custom(tabs);
			} else if( format == 'json' ) {
				outputText = CopyTo.json(tabs);
				extended_mime = false;
			} else {
				outputText = CopyTo.text(tabs);
				extended_mime = false;
			}
			
			// Copie la liste d'URL dans le presse papier
			Clipboard.write(outputText, extended_mime);
			
			// Indique à la popup le nombre d'URL copiées, pour affichage dans la popup
			chrome.runtime.sendMessage({type: "copy", copied_url: tabs.length});
			
			// Tracking event
			_gaq.push(['_setCustomVar', 3, 'ActionMeta', opt.gaEvent.actionMeta]);
			_gaq.push(['_trackEvent', 'Action', opt.gaEvent.action, opt.gaEvent.label, tabs.length]);
		});
	},
	
	/**
	* Ouvre toutes les URLs du presse papier dans des nouveaux onglets
	* @param opt.gaEvent : données nécessaires à la génération le l'event ga (action, label, actionMeta)
	*/
	paste: function(opt){
		var clipboardString = Clipboard.read();
		
		// Extraction des URL, soit ligne par ligne, soit intelligent paste
		if( localStorage["intelligent_paste"] == "true" ){
			var urlList = clipboardString.match(/(https?|ftp|ssh|mailto):\/\/[a-z0-9\/:%_+.,#?!@&=-]+/gi);
		} else {
			var urlList = clipboardString.split("\n");
		}
		
		// Si urlList est vide, on affiche un message d'erreur et on sort
		if (urlList == null) {
			chrome.runtime.sendMessage({type: "paste", errorMsg: "No URL found in the clipboard"});
			return;
		}
		
		// Extraction de l'URL pour les lignes au format HTML (<a...>#url</a>)
		$.each(urlList, function(key, val){
			var matches = val.match(new RegExp('<a[^>]+href="([^"]+)"', 'i'));
			try{
				urlList[key] = matches[1];
			} catch(e){}
			
			urlList[key] = jQuery.trim(urlList[key]);
		});
		
		// Suppression des URLs non conformes
		urlList = urlList.filter(function(url){
			if( url == "" || url == undefined ){
				return false;
			}
			return true;
		});
		
		// Ouverture de toutes les URLs dans des onglets
		$.each(urlList, function(key, val){
			chrome.tabs.create({url: val});
		});
		
		// Indique à la popup de se fermer
		chrome.runtime.sendMessage({type: "paste"});
		
		// Tracking event
		_gaq.push(['_setCustomVar', 3, 'ActionMeta', opt.gaEvent.actionMeta]);
		_gaq.push(['_trackEvent', 'Action', opt.gaEvent.action, opt.gaEvent.label, urlList.length]);
	}
};

/**
* Fonctions de copie des URL dans une chaîne de caractères
*/
CopyTo = {
	// Copie les URLs des onglets au format html
	html: function(tabs){
		var anchor = localStorage['anchor'] ? localStorage['anchor'] : 'url';
		var row_anchor = '';
		var s = '';
		for (var i=0; i < tabs.length; i++) {
			row_anchor = tabs[i].url;
			if( anchor == 'title' ){
				try{
					Encoder.EncodeType = "entity";
					row_anchor = Encoder.htmlEncode(tabs[i].title);
				} catch(ex){
					row_anchor = tabs[i].title;
				}
			}
			s += '<a href="'+tabs[i].url+'">'+row_anchor+'</a><br/>';
			s = s + "\n";
		}
		return s;
	},
	
	// Copie les URLs des onglets au format custom
	custom: function(tabs){
		var template = (localStorage['format_custom_advanced'] && localStorage['format_custom_advanced'] != '') ? localStorage['format_custom_advanced'] : null;
		if( template == null ){
			return 'ERROR : Row template is empty ! (see options page)';
		}
		var s = '';
		for (var i=0; i < tabs.length; i++) {
			var current_row   = template;
			var current_url   = tabs[i].url;
			var current_title = tabs[i].title;
			
			// Encodage (html entities) du title
			// try{
				// Encoder.EncodeType = "entity";
				// current_title = Encoder.htmlEncode(current_title);
			// } catch(ex){}
			
			// Injection des variables dans le template
			current_row = current_row.replace(/\$url/gi, current_url);
			current_row = current_row.replace(/\$title/gi, current_title);
			
			s += current_row;
		}
		return s;
	},
	
	// Copie les URLs des onglets au format texte
	text: function(tabs){
		var s = '';
		for (var i=0; i < tabs.length; i++) {
			s += tabs[i].url;
			s = s + "\n";
		}
		return s;
	},
	
	// Copie les URLs des onglets au format JSON
	json: function(tabs){
		var data = [];
		for (var i=0; i < tabs.length; i++) {
			data.push({url: tabs[i].url, title: tabs[i].title});
		}
		return JSON.stringify(data);
	}
};

/**
* Raccourci clavier
*/
chrome.commands.onCommand.addListener(function(command){
	switch(command){
		case "copy":
			var gaEvent = {
				action: 'Copy',
				label: 'Command',
				actionMeta: AnalyticsHelper.getActionMeta("copy")
			};
			chrome.windows.getCurrent(function(win){
				Action.copy({window: win, gaEvent: gaEvent});
			});
			break;
		case "paste":
			var gaEvent = {
				action: 'Paste',
				label: 'Command',
				actionMeta: AnalyticsHelper.getActionMeta("paste")
			};
			Action.paste({gaEvent: gaEvent});
			break;
	}
});

/**
* Update notification
*/
UpdateManager = {
	/** Informaion remplie par le callback runtime.onInstalled */
	runtimeOnInstalledStatus: null,
	
	/** (bool) Indique si une mise à jour de l'extension a eu lieu récemment */
	recentUpdate: function(){
		try {
			var timeDiff = new Date().getTime() - new Date(parseInt(localStorage['update_last_time'])).getTime();
			if (timeDiff < 1000*3600*24) {
				return true;
			}
		} catch (ex) {}
		return false;
	},
	
	/** Défini le badge si une mise à jour a eu lieu récemment */
	setBadge: function(){
		if (!UpdateManager.recentUpdate()) {
			chrome.browserAction.setBadgeText({text: ''});
			return;
		}
		chrome.browserAction.setBadgeText({text: 'NEW'});
	}
};
UpdateManager.setBadge();
chrome.runtime.onInstalled.addListener(function(details){
	if (details.reason != 'update') {
		UpdateManager.runtimeOnInstalledStatus = "Not an update ("+details.reason+")"
		return;
	}
	
	if (details.previousVersion == chrome.runtime.getManifest().version) {
		UpdateManager.runtimeOnInstalledStatus = "Same version ("+details.previousVersion+")";
		return;
	}
	
	// Mémorisation date de la dernière mise à jour
	localStorage['update_last_time'] = new Date().getTime();
	localStorage['update_previous_version'] = details.previousVersion;
	UpdateManager.runtimeOnInstalledStatus = "Updated";
	
	// Mise à jour badge
	UpdateManager.setBadge();
	
	// Tracking event
	_gaq.push(['_trackEvent', 'Lifecycle', 'Update', details.previousVersion]);
	
	// Affichage de la notification
	chrome.notifications.create("cpau_update_notification", {
		type: "basic",
		title: "Copy All Urls updated",
		message: "New version installed : " + chrome.runtime.getManifest().version + ". Click to see new features.",
		iconUrl: "img/umbrella_128.png"
	}, function(notificationId){});
	chrome.notifications.onClicked.addListener(function(notificationId){
		if (notificationId == "cpau_update_notification") {
			_gaq.push(['_trackEvent', 'Internal link', 'Notification', 'http://finalclap.github.io/CopyAllUrl_Chrome/']);
			chrome.tabs.create({url: 'http://finalclap.github.io/CopyAllUrl_Chrome/'});
		}
	});
});

/**
* Fonctions utilitaires web analytics
*/
AnalyticsHelper = {
	/** Fonction qui récupère la clé de l'extension, pour récupérer des infos dessus (comme sa version) */
	getChromeExtensionKey: function(){
		var url = chrome.extension.getURL('stop');
		var matches = chrome.extension.getURL('stop').match(new RegExp("[a-z0-9_-]+://([a-z0-9_-]+)/stop","i"));
		return (matches[1] == undefined) ? false : matches[1];
	},
	
	/** Retourne une chaîne de caractère (objet json serialisé) qui contient des informations sur la configuration du plugin */
	getShortSettings: function(settings){
		if (settings == undefined) {
			settings = localStorage;
		}
		
		var shortSettings = {
			fm: localStorage['format'] ? localStorage['format'] : 'text',
			an: localStorage['anchor'] ? localStorage['anchor'] : 'url',
			da: localStorage['default_action'] ? localStorage['default_action'] : "menu",
			mm: localStorage['mime'] ? localStorage['mime'] : 'plaintext',
			hl: localStorage['highlighted_tab_only'] == "true" ? 1 : 0,
			ip: localStorage['intelligent_paste'] == "true" ? 1 : 0,
			ww: localStorage['walk_all_windows'] == "true" ? 1 : 0
		};
		
		return AnalyticsHelper.serialize(shortSettings);
	},
	
	/** Retourne un extrait de configuration pour le tracking des events de catégorie Action */
	getActionMeta: function(action){
		switch(action){
			case "copy":
				var shortSettings = {
					fm: localStorage['format'] ? localStorage['format'] : 'text',
					an: localStorage['anchor'] ? localStorage['anchor'] : 'url',
					mm: localStorage['mime'] ? localStorage['mime'] : 'plaintext',
					hl: localStorage['highlighted_tab_only'] == "true" ? 1 : 0,
					ww: localStorage['walk_all_windows'] == "true" ? 1 : 0
				};
				break;
			case "paste":
				var shortSettings = {
					ip: localStorage['intelligent_paste'] == "true" ? 1 : 0
				};
				break;
		}
		return AnalyticsHelper.serialize(shortSettings);
	},
	
	/** Serialise un objet pour transmission à ga. data doit être un tableau (array ou object) */
	serialize: function(data){
		var chunks = [];
		for (var i in data) {
			chunks.push(i+":"+data[i]);
		}
		var serialized = chunks.join(",");
		return serialized;
	},
	
	/** Charge google analytics (ga.js) dans le document passé en paramètre */
	gaLoad: function(doc){
		var ga = doc.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
		ga.src = 'https://ssl.google-analytics.com/ga.js';
		var s = doc.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
	},
	
	/** Identifiant du compte google analytics */
	gaAccount: 'UA-30512078-5'
};

// Chargement google analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', AnalyticsHelper.gaAccount]);
_gaq.push(['_setCustomVar', 1, 'Version', chrome.runtime.getManifest().version, 2]);
_gaq.push(['_setCustomVar', 2, 'Settings', AnalyticsHelper.getShortSettings(), 2]);
_gaq.push(['_trackPageview']);
AnalyticsHelper.gaLoad(document);

jQuery(function($){
	// Au chargement de la page, on créé une textarea qui va servir à lire et à écrire dans le presse papier
	clipboardBuffer = $('<textarea id="clipboardBuffer"></textarea>');
	clipboardBuffer.appendTo('body');
});