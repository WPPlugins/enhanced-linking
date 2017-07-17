<?php
/*
 * Plugin Name: Enhanced Linking
 * Description: This plugin enhances the Insert/Edit Link dialogue with Related Posts and easy searching for links.
 * Version: 1.0.5
 * Author: igzebedze
 * Author URI: http://zemanta.com/
 * Contributors: Andrej Mihajlov (http://codeispoetry.ru/)
**/

define('ENHANCED_LINKING_VERSION', '1.0.5');

// development, symlink problem
//define('ENHANCED_LINKING_URL', WP_PLUGIN_URL . '/enhanced-linking/');

// production
define('ENHANCED_LINKING_URL', plugins_url() . '/' . dirname(plugin_basename(__FILE__)));

class Enhanced_Linking {

	static $_instance = null;
	
	static function instance() {
		if(!self::$_instance) {
			self::$_instance = new Enhanced_Linking();
		}
		
		return self::$_instance;
	}
	
	function __construct() {
		add_action('admin_init', array($this, 'on_init'));
		add_action('after_wp_tiny_mce', array($this, 'after_wp_tiny_mce'), 20, 1);

		if(is_admin()) {
			add_action('wp_ajax_el_bingsearch', array($this, 'on_ajax_bingsearch'));
		}
	}
	
	function on_init() {
		wp_register_script('enhanced-linking', ENHANCED_LINKING_URL . '/links.js', array('jquery'), ENHANCED_LINKING_VERSION);
		wp_register_style('enhanced-linking', ENHANCED_LINKING_URL . '/links.css', array(), ENHANCED_LINKING_VERSION);
	}

	function on_ajax_bingsearch() {
		$term = urlencode($_REQUEST['query']);
		$rel_url = '://api.datamarket.azure.com/Bing/SearchWeb/Web?$format=json&$top=20&Query=%27' . $term . '%27';
		$url = 'http' . $rel_url;
		$api_key = 'WmfuCRJhABEycA2sHmy+EWyKZeVxZ17J6qvtLdlpaIQ=';
		$headers = array('Authorization' => 'Basic ' . base64_encode($api_key . ':' . $api_key));

		// use ssl when possible
		if(function_exists('wp_http_supports') && wp_http_supports('ssl'))
			$url = 'https' . $rel_url;

		$result = wp_remote_get($url, array('headers' => $headers));

		if(is_wp_error($result)) {
			echo json_encode(array(
				'error_code' => $result->get_error_code(),
				'error_message' => $result->get_error_message()
			));
		} else {
			echo $result['body'];
		}

		die();
	}
	
	function after_wp_tiny_mce() {
		wp_print_scripts('enhanced-linking');
		wp_print_styles('enhanced-linking');
	}
	
}

// create shared instance
$enhancedLinking = Enhanced_Linking::instance();
