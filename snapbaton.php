<?php
/**
 * Plugin Name:       SnapBaton
 * Plugin URI:        https://github.com/fujiruki-dev/snapbaton
 * Description:       Gallery & SNS Workflow Plugin. Upload photos, add descriptions, and collaborate with your SNS team.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * Author:            Fujiruki Dev
 * Author URI:        https://door-fujita.com
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       snapbaton
 * Domain Path:       /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SNAPBATON_VERSION', '0.1.0' );
define( 'SNAPBATON_DB_VERSION', '1.0' );
define( 'SNAPBATON_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'SNAPBATON_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once SNAPBATON_PLUGIN_DIR . 'includes/class-activator.php';
require_once SNAPBATON_PLUGIN_DIR . 'includes/class-admin.php';
require_once SNAPBATON_PLUGIN_DIR . 'includes/class-rest-api.php';
require_once SNAPBATON_PLUGIN_DIR . 'includes/class-permissions.php';
require_once SNAPBATON_PLUGIN_DIR . 'includes/class-public-upload.php';
require_once SNAPBATON_PLUGIN_DIR . 'includes/class-gallery.php';

register_activation_hook( __FILE__, [ SnapBaton\Activator::class, 'activate' ] );
register_deactivation_hook( __FILE__, [ SnapBaton\Activator::class, 'deactivate' ] );

add_action( 'admin_menu', [ SnapBaton\Admin::class, 'register_menu' ] );
add_action( 'admin_enqueue_scripts', [ SnapBaton\Admin::class, 'enqueue_assets' ] );
add_action( 'rest_api_init', [ SnapBaton\RestApi::class, 'register_routes' ] );
add_action( 'rest_api_init', [ SnapBaton\PublicUpload::class, 'register_routes' ] );
add_action( 'init', [ SnapBaton\Gallery::class, 'init' ] );

add_filter( 'big_image_size_threshold', '__return_false' );
