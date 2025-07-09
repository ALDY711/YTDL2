// File: api/getInfo.js
// Endpoint ini bertugas mengambil informasi detail dari URL YouTube.

const ytdl = require('ytdl-core');

// Fungsi untuk memformat byte menjadi ukuran yang lebih mudah dibaca (KB, MB, GB)
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = async (req, res) => {
    // Mengizinkan request dari semua origin (penting untuk Vercel)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Menangani pre-flight request dari browser
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { url } = req.body;

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'URL YouTube tidak valid.' });
    }

    try {
        const info = await ytdl.getInfo(url);
        const { videoDetails } = info;

        // Filter untuk mendapatkan format video dengan audio
        const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio')
            .filter(f => f.container === 'mp4' && f.qualityLabel) // Hanya MP4 dengan label kualitas
            .map(format => ({
                itag: format.itag,
                qualityLabel: format.qualityLabel,
                container: format.container,
                sizeMB: format.contentLength ? (format.contentLength / 1024 / 1024).toFixed(2) : 'N/A',
                contentLength: format.contentLength
            }));

        // Filter untuk mendapatkan format audio terbaik
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        const bestAudio = audioFormats.length > 0 ? audioFormats.sort((a, b) => b.audioBitrate - a.audioBitrate)[0] : null;

        const responseData = {
            title: videoDetails.title,
            thumbnailUrl: videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url, // Ambil thumbnail kualitas tertinggi
            videoFormats: videoFormats,
            audioFormat: bestAudio ? {
                itag: bestAudio.itag,
                mimeType: bestAudio.mimeType,
                sizeFormatted: bestAudio.contentLength ? formatBytes(bestAudio.contentLength) : 'N/A',
                contentLength: bestAudio.contentLength
            } : null,
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error('YTDL Error:', error);
        res.status(500).json({ error: 'Gagal mengambil informasi video. Video mungkin dibatasi atau tidak tersedia.' });
    }
};
