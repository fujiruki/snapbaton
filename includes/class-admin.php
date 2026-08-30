<?php

namespace SnapBaton;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Admin {

	private const SLUG = 'snapbaton';

	public static function register_menu(): void {
		add_menu_page(
			__( 'SnapBaton', 'snapbaton' ),
			__( 'SnapBaton', 'snapbaton' ),
			'read',
			self::SLUG,
			[ self::class, 'render_app' ],
			'dashicons-format-gallery',
			30
		);

		add_submenu_page(
			self::SLUG,
			__( 'Groups', 'snapbaton' ),
			__( 'Groups', 'snapbaton' ),
			'read',
			self::SLUG,
			[ self::class, 'render_app' ]
		);

		add_submenu_page(
			self::SLUG,
			__( 'Post Sets', 'snapbaton' ),
			__( 'Post Sets', 'snapbaton' ),
			'edit_posts',
			self::SLUG . '-post-sets',
			[ self::class, 'render_app' ]
		);

		add_submenu_page(
			self::SLUG,
			__( 'Trash', 'snapbaton' ),
			__( 'Trash', 'snapbaton' ),
			'edit_others_posts',
			self::SLUG . '-trash',
			[ self::class, 'render_app' ]
		);

		add_submenu_page(
			self::SLUG,
			__( 'Settings', 'snapbaton' ),
			__( 'Settings', 'snapbaton' ),
			'manage_options',
			self::SLUG . '-settings',
			[ self::class, 'render_app' ]
		);
	}

	public static function render_app(): void {
		echo '<div id="snapbaton-app"></div>';
	}

	public static function enqueue_assets( string $hook ): void {
		if ( ! str_contains( $hook, self::SLUG ) ) {
			return;
		}

		$build_dir = SNAPBATON_PLUGIN_DIR . 'admin/build/';
		$build_url = SNAPBATON_PLUGIN_URL . 'admin/build/';

		$asset_file = $build_dir . 'assets/index.js';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$css_file = file_exists( $build_dir . 'assets/main.css' ) ? 'main.css' : 'index.css';
		$css_path = $build_dir . 'assets/' . $css_file;
		$css_ver  = file_exists( $css_path ) ? (string) filemtime( $css_path ) : SNAPBATON_VERSION;
		$js_ver   = (string) filemtime( $asset_file );

		wp_enqueue_style(
			'snapbaton-admin',
			$build_url . 'assets/' . $css_file,
			[],
			$css_ver
		);

		wp_enqueue_script(
			'snapbaton-admin',
			$build_url . 'assets/index.js',
			[ 'wp-element' ],
			$js_ver,
			true
		);

		wp_localize_script( 'snapbaton-admin', 'snapbatonData', [
			'apiBase'    => rest_url( 'snapbaton/v1' ),
			'nonce'      => wp_create_nonce( 'wp_rest' ),
			'page'       => sanitize_text_field( $_GET['page'] ?? '' ),
			'groupId'    => absint( $_GET['group'] ?? 0 ),
			'userId'     => get_current_user_id(),
			'canEdit'    => current_user_can( 'edit_posts' ),
			'canDelete'  => current_user_can( 'edit_others_posts' ),
			'canManage'  => current_user_can( 'manage_options' ),
			'uploadUrl'  => rest_url( 'snapbaton/v1/upload-page' ),
			'uploadPass' => current_user_can( 'manage_options' ) ? get_option( 'snapbaton_upload_passcode', '' ) : '',
			'feedbackToken' => current_user_can( 'manage_options' ) ? get_option( 'snapbaton_admin_feedback_token', '' ) : '',
		] );
	}
}
