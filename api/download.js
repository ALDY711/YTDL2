// File: api/download.js
// Endpoint ini menangani proses streaming file dari YouTube ke pengguna.

const ytdl = require('ytdl-core');

// Fungsi untuk membersihkan nama file dari karakter yang tidak valid
const sanitizeFilename = (name) => {
    return name.replace(/[\/\\?%*:|"<>]/g, '-');
};

module.exports = async (req, res) => {
    // Mengizinkan request dari semua origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { url, itag, type, title } = req.query;

        if (!url || !ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'URL tidak valid.' });
        }
        if (!itag) {
            return res.status(400).json({ error: 'itag (kualitas) diperlukan.' });
        }

        const cleanTitle = sanitizeFilename(title || 'video');
        const fileExtension = type === 'audio' ? 'mp3' : 'mp4';
        const filename = `${cleanTitle}.${fileExtension}`;

        // Set header agar browser menganggap ini sebagai file unduhan
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

        const info = await ytdl.getInfo(url);
        const format = info.formats.find(f => f.itag == itag);
        if (format && format.contentLength) {
            res.setHeader('Content-Length', format.contentLength);
        }

        // Mulai streaming dari ytdl ke response
        ytdl(url, {
            quality: itag,
        }).pipe(res).on('error', (err) => {
            console.error('Streaming error:', err);
            // Jika terjadi error saat streaming, coba kirim response error
            if (!res.headersSent) {
                res.status(500).json({ error: 'Gagal mengunduh file.' });
            }
        });

    } catch (error) {
        console.error('Download Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Terjadi kesalahan internal saat memproses unduhan.' });
        }
    }
};
  
