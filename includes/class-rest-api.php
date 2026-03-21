<?php

namespace SnapBaton;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class RestApi {

	private const NAMESPACE = 'snapbaton/v1';

	public static function register_routes(): void {
		// --- Groups ---
		register_rest_route( self::NAMESPACE, '/groups', [
			[
				'methods'             => 'GET',
				'callback'            => [ self::class, 'get_groups' ],
				'permission_callback' => [ Permissions::class, 'can_view' ],
			],
			[
				'methods'             => 'POST',
				'callback'            => [ self::class, 'create_group' ],
				'permission_callback' => [ Permissions::class, 'can_upload' ],
			],
		] );

		register_rest_route( self::NAMESPACE, '/groups/(?P<id>\d+)', [
			[
				'methods'             => 'GET',
				'callback'            => [ self::class, 'get_group' ],
				'permission_callback' => [ Permissions::class, 'can_view' ],
			],
			[
				'methods'             => 'PUT',
				'callback'            => [ self::class, 'update_group' ],
				'permission_callback' => [ Permissions::class, 'can_edit' ],
			],
			[
				'methods'             => 'DELETE',
				'callback'            => [ self::class, 'delete_group' ],
				'permission_callback' => [ Permissions::class, 'can_delete' ],
			],
		] );

		// --- Images ---
		register_rest_route( self::NAMESPACE, '/groups/(?P<group_id>\d+)/images', [
			[
				'methods'             => 'GET',
				'callback'            => [ self::class, 'get_images' ],
				'permission_callback' => [ Permissions::class, 'can_view' ],
			],
			[
				'methods'             => 'POST',
				'callback'            => [ self::class, 'upload_image' ],
				'permission_callback' => [ Permissions::class, 'can_upload' ],
			],
		] );

		register_rest_route( self::NAMESPACE, '/images/(?P<id>\d+)', [
			[
				'methods'             => 'GET',
				'callback'            => [ self::class, 'get_image' ],
				'permission_callback' => [ Permissions::class, 'can_view' ],
			],
			[
				'methods'             => 'PUT',
				'callback'            => [ self::class, 'update_image' ],
				'permission_callback' => [ Permissions::class, 'can_edit' ],
			],
			[
				'methods'             => 'DELETE',
				'callback'            => [ self::class, 'delete_image' ],
				'permission_callback' => [ Permissions::class, 'can_delete' ],
			],
		] );

		// --- Post Sets ---
		register_rest_route( self::NAMESPACE, '/post-sets', [
			[
				'methods'             => 'GET',
				'callback'            => [ self::class, 'get_post_sets' ],
				'permission_callback' => [ Permissions::class, 'can_view' ],
			],
			[
				'methods'             => 'POST',
				'callback'            => [ self::class, 'create_post_set' ],
				'permission_callback' => [ Permissions::class, 'can_edit' ],
			],
		] );

		register_rest_route( self::NAMESPACE, '/post-sets/(?P<id>\d+)', [
			[
				'methods'             => 'GET',
				'callback'            => [ self::class, 'get_post_set' ],
				'permission_callback' => [ Permissions::class, 'can_view' ],
			],
			[
				'methods'             => 'PUT',
				'callback'            => [ self::class, 'update_post_set' ],
				'permission_callback' => [ Permissions::class, 'can_edit' ],
			],
			[
				'methods'             => 'DELETE',
				'callback'            => [ self::class, 'delete_post_set' ],
				'permission_callback' => [ Permissions::class, 'can_delete' ],
			],
		] );

		// --- Share (public) ---
		register_rest_route( self::NAMESPACE, '/share/(?P<id>\d+)', [
			'methods'             => 'GET',
			'callback'            => [ self::class, 'get_share' ],
			'permission_callback' => '__return_true',
		] );

		// --- Tags ---
		register_rest_route( self::NAMESPACE, '/tags', [
			'methods'             => 'GET',
			'callback'            => [ self::class, 'get_tags' ],
			'permission_callback' => [ Permissions::class, 'can_view' ],
		] );

		register_rest_route( self::NAMESPACE, '/tags/recent', [
			'methods'             => 'GET',
			'callback'            => [ self::class, 'get_recent_tags' ],
			'permission_callback' => [ Permissions::class, 'can_view' ],
		] );
	}

