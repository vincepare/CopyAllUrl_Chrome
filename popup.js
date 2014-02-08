bkg = chrome.extension.getBackgroundPage(); // Récupération d'une référence vers la backgroundpage

// Affichage du nombre d'URL copiées, message envoyé par la background page
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
	if(typeof request.copied_url != 'number') return; // Test si il s'agit bien d'un message de bkg.Action.copy
	var nombre = (request.copied_url > 1) ? 's' : '';
	jQuery('#message').html("<b>"+request.copied_url+"</b> url"+nombre+" successfully copied !");
	setTimeout(function(){window.close();}, 3000); // Fermeture de la popup quelques secondes après affichage du message
});

/**
* Gestion des boutons de la popup
*/
jQuery(function($){
	$('#actionCopy').click(function(e){
		// On récupére la fenêtre courante
		chrome.windows.getCurrent(function(win){
			bkg.Action.copy(win);
		});
	});
	$('#actionPaste').click(function(e){
		bkg.Action.paste();
		window.close();
	});
	$('#actionOption').click(function(e){
		chrome.tabs.create({url: 'options.html'});
	});
	
	// Default action
	var default_action = localStorage['default_action'] ? localStorage['default_action'] : "menu";
	if( default_action != "menu" ){
		// Masquage des boutons
		$('body>ul').hide();
		$('#message').css({'padding':'7px 0 5px'});
		
		// Déclenchement de l'action par défaut configurée dans les options
		switch(default_action){
			case "copy":
				$('#actionCopy').click();
				break;
			case "paste":
				$('#actionPaste').click();
				break;
		}
	}
});