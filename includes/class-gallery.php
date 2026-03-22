<?php

namespace SnapBaton;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Gallery {

	public static function init(): void {
		add_shortcode( 'snapbaton_gallery', [ self::class, 'render_shortcode' ] );
	}

	public static function render_shortcode( $atts ): string {
		$atts = shortcode_atts( [
			'group_id'         => '',
			'columns'          => 3,
			'contact_url'      => '',
			'show_description' => 'true',
		], $atts, 'snapbaton_gallery' );

		global $wpdb;
		$prefix = $wpdb->prefix . 'snapbaton_';

		// 公開グループを取得
		$where = "g.deleted_at IS NULL AND g.is_public = 1";
		if ( ! empty( $atts['group_id'] ) ) {
			$group_ids = array_map( 'absint', explode( ',', $atts['group_id'] ) );
			$placeholders = implode( ',', array_fill( 0, count( $group_ids ), '%d' ) );
			$where .= $wpdb->prepare( " AND g.id IN ($placeholders)", ...$group_ids );
		}

		$groups = $wpdb->get_results(
			"SELECT g.* FROM {$prefix}groups g WHERE {$where} ORDER BY g.created_at DESC"
		);

		if ( empty( $groups ) ) {
			return '<p style="text-align:center;color:#999;">表示できるギャラリーがありません。</p>';
		}

		// 全グループの画像とタグを取得
		$group_ids_list = implode( ',', array_map( function( $g ) { return (int) $g->id; }, $groups ) );

		$images = $wpdb->get_results(
			"SELECT i.*, g.name AS group_name
			 FROM {$prefix}images i
			 INNER JOIN {$prefix}groups g ON i.group_id = g.id
			 WHERE i.group_id IN ($group_ids_list) AND i.deleted_at IS NULL
			 ORDER BY i.group_id, i.sort_order ASC"
		);

		// タグ取得（グループ＋画像）
		$all_tags = [];
		$group_tags_map = [];
		$image_tags_map = [];

		$group_tags = $wpdb->get_results(
			"SELECT gt.group_id, t.name FROM {$prefix}group_tags gt
			 INNER JOIN {$prefix}tags t ON gt.tag_id = t.id
			 WHERE gt.group_id IN ($group_ids_list)"
		);
		foreach ( $group_tags as $gt ) {
			$group_tags_map[ $gt->group_id ][] = $gt->name;
			$all_tags[ $gt->name ] = true;
		}

		if ( ! empty( $images ) ) {
			$image_ids_list = implode( ',', array_map( function( $i ) { return (int) $i->id; }, $images ) );
			$img_tags = $wpdb->get_results(
				"SELECT it.image_id, t.name FROM {$prefix}image_tags it
				 INNER JOIN {$prefix}tags t ON it.tag_id = t.id
				 WHERE it.image_id IN ($image_ids_list)"
			);
			foreach ( $img_tags as $it ) {
				$image_tags_map[ $it->image_id ][] = $it->name;
				$all_tags[ $it->name ] = true;
			}
		}

		$all_tags = array_keys( $all_tags );
		sort( $all_tags );

		$columns   = max( 1, min( 6, (int) $atts['columns'] ) );
		$show_desc = $atts['show_description'] !== 'false';
		$uid       = 'sbg-' . wp_unique_id();

		// HTML生成
		ob_start();

		self::render_styles( $columns );
		?>
		<div class="sb-gallery" id="<?php echo esc_attr( $uid ); ?>">
			<?php if ( count( $all_tags ) > 1 ) : ?>
			<div class="sb-gallery-filters">
				<button class="sb-filter-btn active" data-tag="all">すべて</button>
				<?php foreach ( $all_tags as $tag ) : ?>
				<button class="sb-filter-btn" data-tag="<?php echo esc_attr( $tag ); ?>"><?php echo esc_html( $tag ); ?></button>
				<?php endforeach; ?>
			</div>
			<?php endif; ?>

			<div class="sb-gallery-grid">
			<?php
			$images_by_group = [];
			foreach ( $images as $img ) {
				$images_by_group[ $img->group_id ][] = $img;
			}

			foreach ( $groups as $group ) :
				$g_images = $images_by_group[ $group->id ] ?? [];
				if ( empty( $g_images ) ) continue;

				$g_tags = $group_tags_map[ $group->id ] ?? [];
				$g_tags_json = esc_attr( implode( ',', $g_tags ) );
			?>
				<?php if ( $show_desc ) : ?>
				<div class="sb-gallery-group-header" data-tags="<?php echo $g_tags_json; ?>">
					<h3><?php echo esc_html( $group->name ); ?></h3>
					<?php if ( $group->description ) : ?>
					<p><?php echo esc_html( $group->description ); ?></p>
					<?php endif; ?>
					<?php if ( ! empty( $g_tags ) ) : ?>
					<div class="sb-gallery-tags">
						<?php foreach ( $g_tags as $t ) : ?>
						<span class="sb-gallery-tag"><?php echo esc_html( $t ); ?></span>
						<?php endforeach; ?>
					</div>
					<?php endif; ?>
				</div>
				<?php endif; ?>

				<?php foreach ( $g_images as $img ) :
					$thumb_url = wp_get_attachment_image_url( $img->attachment_id, 'medium_large' );
					$full_url  = wp_get_attachment_url( $img->attachment_id );
					$alt       = $img->title ?: $group->name;
					$i_tags    = $image_tags_map[ $img->id ] ?? [];
					$combined  = array_unique( array_merge( $g_tags, $i_tags ) );
					$tags_attr = esc_attr( implode( ',', $combined ) );
					$is_video  = str_starts_with( get_post_mime_type( $img->attachment_id ) ?: '', 'video/' );
				?>
				<div class="sb-gallery-item" data-tags="<?php echo $tags_attr; ?>">
					<?php if ( $is_video ) : ?>
					<video src="<?php echo esc_url( $full_url ); ?>" muted playsinline preload="metadata"
						class="sb-gallery-media" data-full="<?php echo esc_url( $full_url ); ?>"
						data-title="<?php echo esc_attr( $img->title ); ?>"
						data-desc="<?php echo esc_attr( $img->description ); ?>"
						data-type="video"></video>
					<?php else : ?>
					<img src="<?php echo esc_url( $thumb_url ); ?>"
						alt="<?php echo esc_attr( $alt ); ?>"
						loading="lazy"
						class="sb-gallery-media"
						data-full="<?php echo esc_url( $full_url ); ?>"
						data-title="<?php echo esc_attr( $img->title ); ?>"
						data-desc="<?php echo esc_attr( $img->description ); ?>"
						data-type="image">
					<?php endif; ?>
				</div>
				<?php endforeach; ?>
			<?php endforeach; ?>
			</div>

			<?php if ( ! empty( $atts['contact_url'] ) ) : ?>
			<div class="sb-gallery-cta">
				<a href="<?php echo esc_url( $atts['contact_url'] ); ?>" class="sb-gallery-contact-btn">
					この施工について問い合わせる
				</a>
			</div>
			<?php endif; ?>
		</div>

		<!-- ライトボックス -->
		<div class="sb-lightbox" id="<?php echo esc_attr( $uid ); ?>-lb" style="display:none">
			<button class="sb-lb-close">&times;</button>
			<button class="sb-lb-prev">&lsaquo;</button>
			<button class="sb-lb-next">&rsaquo;</button>
			<div class="sb-lb-scroll">
				<div class="sb-lb-content">
					<img class="sb-lb-img" src="" alt="">
					<video class="sb-lb-video" src="" controls style="display:none"></video>
				</div>
				<div class="sb-lb-info">
					<h4 class="sb-lb-title"></h4>
					<p class="sb-lb-desc"></p>
				</div>
			</div>
		</div>

		<?php
		self::render_script( $uid );

		return ob_get_clean();
	}

