jQuery(document).ready(function($){
	// Affichage version
	chrome.management.get(getChromeExtensionKey(), function(data){
		var versionExtension = data.version || 'unknown';
		$('#cpau_version_label').html(versionExtension);
	});

	// Initialisation de l'état du formulaire
	OptionFormManager.init();
	
	// Enregistrement lors du changement de format
	$('#formats input[type=radio]').change(function(e){
		localStorage["format"] = $(this).val();
		OptionFormManager.init();
	});
	
	// Changement format html
	$('#format_html_advanced input[type=radio]').change(function(e){
		localStorage["anchor"] = $(this).val();
		OptionFormManager.init();
	});
	
	// Changement row format (custom)
	$('#format_custom_advanced>textarea').change(function(e){
		localStorage["format_custom_advanced"] = $(this).val();
		OptionFormManager.init();
	});
	
	// Intelligent paste
	$('#intelligent_paste').change(function(e){
		localStorage["intelligent_paste"] = $(this).prop("checked");
		OptionFormManager.init();
	});
	
	// Reset
	$('#reset_settings').click(function(e){
		OptionFormManager.optionsReset();
	});
});

/**
 * Fonction qui récupère la clé de l'extension, pour récupérer des infos dessus (comme sa version)
**/
function getChromeExtensionKey(){
	var url = chrome.extension.getURL('stop');
	var matches = chrome.extension.getURL('stop').match(new RegExp("[a-z0-9_-]+://([a-z0-9_-]+)/stop","i"));
	if( matches[1] == undefined ){
		return false;
	}
	return matches[1];
}

/**
 * Objet de gestion du formulaire d'options
**/
var OptionFormManager = {
	/**
	 * Init form from localStorage (saved settings)
	**/
	init: function(){
		var format = localStorage['format'] ? localStorage['format'] : 'text';
		var anchor = localStorage['anchor'] ? localStorage['anchor'] : 'url';
		var format_custom_advanced = localStorage['format_custom_advanced'] ? localStorage['format_custom_advanced'] : '';
		var intelligent_paste = localStorage['intelligent_paste'] == "true" ? true : false;
		
		// Coche Format
		this.cocherFormat(format);
		
		// Coche Anchor
		jQuery('#format_html_advanced input[type=radio]').attr('checked', false);
		jQuery('#format_html_anchor_' + anchor).attr('checked', true);
		
		// Restaure template custom
		jQuery('#format_custom_advanced>textarea').val(format_custom_advanced);
		
		// Panneaux avancés
		$('#format_html_advanced').hide();
		$('#format_custom_advanced').hide();
		if( format == 'html' ){
			$('#format_html_advanced').show();
		}
		if( format == 'custom' ){
			$('#format_custom_advanced').show();
		}
		
		// Coche Intelligent paste
		jQuery('#intelligent_paste').prop('checked', intelligent_paste);
	},
	
	/**
	 * Checks the Text or HTML checkbox
	**/
	cocherFormat: function(option){
		jQuery('#formats input[type=radio]').attr('checked', false);
		jQuery('#format_' + option).attr('checked', true);
	},

	/**
	 * Delete options
	**/
	optionsReset: function(){
		delete(localStorage["format"]);
		delete(localStorage["anchor"]);
		delete(localStorage["format_custom_advanced"]);
		delete(localStorage["intelligent_paste"]);
		this.init();
	}
}