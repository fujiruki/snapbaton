<?php

namespace SnapBaton;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Activator {

	public static function activate(): void {
		self::create_tables();
		add_option( 'snapbaton_db_version', SNAPBATON_DB_VERSION );
		flush_rewrite_rules();
	}

	public static function deactivate(): void {
		flush_rewrite_rules();
	}

	private static function create_tables(): void {
		global $wpdb;

		$charset_collate = $wpdb->get_charset_collate();
		$prefix          = $wpdb->prefix . 'snapbaton_';

		$sql = "CREATE TABLE {$prefix}groups (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			name varchar(255) NOT NULL DEFAULT '',
			description longtext NOT NULL,
			author_id bigint(20) unsigned NOT NULL DEFAULT 0,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			deleted_at datetime DEFAULT NULL,
			cover_image_id bigint(20) unsigned DEFAULT NULL,
			is_public tinyint(1) NOT NULL DEFAULT 0,
			PRIMARY KEY  (id),
			KEY author_id (author_id),
			KEY deleted_at (deleted_at),
			KEY is_public (is_public)
		) {$charset_collate};

		CREATE TABLE {$prefix}tags (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			name varchar(100) NOT NULL DEFAULT '',
			PRIMARY KEY  (id),
			UNIQUE KEY name (name)
		) {$charset_collate};

		CREATE TABLE {$prefix}group_tags (
			group_id bigint(20) unsigned NOT NULL,
			tag_id bigint(20) unsigned NOT NULL,
			PRIMARY KEY  (group_id, tag_id),
			KEY tag_id (tag_id)
		) {$charset_collate};

		CREATE TABLE {$prefix}images (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			group_id bigint(20) unsigned NOT NULL,
			attachment_id bigint(20) unsigned NOT NULL DEFAULT 0,
			title varchar(255) NOT NULL DEFAULT '',
			description longtext NOT NULL,
			sort_order int NOT NULL DEFAULT 0,
			author_id bigint(20) unsigned NOT NULL DEFAULT 0,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			deleted_at datetime DEFAULT NULL,
			PRIMARY KEY  (id),
			KEY group_id (group_id),
			KEY attachment_id (attachment_id),
			KEY deleted_at (deleted_at)
		) {$charset_collate};

		CREATE TABLE {$prefix}image_tags (
			image_id bigint(20) unsigned NOT NULL,
			tag_id bigint(20) unsigned NOT NULL,
			PRIMARY KEY  (image_id, tag_id),
			KEY tag_id (tag_id)
		) {$charset_collate};

		CREATE TABLE {$prefix}post_sets (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			title varchar(255) NOT NULL DEFAULT '',
			body longtext NOT NULL,
			sns_target varchar(50) NOT NULL DEFAULT '',
			status varchar(20) NOT NULL DEFAULT 'draft',
			author_id bigint(20) unsigned NOT NULL DEFAULT 0,
			posted_at datetime DEFAULT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY author_id (author_id),
			KEY status (status),
			KEY sns_target (sns_target)
		) {$charset_collate};

		CREATE TABLE {$prefix}post_set_images (
			post_set_id bigint(20) unsigned NOT NULL,
			image_id bigint(20) unsigned NOT NULL,
			sort_order int NOT NULL DEFAULT 0,
			PRIMARY KEY  (post_set_id, image_id),
			KEY image_id (image_id)
		) {$charset_collate};";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}
}
