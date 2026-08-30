<?php

namespace SnapBaton;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Feedback {

	private const NAMESPACE  = 'snapbaton/v1';
	private const MAX_IMAGES = 5;
	private const PAGE_KEYS  = [ 'groups', 'group-detail', 'post-sets', 'trash', 'settings', 'public-upload' ];

	public static function register_routes(): void {
		register_rest_route( self::NAMESPACE, '/feedback', [
			'methods'             => 'POST',
			'callback'            => [ self::class, 'submit' ],
			'permission_callback' => '__return_true',
		] );

		register_rest_route( self::NAMESPACE, '/admin/feedback', [
			'methods'             => 'GET',
			'callback'            => [ self::class, 'list_feedback' ],
			'permission_callback' => [ self::class, 'verify_admin_token' ],
		] );

		register_rest_route( self::NAMESPACE, '/admin/feedback/(?P<id>\d+)/resolve', [
			'methods'             => 'POST',
			'callback'            => [ self::class, 'resolve' ],
			'permission_callback' => [ self::class, 'verify_admin_token' ],
		] );

		register_rest_route( self::NAMESPACE, '/admin/feedback-token/regenerate', [
			'methods'             => 'POST',
			'callback'            => [ self::class, 'regenerate_token' ],
			'permission_callback' => [ Permissions::class, 'can_manage' ],
		] );
	}

	/**
	 * トークン検証（管理用APIの認証）
	 */
	public static function verify_admin_token( \WP_REST_Request $request ): bool {
		$token  = $request->get_header( 'X-Admin-Token' ) ?? '';
		$stored = get_option( 'snapbaton_admin_feedback_token', '' );

		if ( empty( $stored ) || empty( $token ) ) {
			return false;
		}

		return hash_equals( $stored, $token );
	}

	/**
	 * 要望送信（認証なし）
	 */
	public static function submit( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$message  = sanitize_textarea_field( $request->get_param( 'message' ) ?? '' );
		$page_key = sanitize_text_field( $request->get_param( 'page_key' ) ?? '' );

		if ( empty( $message ) ) {
			return new \WP_Error( 'missing_message', '本文を入力してください。', [ 'status' => 400 ] );
		}

		if ( ! in_array( $page_key, self::PAGE_KEYS, true ) ) {
			return new \WP_Error( 'invalid_page_key', 'page_keyが不正です。', [ 'status' => 400 ] );
		}

		$files = $request->get_file_params();
		$count = isset( $files['images']['name'] ) && is_array( $files['images']['name'] )
			? count( $files['images']['name'] )
			: 0;

		if ( $count > self::MAX_IMAGES ) {
			return new \WP_Error( 'too_many_images', '画像は最大5枚までです。', [ 'status' => 400 ] );
		}

		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$now    = current_time( 'mysql' );

		$wpdb->insert( "{$prefix}feedback", [
			'message'    => $message,
			'page_key'   => $page_key,
			'user_agent' => sanitize_text_field( $request->get_header( 'User-Agent' ) ?? '' ),
			'created_at' => $now,
		] );
		$feedback_id = $wpdb->insert_id;

		$attachment_ids = self::process_images( $files, $count );
		foreach ( $attachment_ids as $order => $attachment_id ) {
			$wpdb->insert( "{$prefix}feedback_images", [
				'feedback_id'   => $feedback_id,
				'attachment_id' => $attachment_id,
				'sort_order'    => $order,
			] );
		}

		return rest_ensure_response( [ 'id' => $feedback_id ] );
	}

	/**
	 * 添付画像をWPメディアライブラリへ保存
	 */
	private static function process_images( array $files, int $count ): array {
		if ( $count === 0 ) {
			return [];
		}

		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';

		$attachment_ids = [];
		$images         = $files['images'];

		for ( $i = 0; $i < $count; $i++ ) {
			if ( $images['error'][ $i ] !== UPLOAD_ERR_OK ) {
				continue;
			}

			$_FILES['snapbaton_feedback_image'] = [
				'name'     => $images['name'][ $i ],
				'type'     => $images['type'][ $i ],
				'tmp_name' => $images['tmp_name'][ $i ],
				'error'    => $images['error'][ $i ],
				'size'     => $images['size'][ $i ],
			];

			$attachment_id = media_handle_upload( 'snapbaton_feedback_image', 0 );
			if ( ! is_wp_error( $attachment_id ) ) {
				$attachment_ids[] = $attachment_id;
			}
		}
		unset( $_FILES['snapbaton_feedback_image'] );

		return $attachment_ids;
	}

	/**
	 * 要望一覧取得（管理用）
	 */
	public static function list_feedback( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';

		$rows = $wpdb->get_results(
			"SELECT id, message, page_key, resolved_at, created_at FROM {$prefix}feedback ORDER BY created_at DESC"
		);

		$result = array_map( function ( $row ) use ( $wpdb, $prefix ) {
			$attachment_ids = $wpdb->get_col( $wpdb->prepare(
				"SELECT attachment_id FROM {$prefix}feedback_images WHERE feedback_id = %d ORDER BY sort_order ASC",
				$row->id
			) );

			return [
				'id'          => (int) $row->id,
				'message'     => $row->message,
				'page_key'    => $row->page_key,
				'resolved_at' => $row->resolved_at,
				'created_at'  => $row->created_at,
				'images'      => array_map( 'wp_get_attachment_url', array_map( 'absint', $attachment_ids ) ),
			];
		}, $rows );

		return rest_ensure_response( $result );
	}

	/**
	 * 導入済みにする
	 */
	public static function resolve( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$id     = absint( $request['id'] );

		$wpdb->update( "{$prefix}feedback", [
			'resolved_at' => current_time( 'mysql' ),
		], [ 'id' => $id ] );

		return rest_ensure_response( [ 'ok' => true ] );
	}

	/**
	 * 管理用APIトークンの再発行
	 */
	public static function regenerate_token( \WP_REST_Request $request ): \WP_REST_Response {
		$token = wp_generate_password( 40, false );
		update_option( 'snapbaton_admin_feedback_token', $token );

		return rest_ensure_response( [ 'token' => $token ] );
	}
}