	// --- Groups ---

	public static function get_groups( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';

		$groups = $wpdb->get_results(
			"SELECT g.*,
				(SELECT COUNT(*) FROM {$prefix}images i WHERE i.group_id = g.id AND i.deleted_at IS NULL) AS image_count,
				(SELECT i.attachment_id FROM {$prefix}images i WHERE i.group_id = g.id AND i.deleted_at IS NULL ORDER BY i.sort_order ASC LIMIT 1) AS cover_attachment_id
			 FROM {$prefix}groups g
			 WHERE g.deleted_at IS NULL
			 ORDER BY g.created_at DESC"
		);

		foreach ( $groups as &$group ) {
			$group->image_count     = (int) $group->image_count;
			$group->cover_thumbnail = $group->cover_attachment_id
				? wp_get_attachment_image_url( $group->cover_attachment_id, 'medium' )
				: null;
			unset( $group->cover_attachment_id );
		}

		return rest_ensure_response( $groups );
	}

	public static function get_group( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$id     = absint( $request['id'] );

		$group = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$prefix}groups WHERE id = %d AND deleted_at IS NULL", $id )
		);

		if ( ! $group ) {
			return new \WP_Error( 'not_found', __( 'Group not found.', 'snapbaton' ), [ 'status' => 404 ] );
		}

		$group->tags = $wpdb->get_col( $wpdb->prepare(
			"SELECT t.name FROM {$prefix}tags t
			 INNER JOIN {$prefix}group_tags gt ON t.id = gt.tag_id
			 WHERE gt.group_id = %d",
			$id
		) );

		return rest_ensure_response( $group );
	}

	public static function create_group( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';

		$name = sanitize_text_field( $request->get_param( 'name' ) ?? '' );
		if ( empty( $name ) ) {
			return new \WP_Error( 'missing_name', __( 'Group name is required.', 'snapbaton' ), [ 'status' => 400 ] );
		}

		$now = current_time( 'mysql' );
		$wpdb->insert( "{$prefix}groups", [
			'name'        => $name,
			'description' => sanitize_textarea_field( $request->get_param( 'description' ) ?? '' ),
			'author_id'   => get_current_user_id(),
			'created_at'  => $now,
			'updated_at'  => $now,
		] );

		$group_id = $wpdb->insert_id;
		self::sync_tags( $group_id, $request->get_param( 'tags' ) ?? [] );

		return rest_ensure_response( [ 'id' => $group_id ] );
	}

	public static function update_group( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$id     = absint( $request['id'] );

		$data = [];
		if ( $request->has_param( 'name' ) ) {
			$data['name'] = sanitize_text_field( $request->get_param( 'name' ) );
		}
		if ( $request->has_param( 'description' ) ) {
			$data['description'] = sanitize_textarea_field( $request->get_param( 'description' ) );
		}

		if ( ! empty( $data ) ) {
			$data['updated_at'] = current_time( 'mysql' );
			$wpdb->update( "{$prefix}groups", $data, [ 'id' => $id ] );
		}

		if ( $request->has_param( 'tags' ) ) {
			self::sync_tags( $id, $request->get_param( 'tags' ) );
		}

		return rest_ensure_response( [ 'id' => $id ] );
	}

	public static function delete_group( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$id     = absint( $request['id'] );
		$now    = current_time( 'mysql' );

		$wpdb->update( "{$prefix}groups", [ 'deleted_at' => $now ], [ 'id' => $id ] );
		$wpdb->update( "{$prefix}images", [ 'deleted_at' => $now ], [ 'group_id' => $id ] );

		return rest_ensure_response( [ 'deleted' => true ] );
	}

	// --- Images ---

	public static function get_images( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix   = $wpdb->prefix . 'snapbaton_';
		$group_id = absint( $request['group_id'] );

		$images = $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM {$prefix}images WHERE group_id = %d AND deleted_at IS NULL ORDER BY sort_order ASC",
			$group_id
		) );

		foreach ( $images as &$image ) {
			$image->url       = wp_get_attachment_url( $image->attachment_id );
			$image->thumbnail = wp_get_attachment_image_url( $image->attachment_id, 'medium' );
			$image->tags      = $wpdb->get_col( $wpdb->prepare(
				"SELECT t.name FROM {$prefix}tags t
				 INNER JOIN {$prefix}image_tags it ON t.id = it.tag_id
				 WHERE it.image_id = %d",
				$image->id
			) );
		}

		return rest_ensure_response( $images );
	}

	public static function get_image( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$id     = absint( $request['id'] );

		$image = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$prefix}images WHERE id = %d AND deleted_at IS NULL", $id )
		);

		if ( ! $image ) {
			return new \WP_Error( 'not_found', __( 'Image not found.', 'snapbaton' ), [ 'status' => 404 ] );
		}

		$image->url       = wp_get_attachment_url( $image->attachment_id );
		$image->thumbnail = wp_get_attachment_image_url( $image->attachment_id, 'medium' );
		$image->full_url  = wp_get_attachment_url( $image->attachment_id );
		$image->tags      = $wpdb->get_col( $wpdb->prepare(
			"SELECT t.name FROM {$prefix}tags t
			 INNER JOIN {$prefix}image_tags it ON t.id = it.tag_id
			 WHERE it.image_id = %d",
			$id
		) );

		return rest_ensure_response( $image );
	}

	public static function upload_image( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$files = $request->get_file_params();
		if ( empty( $files['file'] ) ) {
			return new \WP_Error( 'no_file', __( 'No file uploaded.', 'snapbaton' ), [ 'status' => 400 ] );
		}

		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';

		$attachment_id = media_handle_upload( 'file', 0 );
		if ( is_wp_error( $attachment_id ) ) {
			return $attachment_id;
		}

		global $wpdb;
		$prefix   = $wpdb->prefix . 'snapbaton_';
		$group_id = absint( $request['group_id'] );

		$exif_desc = self::read_exif_description( get_attached_file( $attachment_id ) );

		$max_order = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT MAX(sort_order) FROM {$prefix}images WHERE group_id = %d",
			$group_id
		) );

		$now = current_time( 'mysql' );
		$wpdb->insert( "{$prefix}images", [
			'group_id'      => $group_id,
			'attachment_id' => $attachment_id,
			'title'         => sanitize_text_field( $request->get_param( 'title' ) ?? '' ),
			'description'   => $exif_desc ?: sanitize_textarea_field( $request->get_param( 'description' ) ?? '' ),
			'sort_order'    => $max_order + 1,
			'author_id'     => get_current_user_id(),
			'created_at'    => $now,
			'updated_at'    => $now,
		] );

		return rest_ensure_response( [
			'id'            => $wpdb->insert_id,
			'attachment_id' => $attachment_id,
		] );
	}

	public static function update_image( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$id     = absint( $request['id'] );

		$data = [];
		if ( $request->has_param( 'title' ) ) {
			$data['title'] = sanitize_text_field( $request->get_param( 'title' ) );
		}
		if ( $request->has_param( 'description' ) ) {
			$data['description'] = sanitize_textarea_field( $request->get_param( 'description' ) );
		}
		if ( $request->has_param( 'sort_order' ) ) {
			$data['sort_order'] = absint( $request->get_param( 'sort_order' ) );
		}

		if ( ! empty( $data ) ) {
			$data['updated_at'] = current_time( 'mysql' );
			$wpdb->update( "{$prefix}images", $data, [ 'id' => $id ] );
		}

		if ( $request->has_param( 'tags' ) ) {
			self::sync_image_tags( $id, $request->get_param( 'tags' ) );
		}

		return rest_ensure_response( [ 'id' => $id ] );
	}

	public static function delete_image( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$id     = absint( $request['id'] );

		$wpdb->update( "{$prefix}images", [ 'deleted_at' => current_time( 'mysql' ) ], [ 'id' => $id ] );

		return rest_ensure_response( [ 'deleted' => true ] );
	}

	// --- Post Sets ---

	public static function get_post_sets( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';

		$post_sets = $wpdb->get_results(
			"SELECT * FROM {$prefix}post_sets ORDER BY created_at DESC"
		);

		return rest_ensure_response( $post_sets );
	}

	public static function get_post_set( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$id     = absint( $request['id'] );

		$post_set = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$prefix}post_sets WHERE id = %d", $id )
		);

		if ( ! $post_set ) {
			return new \WP_Error( 'not_found', __( 'Post set not found.', 'snapbaton' ), [ 'status' => 404 ] );
		}

		$post_set->images = $wpdb->get_results( $wpdb->prepare(
			"SELECT i.*, psi.sort_order AS set_order
			 FROM {$prefix}images i
			 INNER JOIN {$prefix}post_set_images psi ON i.id = psi.image_id
			 WHERE psi.post_set_id = %d
			 ORDER BY psi.sort_order ASC",
			$id
		) );

		foreach ( $post_set->images as &$img ) {
			$img->url       = wp_get_attachment_url( $img->attachment_id );
			$img->thumbnail = wp_get_attachment_image_url( $img->attachment_id, 'medium' );
		}

		return rest_ensure_response( $post_set );
	}

	public static function create_post_set( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$now    = current_time( 'mysql' );

		$wpdb->insert( "{$prefix}post_sets", [
			'title'      => sanitize_text_field( $request->get_param( 'title' ) ?? '' ),
			'body'       => sanitize_textarea_field( $request->get_param( 'body' ) ?? '' ),
			'sns_target' => sanitize_text_field( $request->get_param( 'sns_target' ) ?? '' ),
			'status'     => 'draft',
			'author_id'  => get_current_user_id(),
			'created_at' => $now,
			'updated_at' => $now,
		] );

		$set_id    = $wpdb->insert_id;
		$image_ids = $request->get_param( 'image_ids' ) ?? [];

		foreach ( $image_ids as $order => $image_id ) {
			$wpdb->insert( "{$prefix}post_set_images", [
				'post_set_id' => $set_id,
				'image_id'    => absint( $image_id ),
				'sort_order'  => $order,
			] );
		}

		return rest_ensure_response( [ 'id' => $set_id ] );
	}

	public static function update_post_set( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$id     = absint( $request['id'] );

		$data = [];
		foreach ( [ 'title', 'body', 'sns_target', 'status' ] as $field ) {
			if ( $request->has_param( $field ) ) {
				$data[ $field ] = sanitize_text_field( $request->get_param( $field ) );
			}
		}

		if ( ( $data['status'] ?? '' ) === 'posted' ) {
			$data['posted_at'] = current_time( 'mysql' );
		}

		if ( ! empty( $data ) ) {
			$data['updated_at'] = current_time( 'mysql' );
			$wpdb->update( "{$prefix}post_sets", $data, [ 'id' => $id ] );
		}

		if ( $request->has_param( 'image_ids' ) ) {
			$wpdb->delete( "{$prefix}post_set_images", [ 'post_set_id' => $id ] );
			foreach ( $request->get_param( 'image_ids' ) as $order => $image_id ) {
				$wpdb->insert( "{$prefix}post_set_images", [
					'post_set_id' => $id,
					'image_id'    => absint( $image_id ),
					'sort_order'  => $order,
				] );
			}
		}

		return rest_ensure_response( [ 'id' => $id ] );
	}

	public static function delete_post_set( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$id     = absint( $request['id'] );

		$wpdb->delete( "{$prefix}post_set_images", [ 'post_set_id' => $id ] );
		$wpdb->delete( "{$prefix}post_sets", [ 'id' => $id ] );

		return rest_ensure_response( [ 'deleted' => true ] );
	}

	// --- Share ---

	public static function get_share( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$id     = absint( $request['id'] );

		$image = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$prefix}images WHERE id = %d AND deleted_at IS NULL", $id )
		);

		if ( ! $image ) {
			return new \WP_Error( 'not_found', __( 'Image not found.', 'snapbaton' ), [ 'status' => 404 ] );
		}

		$group = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$prefix}groups WHERE id = %d", $image->group_id )
		);

		$tags = $wpdb->get_col( $wpdb->prepare(
			"SELECT t.name FROM {$prefix}tags t
			 INNER JOIN {$prefix}group_tags gt ON t.id = gt.tag_id
			 WHERE gt.group_id = %d",
			$image->group_id
		) );

		return rest_ensure_response( [
			'title'       => $image->title,
			'description' => $image->description,
			'image_url'   => wp_get_attachment_url( $image->attachment_id ),
			'group'       => $group->name ?? '',
			'tags'        => $tags,
		] );
	}

	// --- Tags ---

	public static function get_tags( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';

		$tags = $wpdb->get_results( "SELECT * FROM {$prefix}tags ORDER BY name ASC" );

		return rest_ensure_response( $tags );
	}

	// --- Helpers ---

	private static function sync_tags( int $group_id, array $tag_names ): void {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';

		$wpdb->delete( "{$prefix}group_tags", [ 'group_id' => $group_id ] );

		foreach ( $tag_names as $name ) {
			$name = sanitize_text_field( $name );
			if ( empty( $name ) ) {
				continue;
			}

			$tag_id = $wpdb->get_var(
				$wpdb->prepare( "SELECT id FROM {$prefix}tags WHERE name = %s", $name )
			);

			if ( ! $tag_id ) {
				$wpdb->insert( "{$prefix}tags", [ 'name' => $name ] );
				$tag_id = $wpdb->insert_id;
			}

			$wpdb->insert( "{$prefix}group_tags", [
				'group_id' => $group_id,
				'tag_id'   => $tag_id,
			] );
		}
	}

	public static function get_recent_tags( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';

		$tags = $wpdb->get_col(
			"SELECT DISTINCT t.name FROM {$prefix}tags t
			 LEFT JOIN {$prefix}group_tags gt ON t.id = gt.tag_id
			 LEFT JOIN {$prefix}image_tags it ON t.id = it.tag_id
			 WHERE gt.tag_id IS NOT NULL OR it.tag_id IS NOT NULL
			 ORDER BY t.id DESC
			 LIMIT 10"
		);

		return rest_ensure_response( $tags );
	}

	private static function sync_image_tags( int $image_id, array $tag_names ): void {
		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';

		$wpdb->delete( "{$prefix}image_tags", [ 'image_id' => $image_id ] );

		foreach ( $tag_names as $name ) {
			$name = sanitize_text_field( $name );
			if ( empty( $name ) ) {
				continue;
			}

			$tag_id = $wpdb->get_var(
				$wpdb->prepare( "SELECT id FROM {$prefix}tags WHERE name = %s", $name )
			);

			if ( ! $tag_id ) {
				$wpdb->insert( "{$prefix}tags", [ 'name' => $name ] );
				$tag_id = $wpdb->insert_id;
			}

			$wpdb->insert( "{$prefix}image_tags", [
				'image_id' => $image_id,
				'tag_id'   => $tag_id,
			] );
		}
	}

	private static function read_exif_description( string $file_path ): string {
		if ( ! function_exists( 'exif_read_data' ) || ! file_exists( $file_path ) ) {
			return '';
		}

		$exif = @exif_read_data( $file_path );
		if ( ! $exif ) {
			return '';
		}

		return sanitize_textarea_field( $exif['ImageDescription'] ?? $exif['UserComment'] ?? '' );
	}
}
