<?php

namespace SnapBaton;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PublicUpload {

	private const NAMESPACE   = 'snapbaton/v1';
	private const TOKEN_LIFE  = 86400; // 24時間

	public static function register_routes(): void {
		// アップロードページ（HTML返却）
		register_rest_route( self::NAMESPACE, '/upload-page', [
			'methods'             => 'GET',
			'callback'            => [ self::class, 'render_page' ],
			'permission_callback' => '__return_true',
		] );

		// パスコード認証
		register_rest_route( self::NAMESPACE, '/upload-auth', [
			'methods'             => 'POST',
			'callback'            => [ self::class, 'authenticate' ],
			'permission_callback' => '__return_true',
		] );

		// グループ一覧（トークン認証）
		register_rest_route( self::NAMESPACE, '/upload-groups', [
			[
				'methods'             => 'GET',
				'callback'            => [ self::class, 'get_groups' ],
				'permission_callback' => '__return_true',
			],
			[
				'methods'             => 'POST',
				'callback'            => [ self::class, 'create_group' ],
				'permission_callback' => '__return_true',
			],
		] );

		// ファイルアップロード（トークン認証）
		register_rest_route( self::NAMESPACE, '/upload-files/(?P<group_id>\d+)', [
			'methods'             => 'POST',
			'callback'            => [ self::class, 'upload_files' ],
			'permission_callback' => '__return_true',
		] );
	}

	/**
	 * パスコード認証 → トークン発行
	 */
	public static function authenticate( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$passcode = sanitize_text_field( $request->get_param( 'passcode' ) ?? '' );
		$stored   = get_option( 'snapbaton_upload_passcode', '' );

		if ( empty( $stored ) ) {
			return new \WP_Error( 'not_configured', 'パスコードが設定されていません。管理画面で設定してください。', [ 'status' => 403 ] );
		}

		if ( $passcode !== $stored ) {
			return new \WP_Error( 'invalid_passcode', 'パスコードが正しくありません。', [ 'status' => 403 ] );
		}

		// 簡易トークン生成
		$token = wp_generate_password( 32, false );
		set_transient( 'snapbaton_upload_token_' . $token, true, self::TOKEN_LIFE );

		return rest_ensure_response( [ 'token' => $token ] );
	}

	/**
	 * トークン検証
	 */
	private static function verify_token( \WP_REST_Request $request ): bool {
		$token = $request->get_header( 'X-Upload-Token' ) ?? '';
		if ( empty( $token ) ) {
			return false;
		}
		return (bool) get_transient( 'snapbaton_upload_token_' . $token );
	}

	/**
	 * グループ一覧
	 */
	public static function get_groups( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( ! self::verify_token( $request ) ) {
			return new \WP_Error( 'unauthorized', '認証が必要です。', [ 'status' => 401 ] );
		}

		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';

		$groups = $wpdb->get_results(
			"SELECT id, name FROM {$prefix}groups WHERE deleted_at IS NULL ORDER BY created_at DESC"
		);

		return rest_ensure_response( $groups );
	}

	/**
	 * グループ新規作成
	 */
	public static function create_group( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( ! self::verify_token( $request ) ) {
			return new \WP_Error( 'unauthorized', '認証が必要です。', [ 'status' => 401 ] );
		}

		$name = sanitize_text_field( $request->get_param( 'name' ) ?? '' );
		if ( empty( $name ) ) {
			return new \WP_Error( 'missing_name', 'グループ名を入力してください。', [ 'status' => 400 ] );
		}

		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';
		$now    = current_time( 'mysql' );

		$wpdb->insert( "{$prefix}groups", [
			'name'        => $name,
			'description' => '',
			'author_id'   => 0,
			'created_at'  => $now,
			'updated_at'  => $now,
		] );

		return rest_ensure_response( [
			'id'   => $wpdb->insert_id,
			'name' => $name,
		] );
	}