	private static function render_styles( int $columns ): void {
		static $rendered = false;
		if ( $rendered ) return;
		$rendered = true;
		?>
		<style>
		.sb-gallery{max-width:1200px;margin:0 auto;padding:0 16px}
		.sb-gallery-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:24px;justify-content:center}
		.sb-filter-btn{background:#f0f0f1;border:1px solid #d2d2d7;border-radius:20px;padding:6px 16px;font-size:13px;cursor:pointer;transition:all .15s;color:#333}
		.sb-filter-btn:hover,.sb-filter-btn.active{background:#1d1d1f;color:#fff;border-color:#1d1d1f}
		.sb-gallery-grid{columns:<?php echo $columns; ?>;column-gap:12px}
		.sb-gallery-item{break-inside:avoid;margin-bottom:12px;border-radius:8px;overflow:hidden;cursor:pointer;position:relative}
		.sb-gallery-item img,.sb-gallery-item video{width:100%;display:block;transition:transform .3s}
		.sb-gallery-item:hover img,.sb-gallery-item:hover video{transform:scale(1.03)}
		.sb-gallery-item[style*="display: none"]{display:none!important}
		.sb-gallery-group-header{column-span:all;padding:20px 0 8px;border-bottom:1px solid #e0e0e0;margin-bottom:16px}
		.sb-gallery-group-header h3{font-size:20px;margin:0 0 4px;color:#1d1d1f}
		.sb-gallery-group-header p{margin:0 0 8px;color:#666;font-size:14px;line-height:1.5}
		.sb-gallery-tags{display:flex;gap:4px;flex-wrap:wrap}
		.sb-gallery-tag{background:#e7f1fd;color:#2271b1;padding:2px 10px;border-radius:12px;font-size:11px}
		.sb-gallery-cta{text-align:center;padding:32px 0}
		.sb-gallery-contact-btn{display:inline-block;background:#1d1d1f;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;transition:opacity .15s}
		.sb-gallery-contact-btn:hover{opacity:.8;color:#fff}
		/* ライトボックス */
		.sb-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:999999;overflow-y:auto;-webkit-overflow-scrolling:touch}
		.sb-lb-close{position:fixed;top:12px;right:16px;background:rgba(0,0,0,.5);border:none;color:#fff;font-size:32px;cursor:pointer;z-index:10;line-height:1;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center}
		.sb-lb-prev,.sb-lb-next{position:fixed;top:45%;transform:translateY(-50%);background:rgba(255,255,255,.12);border:none;color:#fff;font-size:28px;cursor:pointer;width:44px;height:44px;border-radius:50%;z-index:10}
		.sb-lb-prev{left:12px}
		.sb-lb-next{right:12px}
		.sb-lb-prev:hover,.sb-lb-next:hover{background:rgba(255,255,255,.25)}
		.sb-lb-scroll{display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:20px 16px 60px}
		.sb-lb-content{display:flex;align-items:center;justify-content:center;width:90vw;min-height:85vh}
		.sb-lb-img,.sb-lb-video{max-width:90vw;max-height:85vh;object-fit:contain;border-radius:4px;display:block}
		.sb-lb-info{text-align:center;padding:20px 24px 0;max-width:700px;width:100%}
		.sb-lb-title{color:#fff;font-size:18px;font-weight:600;margin:0 0 8px;line-height:1.4}
		.sb-lb-desc{color:#aaa;font-size:14px;margin:0;line-height:1.7;white-space:pre-wrap}
		@media(max-width:768px){
			.sb-gallery-grid{columns:2}
			.sb-lb-prev,.sb-lb-next{width:36px;height:36px;font-size:22px}
			.sb-lb-content{width:96vw}
			.sb-lb-img,.sb-lb-video{max-width:96vw}
		}
		@media(max-width:480px){
			.sb-gallery-grid{columns:2}
		}
		</style>
		<?php
	}

	private static function render_script( string $uid ): void {
		?>
		<script>
		(function(){
			var gal=document.getElementById('<?php echo $uid; ?>');
			var lb=document.getElementById('<?php echo $uid; ?>-lb');
			if(!gal||!lb)return;

			// フィルタ
			var btns=gal.querySelectorAll('.sb-filter-btn');
			btns.forEach(function(b){
				b.addEventListener('click',function(){
					btns.forEach(function(x){x.classList.remove('active')});
					b.classList.add('active');
					var tag=b.getAttribute('data-tag');
					var items=gal.querySelectorAll('.sb-gallery-item,.sb-gallery-group-header');
					items.forEach(function(el){
						if(tag==='all'){el.style.display='';return}
						var t=(el.getAttribute('data-tags')||'').split(',');
						el.style.display=t.indexOf(tag)>=0?'':'none';
					});
				});
			});

			// ライトボックス
			var mediaEls=gal.querySelectorAll('.sb-gallery-media');
			var items=Array.from(mediaEls);
			var cur=0;
			var lbImg=lb.querySelector('.sb-lb-img');
			var lbVid=lb.querySelector('.sb-lb-video');
			var lbTitle=lb.querySelector('.sb-lb-title');
			var lbDesc=lb.querySelector('.sb-lb-desc');

			function show(i){
				cur=i;
				var el=items[i];if(!el)return;
				var type=el.getAttribute('data-type');
				if(type==='video'){
					lbImg.style.display='none';
					lbVid.style.display='block';
					lbVid.src=el.getAttribute('data-full');
				}else{
					lbVid.style.display='none';lbVid.pause();
					lbImg.style.display='block';
					lbImg.src=el.getAttribute('data-full');
					lbImg.alt=el.getAttribute('data-title')||'';
				}
				lbTitle.textContent=el.getAttribute('data-title')||'';
				lbDesc.textContent=el.getAttribute('data-desc')||'';
				lb.style.display='flex';
				document.body.style.overflow='hidden';
			}
			function hide(){lb.style.display='none';document.body.style.overflow='';lbVid.pause();lbVid.src=''}
			function prev(){var v=items.filter(function(x){return x.offsetParent!==null});cur=(v.indexOf(items[cur])-1+v.length)%v.length;cur=items.indexOf(v[cur]);show(cur)}
			function next(){var v=items.filter(function(x){return x.offsetParent!==null});cur=(v.indexOf(items[cur])+1)%v.length;cur=items.indexOf(v[cur]);show(cur)}

			items.forEach(function(el,i){
				el.parentElement.addEventListener('click',function(){show(i)});
			});
			lb.querySelector('.sb-lb-close').addEventListener('click',hide);
			lb.querySelector('.sb-lb-prev').addEventListener('click',prev);
			lb.querySelector('.sb-lb-next').addEventListener('click',next);
			lb.addEventListener('click',function(e){if(e.target===lb||e.target.classList.contains('sb-lb-scroll'))hide()});
			document.addEventListener('keydown',function(e){
				if(lb.style.display==='none')return;
				if(e.key==='Escape')hide();
				if(e.key==='ArrowLeft')prev();
				if(e.key==='ArrowRight')next();
			});

			// スワイプ
			var sx=0;
			lb.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});
			lb.addEventListener('touchend',function(e){
				var dx=e.changedTouches[0].clientX-sx;
				if(Math.abs(dx)>50){dx>0?prev():next()}
			});
		})();
		</script>
		<?php
	}
}
