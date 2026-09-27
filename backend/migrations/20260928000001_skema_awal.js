/**
 * Skema awal — 15 tabel sesuai PRD §11.1.
 *
 * Catatan zona waktu: seluruh kolom waktu disimpan sebagai DATETIME tanpa konversi
 * otomatis oleh MySQL. Aplikasi yang menetapkan UTC+7 (SRS §2.5) agar tidak ada
 * pergeseran ganda antara koneksi dan server basis data.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  // ─── User ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable('User', (t) => {
    t.bigIncrements('user_id').primary();
    t.string('nama', 100).notNullable();
    t.string('email', 150).notNullable().unique();
    t.string('nomor_telepon', 20).notNullable();
    t.string('password_hash', 255).notNullable();
    t.enu('role', ['PELANGGAN', 'PETUGAS', 'ADMIN'], {
      useNative: true,
      enumName: 'user_role',
    }).notNullable().defaultTo('PELANGGAN');
    t.enu('status_verifikasi', ['BELUM_VERIFIKASI', 'AKTIF'], {
      useNative: true,
      enumName: 'user_status_verifikasi',
    }).notNullable().defaultTo('BELUM_VERIFIKASI');
    t.integer('failed_login_count').notNullable().defaultTo(0);
    t.dateTime('last_failed_login_at').nullable();
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    t.index(['role'], 'idx_user_role');
    t.index(['status_verifikasi'], 'idx_user_status_verifikasi');
  });

  // ─── Category ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('Category', (t) => {
    t.bigIncrements('category_id').primary();
    t.string('nama', 100).notNullable().unique();
    t.text('deskripsi').nullable();
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ─── Item ──────────────────────────────────────────────────────────────────
  // status_kondisi memakai nilai PRD §11.1 (FR-018), BUKAN nama di constants/index.js
  // yang memuat nilai tambahan untuk checklist. Lihat catatan di repository.
  await knex.schema.createTable('Item', (t) => {
    t.bigIncrements('item_id').primary();
    t.string('kode_barang', 30).notNullable().unique();
    t.string('nama', 150).notNullable();
    t.bigInteger('category_id').unsigned().notNullable()
      .references('category_id').inTable('Category').onUpdate('CASCADE').onDelete('RESTRICT');
    t.string('merk', 100).nullable();
    t.integer('stok_fisik').notNullable().defaultTo(0);
    t.integer('stok_minimum').notNullable().defaultTo(1);
    t.decimal('tarif_harian', 12, 2).notNullable();
    t.enu('status_kondisi', ['TERSEDIA', 'SEDANG_DISEWA', 'RUSAK', 'HILANG'], {
      useNative: true,
      enumName: 'item_status_kondisi',
    }).notNullable().defaultTo('TERSEDIA');
    // ADR-05 — soft delete: riwayat pesanan lama harus tetap utuh.
    t.boolean('is_aktif').notNullable().defaultTo(true);
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    t.index(['category_id'], 'idx_item_category');
    t.index(['is_aktif', 'status_kondisi'], 'idx_item_aktif_kondisi');
  });

  // ─── ItemMedia ─────────────────────────────────────────────────────────────
  // ADR-13: url menunjuk ke object storage, bukan berkas lokal.
  await knex.schema.createTable('ItemMedia', (t) => {
    t.bigIncrements('media_id').primary();
    t.bigInteger('item_id').unsigned().notNullable()
      .references('item_id').inTable('Item').onUpdate('CASCADE').onDelete('CASCADE');
    t.enu('tipe', ['FOTO', 'VIDEO'], { useNative: true, enumName: 'media_tipe' }).notNullable();
    t.string('url', 500).notNullable();
    t.integer('urutan').notNullable().defaultTo(0);

    t.index(['item_id', 'urutan'], 'idx_media_item_urutan');
  });

  // ─── Bundle ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('Bundle', (t) => {
    t.bigIncrements('bundle_id').primary();
    t.string('nama', 150).notNullable();
    t.text('deskripsi').nullable();
    t.decimal('harga_bundle', 12, 2).notNullable();
    t.boolean('is_aktif').notNullable().defaultTo(true);
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // ─── BundleItem ────────────────────────────────────────────────────────────
  await knex.schema.createTable('BundleItem', (t) => {
    t.bigIncrements('bundle_item_id').primary();
    t.bigInteger('bundle_id').unsigned().notNullable()
      .references('bundle_id').inTable('Bundle').onUpdate('CASCADE').onDelete('CASCADE');
    t.bigInteger('item_id').unsigned().notNullable()
      .references('item_id').inTable('Item').onUpdate('CASCADE').onDelete('RESTRICT');
    t.integer('kuantitas').notNullable().defaultTo(1);

    t.unique(['bundle_id', 'item_id'], { indexName: 'uq_bundle_item' });
  });

  // ─── Order ─────────────────────────────────────────────────────────────────
  await knex.schema.createTable('Order', (t) => {
    t.bigIncrements('order_id').primary();
    t.string('kode_pesanan', 30).notNullable().unique();
    t.bigInteger('user_id').unsigned().notNullable()
      .references('user_id').inTable('User').onUpdate('CASCADE').onDelete('RESTRICT');
    t.date('tanggal_mulai').notNullable();
    t.date('tanggal_selesai').notNullable();
    t.enu(
      'status',
      [
        'MENUNGGU_PEMBAYARAN',
        'DIBAYAR',
        'DISIAPKAN',
        'SEDANG_DISEWA',
        'DIKEMBALIKAN',
        'SELESAI',
        'GAGAL_KEDALUWARSA',
        'DIBATALKAN',
      ],
      { useNative: true, enumName: 'order_status' }
    ).notNullable().defaultTo('MENUNGGU_PEMBAYARAN');
    t.decimal('total_sewa', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_biaya_tambahan', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_akhir', 12, 2).notNullable().defaultTo(0);
    t.dateTime('batas_pembayaran').notNullable();
    t.text('catatan').nullable();
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indeks untuk riwayat pelanggan & dashboard admin.
    t.index(['user_id', 'status'], 'idx_order_user_status');
    // Indeks untuk scheduler auto-cancel (REQ-4.4.3).
    t.index(['status', 'batas_pembayaran'], 'idx_order_status_batas');
    t.index(['tanggal_mulai', 'tanggal_selesai'], 'idx_order_rentang');
  });

  // ─── OrderItem ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('OrderItem', (t) => {
    t.bigIncrements('order_item_id').primary();
    t.bigInteger('order_id').unsigned().notNullable()
      .references('order_id').inTable('Order').onUpdate('CASCADE').onDelete('CASCADE');
    t.enu('tipe', ['ITEM', 'BUNDLE'], { useNative: true, enumName: 'order_item_tipe' }).notNullable();
    t.bigInteger('item_id').unsigned().nullable()
      .references('item_id').inTable('Item').onUpdate('CASCADE').onDelete('RESTRICT');
    t.bigInteger('bundle_id').unsigned().nullable()
      .references('bundle_id').inTable('Bundle').onUpdate('CASCADE').onDelete('RESTRICT');
    t.integer('kuantitas').notNullable().defaultTo(1);
    // Snapshot harga — ADR-04. Tanpa ini, mengubah tarif akan mengubah nilai pesanan lama.
    t.decimal('harga_satuan_snapshot', 12, 2).notNullable();
    t.decimal('subtotal', 12, 2).notNullable();
    t.string('nama_snapshot', 150).notNullable();

    t.index(['order_id'], 'idx_order_item_order');
  });

  // ─── StockReservation ──────────────────────────────────────────────────────
  // ADR-03: untuk bundle, dibuat SATU BARIS PER KOMPONEN item satuan (REQ-4.3.7),
  // bukan satu baris per bundle. Inilah yang membuat ketersediaan dapat dihitung
  // di level item.
  await knex.schema.createTable('StockReservation', (t) => {
    t.bigIncrements('reservation_id').primary();
    t.bigInteger('order_id').unsigned().notNullable()
      .references('order_id').inTable('Order').onUpdate('CASCADE').onDelete('CASCADE');
    t.bigInteger('item_id').unsigned().notNullable()
      .references('item_id').inTable('Item').onUpdate('CASCADE').onDelete('RESTRICT');
    t.integer('kuantitas').notNullable().defaultTo(1);
    t.date('tanggal_mulai').notNullable();
    t.date('tanggal_selesai').notNullable();
    t.enu('status', ['AKTIF', 'DILEPAS', 'TERPAKAI'], {
      useNative: true,
      enumName: 'reservation_status',
    }).notNullable().defaultTo('AKTIF');
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    // ⚠ INDEKS PALING KRITIS DI SELURUH SISTEM.
    // Availability Engine memakai kolom-kolom ini untuk menghitung irisan rentang
    // pada setiap pencarian katalog dan setiap checkout (ADR-02, ADR-10).
    t.index(['item_id', 'status', 'tanggal_mulai', 'tanggal_selesai'], 'idx_reservasi_availability');
    t.index(['order_id'], 'idx_reservasi_order');
  });

  // ─── Payment ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('Payment', (t) => {
    t.bigIncrements('payment_id').primary();
    t.bigInteger('order_id').unsigned().notNullable()
      .references('order_id').inTable('Order').onUpdate('CASCADE').onDelete('CASCADE');
    t.string('metode', 50).notNullable();
    t.enu('status', ['PENDING', 'SUKSES', 'GAGAL', 'KEDALUWARSA'], {
      useNative: true,
      enumName: 'payment_status',
    }).notNullable().defaultTo('PENDING');
    t.decimal('nominal', 12, 2).notNullable();
    // Adr-11 / FR-034: idempotensi webhook. Unik agar notifikasi ganda tidak
    // menghasilkan dua catatan pembayaran.
    t.string('referensi_gateway', 100).nullable().unique();
    t.text('payload_gateway').nullable();
    t.dateTime('waktu').notNullable().defaultTo(knex.fn.now());
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['order_id', 'status'], 'idx_payment_order_status');
  });

  // ─── ChecklistRecord ───────────────────────────────────────────────────────
  await knex.schema.createTable('ChecklistRecord', (t) => {
    t.bigIncrements('checklist_id').primary();
    t.bigInteger('order_id').unsigned().notNullable()
      .references('order_id').inTable('Order').onUpdate('CASCADE').onDelete('CASCADE');
    t.enu('tipe', ['SERAH_TERIMA', 'PENGEMBALIAN'], {
      useNative: true,
      enumName: 'checklist_tipe',
    }).notNullable();
    t.bigInteger('petugas_id').unsigned().notNullable()
      .references('user_id').inTable('User').onUpdate('CASCADE').onDelete('RESTRICT');
    t.dateTime('waktu_aktual').notNullable();
    t.text('catatan').nullable();
    t.string('foto_url', 500).nullable();
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['order_id', 'tipe'], 'idx_checklist_order_tipe');
  });

  // ─── ChecklistItem ─────────────────────────────────────────────────────────
  await knex.schema.createTable('ChecklistItem', (t) => {
    t.bigIncrements('checklist_item_id').primary();
    t.bigInteger('checklist_id').unsigned().notNullable()
      .references('checklist_id').inTable('ChecklistRecord').onUpdate('CASCADE').onDelete('CASCADE');
    t.bigInteger('item_id').unsigned().notNullable()
      .references('item_id').inTable('Item').onUpdate('CASCADE').onDelete('RESTRICT');
    t.integer('kuantitas').notNullable().defaultTo(1);
    t.enu('kondisi', ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT', 'HILANG'], {
      useNative: true,
      enumName: 'checklist_item_kondisi',
    }).notNullable().defaultTo('BAIK');
    t.boolean('kelengkapan').notNullable().defaultTo(true);
    t.text('catatan').nullable();

    t.index(['checklist_id'], 'idx_checklist_item_checklist');
  });

  // ─── PenaltyRate ───────────────────────────────────────────────────────────
  // Ditulis SEBELUM Penalty agar FK dari Penalty (bila ditambahkan kelak) tersedia.
  await knex.schema.createTable('PenaltyRate', (t) => {
    t.bigIncrements('rate_id').primary();
    t.enu('tipe', ['DENDA_PER_JAM', 'DENDA_PER_HARI', 'GANTI_RUGI_DEFAULT'], {
      useNative: true,
      enumName: 'penalty_rate_tipe',
    }).notNullable();
    t.decimal('nominal', 12, 2).notNullable();
    // Nullable = berlaku sebagai tarif default untuk semua alat.
    t.bigInteger('item_id').unsigned().nullable()
      .references('item_id').inTable('Item').onUpdate('CASCADE').onDelete('CASCADE');
    t.bigInteger('diatur_oleh').unsigned().nullable()
      .references('user_id').inTable('User').onUpdate('CASCADE').onDelete('SET NULL');
    t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    t.index(['tipe', 'item_id'], 'idx_penalty_rate_tipe_item');
  });

  // ─── Penalty ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('Penalty', (t) => {
    t.bigIncrements('penalty_id').primary();
    t.bigInteger('order_id').unsigned().notNullable()
      .references('order_id').inTable('Order').onUpdate('CASCADE').onDelete('CASCADE');
    t.enu('tipe', ['DENDA_KETERLAMBATAN', 'GANTI_RUGI'], {
      useNative: true,
      enumName: 'penalty_tipe',
    }).notNullable();
    t.integer('durasi_terlambat_menit').nullable();
    t.decimal('nominal', 12, 2).notNullable();
    t.bigInteger('item_id').unsigned().nullable()
      .references('item_id').inTable('Item').onUpdate('CASCADE').onDelete('SET NULL');
    t.bigInteger('disesuaikan_oleh').unsigned().nullable()
      .references('user_id').inTable('User').onUpdate('CASCADE').onDelete('SET NULL');
    t.text('alasan_penyesuaian').nullable();
    t.enu('status_pelunasan', ['BELUM_LUNAS', 'LUNAS'], {
      useNative: true,
      enumName: 'penalty_status_pelunasan',
    }).notNullable().defaultTo('BELUM_LUNAS');
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    t.index(['order_id', 'status_pelunasan'], 'idx_penalty_order_pelunasan');
  });

  // ─── AuditLog ──────────────────────────────────────────────────────────────
  // Append-only: aplikasi tidak pernah menjalankan UPDATE atau DELETE pada tabel ini.
  await knex.schema.createTable('AuditLog', (t) => {
    t.bigIncrements('log_id').primary();
    t.bigInteger('aktor_id').unsigned().nullable()
      .references('user_id').inTable('User').onUpdate('CASCADE').onDelete('SET NULL');
    t.string('aksi', 60).notNullable();
    t.string('entity', 60).notNullable();
    t.string('entity_id', 60).notNullable();
    t.json('nilai_lama').nullable();
    t.json('nilai_baru').nullable();
    t.string('keterangan', 500).nullable();
    t.string('ip_address', 45).nullable();
    t.dateTime('waktu').notNullable().defaultTo(knex.fn.now());

    t.index(['entity', 'entity_id', 'waktu'], 'idx_audit_entity_waktu');
    t.index(['aktor_id', 'waktu'], 'idx_audit_aktor_waktu');
    t.index(['aksi', 'waktu'], 'idx_audit_aksi_waktu');
  });

  // ─── NotificationLog ───────────────────────────────────────────────────────
  await knex.schema.createTable('NotificationLog', (t) => {
    t.bigIncrements('notif_id').primary();
    t.bigInteger('user_id').unsigned().nullable()
      .references('user_id').inTable('User').onUpdate('CASCADE').onDelete('SET NULL');
    t.string('jenis', 60).notNullable();
    t.string('kanal', 30).notNullable().defaultTo('EMAIL');
    t.string('tujuan', 150).nullable();
    t.enu('status_kirim', ['MENUNGGU', 'TERKIRIM', 'GAGAL'], {
      useNative: true,
      enumName: 'notif_status_kirim',
    }).notNullable().defaultTo('MENUNGGU');
    t.string('pesan_galat', 500).nullable();
    t.dateTime('waktu').notNullable().defaultTo(knex.fn.now());

    t.index(['user_id', 'waktu'], 'idx_notif_user_waktu');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  // Urutan dibalik untuk menghormati foreign key.
  await knex.schema.dropTableIfExists('NotificationLog');
  await knex.schema.dropTableIfExists('AuditLog');
  await knex.schema.dropTableIfExists('Penalty');
  await knex.schema.dropTableIfExists('PenaltyRate');
  await knex.schema.dropTableIfExists('ChecklistItem');
  await knex.schema.dropTableIfExists('ChecklistRecord');
  await knex.schema.dropTableIfExists('Payment');
  await knex.schema.dropTableIfExists('StockReservation');
  await knex.schema.dropTableIfExists('OrderItem');
  await knex.schema.dropTableIfExists('Order');
  await knex.schema.dropTableIfExists('BundleItem');
  await knex.schema.dropTableIfExists('Bundle');
  await knex.schema.dropTableIfExists('ItemMedia');
  await knex.schema.dropTableIfExists('Item');
  await knex.schema.dropTableIfExists('Category');
  await knex.schema.dropTableIfExists('User');
};
