<?php

namespace SnapBaton;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Permissions {

	public static function can_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	public static function can_edit(): bool {
		return current_user_can( 'edit_posts' );
	}

	public static function can_upload(): bool {
		return current_user_can( 'edit_posts' );
	}

	public static function can_delete(): bool {
		return current_user_can( 'edit_others_posts' );
	}

	public static function can_view(): bool {
		return current_user_can( 'read' );
	}
}
