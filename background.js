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
	*/
	write: function(str){
		// console.log('write');
		
		if(str == '' || str == undefined){
			str = '<empty>';
		}
		
		clipboardBuffer.val(str);
		clipboardBuffer.select();
		document.execCommand('copy');
	},
	
	/**
	* Retourne le contenu du presse papier (String)
	*/
	read: function(){
		// console.log('read');
		
		clipboardBuffer.val('');
		clipboardBuffer.select();
		document.execCommand('paste')
		
		return clipboardBuffer.val();
	}
}

jQuery(function($){
	// Au chargement de la page, on créé une textarea qui va servir à lire et à écrire dans le presse papier
	clipboardBuffer = $('<textarea id="clipboardBuffer"></textarea>');
	clipboardBuffer.appendTo('body');
});