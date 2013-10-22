bkg = chrome.extension.getBackgroundPage(); // Récupération d'une référence vers la backgroundpage

/**
* Gestion des boutons de la popup
*/
jQuery(function($){
	$('#actionCopy').click(function(e){
		bkg.Action.copy();
		
		// Affichage du nombre d'URL copiées, message envoyé par la background page
		chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
			if(typeof request.copied_url != 'number') return; // Test si il s'agit bien d'un message de bkg.Action.copy
			var nombre = (request.copied_url > 1) ? 's' : '';
			jQuery('#message').html("<b>"+request.copied_url+"</b> url"+nombre+" successfully copied !");
			setTimeout(function(){window.close();}, 3000); // Fermeture de la popup quelques secondes après affichage du message
		});
	});
	$('#actionPaste').click(function(e){
		bkg.Action.paste();
		window.close();
	});
	$('#actionOption').click(function(e){
		chrome.tabs.create({url: 'options.html'});
	});
});