	/**
	 * ファイルアップロード
	 */
	public static function upload_files( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( ! self::verify_token( $request ) ) {
			return new \WP_Error( 'unauthorized', '認証が必要です。', [ 'status' => 401 ] );
		}

		$files = $request->get_file_params();
		if ( empty( $files['file'] ) ) {
			return new \WP_Error( 'no_file', 'ファイルがありません。', [ 'status' => 400 ] );
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
		$now      = current_time( 'mysql' );

		$max_order = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT MAX(sort_order) FROM {$prefix}images WHERE group_id = %d",
			$group_id
		) );

		$wpdb->insert( "{$prefix}images", [
			'group_id'      => $group_id,
			'attachment_id' => $attachment_id,
			'title'         => '',
			'description'   => '',
			'sort_order'    => $max_order + 1,
			'author_id'     => 0,
			'created_at'    => $now,
			'updated_at'    => $now,
		] );

		return rest_ensure_response( [
			'id'            => $wpdb->insert_id,
			'attachment_id' => $attachment_id,
		] );
	}

	/**
	 * アップロードページHTML
	 */
	public static function render_page( \WP_REST_Request $request ): \WP_REST_Response {
		$site_name = get_bloginfo( 'name' );
		$api_base  = rest_url( 'snapbaton/v1' );

		$html = <<<HTML
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="SnapBaton">
<link rel="manifest" href="{$api_base}/upload-manifest">
<title>SnapBaton アップロード</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif;background:#f5f5f7;color:#1d1d1f;min-height:100vh;min-height:100dvh}
.sb-app{max-width:480px;margin:0 auto;padding:16px}
.sb-logo{text-align:center;padding:24px 0 16px}
.sb-logo h1{font-size:22px;font-weight:700;color:#1d1d1f}
.sb-logo p{font-size:13px;color:#86868b;margin-top:4px}
.sb-card{background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.sb-card h2{font-size:16px;margin-bottom:12px;color:#1d1d1f}
.sb-input{width:100%;padding:12px;border:1px solid #d2d2d7;border-radius:8px;font-size:16px;-webkit-appearance:none;margin-bottom:8px}
.sb-input:focus{outline:none;border-color:#0071e3;box-shadow:0 0 0 3px rgba(0,113,227,0.15)}
.sb-passcode{display:flex;gap:8px;justify-content:center;margin-bottom:16px}
.sb-passcode input{width:48px;height:56px;text-align:center;font-size:24px;font-weight:700;border:2px solid #d2d2d7;border-radius:10px;-webkit-appearance:none}
.sb-passcode input:focus{border-color:#0071e3;outline:none}
.sb-btn{width:100%;padding:14px;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;transition:opacity .15s}
.sb-btn-primary{background:#0071e3;color:#fff}
.sb-btn-primary:active{opacity:.7}
.sb-btn-primary:disabled{opacity:.4;cursor:default}
.sb-btn-secondary{background:#e8e8ed;color:#1d1d1f;margin-top:8px}
.sb-group-list{max-height:300px;overflow-y:auto;margin-bottom:12px}
.sb-group-item{padding:12px;border:1px solid #d2d2d7;border-radius:8px;margin-bottom:6px;cursor:pointer;transition:background .1s}
.sb-group-item:active,.sb-group-item.selected{background:#0071e3;color:#fff;border-color:#0071e3}
.sb-or{text-align:center;color:#86868b;font-size:13px;margin:8px 0}
.sb-dropzone{border:2px dashed #d2d2d7;border-radius:12px;padding:40px 16px;text-align:center;color:#86868b;cursor:pointer;transition:border-color .15s}
.sb-dropzone:active{border-color:#0071e3;color:#0071e3}
.sb-dropzone.uploading{border-color:#34c759;background:#f0faf3;color:#1d7a3b;cursor:default}
.sb-progress{height:6px;background:#e8e8ed;border-radius:3px;margin-top:12px;overflow:hidden}
.sb-progress-bar{height:100%;background:#0071e3;transition:width .3s}
.sb-file-count{font-size:14px;color:#86868b;margin-top:8px}
.sb-done{text-align:center;padding:20px 0}
.sb-done .icon{font-size:48px;margin-bottom:8px}
.sb-done p{font-size:15px;color:#1d1d1f;margin-bottom:16px}
.sb-error{background:#fef0f0;color:#d70015;padding:10px;border-radius:8px;font-size:13px;margin-bottom:12px;text-align:center}
.sb-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1d1d1f;color:#fff;padding:10px 24px;border-radius:20px;font-size:14px;z-index:100;animation:sb-fadein .2s}
@keyframes sb-fadein{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.hidden{display:none}
.sb-install-banner{background:#0071e3;color:#fff;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;text-align:center;cursor:pointer}
</style>
</head>
<body>
<div class="sb-app" id="app">
  <div class="sb-logo">
    <h1>SnapBaton</h1>
    <p>写真・動画アップロード</p>
  </div>

  <!-- Step 1: パスコード -->
  <div id="step-auth" class="sb-card">
    <h2>パスコードを入力</h2>
    <div class="sb-passcode" id="passcode-inputs">
      <input type="tel" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
      <input type="tel" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
      <input type="tel" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
      <input type="tel" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off">
    </div>
    <div id="auth-error" class="sb-error hidden"></div>
    <button class="sb-btn sb-btn-primary" id="btn-auth" disabled>ログイン</button>
  </div>

  <!-- Step 2: グループ選択 -->
  <div id="step-group" class="sb-card hidden">
    <h2>アップロード先を選択</h2>
    <div class="sb-group-list" id="group-list"></div>
    <div class="sb-or">— または —</div>
    <input type="text" class="sb-input" id="new-group-name" placeholder="新しいグループ名を入力">
    <button class="sb-btn sb-btn-primary" id="btn-next" disabled>次へ</button>
  </div>

  <!-- Step 3: アップロード -->
  <div id="step-upload" class="sb-card hidden">
    <h2 id="upload-group-name"></h2>
    <input type="file" id="file-input" accept="image/jpeg,image/png,image/gif,image/webp,video/*" multiple style="display:none">
    <div class="sb-dropzone" id="dropzone">
      📷 タップして写真・動画を選択
    </div>
    <div id="upload-status" class="hidden">
      <div class="sb-progress"><div class="sb-progress-bar" id="progress-bar"></div></div>
      <p class="sb-file-count" id="file-count"></p>
    </div>
  </div>

  <!-- Step 4: 完了 -->
  <div id="step-done" class="sb-card hidden">
    <div class="sb-done">
      <div class="icon">✅</div>
      <p id="done-message"></p>
      <button class="sb-btn sb-btn-primary" id="btn-more">続けてアップロード</button>
      <button class="sb-btn sb-btn-secondary" id="btn-restart">グループを変更</button>
    </div>
  </div>
</div>

<script>
(function() {
  const API = '{$api_base}';
  let token = sessionStorage.getItem('sb_token') || '';
  let selectedGroupId = null;
  let selectedGroupName = '';

  const steps = {
    auth: document.getElementById('step-auth'),
    group: document.getElementById('step-group'),
    upload: document.getElementById('step-upload'),
    done: document.getElementById('step-done'),
  };

  function showStep(name) {
    Object.values(steps).forEach(s => s.classList.add('hidden'));
    steps[name].classList.remove('hidden');
  }

  // 既にトークンがあればスキップ
  if (token) {
    fetch(API + '/upload-groups', { headers: { 'X-Upload-Token': token } })
      .then(r => { if (r.ok) { loadGroups(); showStep('group'); } else { token = ''; sessionStorage.removeItem('sb_token'); } })
      .catch(() => {});
  }

  // === パスコード入力 ===
  const pcInputs = document.querySelectorAll('#passcode-inputs input');
  const btnAuth = document.getElementById('btn-auth');
  const authError = document.getElementById('auth-error');

  pcInputs.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      if (inp.value && i < 3) pcInputs[i + 1].focus();
      const code = Array.from(pcInputs).map(x => x.value).join('');
      btnAuth.disabled = code.length < 4;
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !inp.value && i > 0) pcInputs[i - 1].focus();
    });
  });

  btnAuth.addEventListener('click', async () => {
    const code = Array.from(pcInputs).map(x => x.value).join('');
    btnAuth.disabled = true;
    authError.classList.add('hidden');
    try {
      const res = await fetch(API + '/upload-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'エラー');
      token = data.token;
      sessionStorage.setItem('sb_token', token);
      loadGroups();
      showStep('group');
    } catch (err) {
      authError.textContent = err.message;
      authError.classList.remove('hidden');
      btnAuth.disabled = false;
    }
  });

  // === グループ選択 ===
  const groupList = document.getElementById('group-list');
  const newGroupInput = document.getElementById('new-group-name');
  const btnNext = document.getElementById('btn-next');

  async function loadGroups() {
    const res = await fetch(API + '/upload-groups', { headers: { 'X-Upload-Token': token } });
    const groups = await res.json();
    groupList.innerHTML = '';
    groups.forEach(g => {
      const div = document.createElement('div');
      div.className = 'sb-group-item';
      div.textContent = g.name;
      div.addEventListener('click', () => {
        document.querySelectorAll('.sb-group-item').forEach(x => x.classList.remove('selected'));
        div.classList.add('selected');
        selectedGroupId = g.id;
        selectedGroupName = g.name;
        newGroupInput.value = '';
        btnNext.disabled = false;
      });
      groupList.appendChild(div);
    });
  }

  newGroupInput.addEventListener('input', () => {
    if (newGroupInput.value.trim()) {
      document.querySelectorAll('.sb-group-item').forEach(x => x.classList.remove('selected'));
      selectedGroupId = null;
      selectedGroupName = '';
      btnNext.disabled = false;
    } else if (!selectedGroupId) {
      btnNext.disabled = true;
    }
  });

  btnNext.addEventListener('click', async () => {
    btnNext.disabled = true;
    if (!selectedGroupId && newGroupInput.value.trim()) {
      const res = await fetch(API + '/upload-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Upload-Token': token },
        body: JSON.stringify({ name: newGroupInput.value.trim() }),
      });
      const data = await res.json();
      selectedGroupId = data.id;
      selectedGroupName = data.name;
    }
    document.getElementById('upload-group-name').textContent = selectedGroupName + ' にアップロード';
    showStep('upload');
    btnNext.disabled = false;
  });

  // === アップロード ===
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const uploadStatus = document.getElementById('upload-status');
  const progressBar = document.getElementById('progress-bar');
  const fileCount = document.getElementById('file-count');

  dropzone.addEventListener('click', () => {
    if (!dropzone.classList.contains('uploading')) fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) uploadFiles(fileInput.files);
  });

  async function uploadFiles(files) {
    const arr = Array.from(files);
    dropzone.classList.add('uploading');
    dropzone.textContent = 'アップロード中...';
    uploadStatus.classList.remove('hidden');

    let done = 0;
    for (const file of arr) {
      const fd = new FormData();
      fd.append('file', file);
      await fetch(API + '/upload-files/' + selectedGroupId, {
        method: 'POST',
        headers: { 'X-Upload-Token': token },
        body: fd,
      });
      done++;
      progressBar.style.width = (done / arr.length * 100) + '%';
      fileCount.textContent = done + ' / ' + arr.length + ' 完了';
    }

    dropzone.classList.remove('uploading');
    document.getElementById('done-message').textContent = arr.length + '件のファイルをアップロードしました';
    showStep('done');
    fileInput.value = '';
    uploadStatus.classList.add('hidden');
    progressBar.style.width = '0';
  }

  // === 完了 ===
  document.getElementById('btn-more').addEventListener('click', () => {
    showStep('upload');
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    selectedGroupId = null;
    selectedGroupName = '';
    loadGroups();
    showStep('group');
  });
})();
</script>
</body>
</html>
HTML;

		$response = new \WP_REST_Response( null );
		$response->set_headers( [ 'Content-Type' => 'text/html; charset=UTF-8' ] );
		// WP REST API はJSONを返そうとするので、直接出力してexit
		header( 'Content-Type: text/html; charset=UTF-8' );
		echo $html;
		exit;
	}
}
