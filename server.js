const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

// 1. Load the hidden environment variables
require('dotenv').config();

const app = express();
app.use(cors()); // Allows your HTML tracker file to communicate with this app safely
app.use(express.static(__dirname));

// Get a free API Key from Google Developer Console (YouTube Data API v3 enabled)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; 
const youtube = google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY });

// Extracts playlist ID from various YouTube URL types
function extractPlaylistId(url) {
    const reg = /[&?]list=([^#\&\?]+)/;
    const match = url.match(reg);
    return match ? match[1] : null;
}

// Converts ISO 8601 duration (ex: PT1H23M45S) to seconds
function parseISODuration(durationStr) {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = durationStr.match(regex);
    const hours = parseInt(matches[1] || 0, 10);
    const minutes = parseInt(matches[2] || 0, 10);
    const seconds = parseInt(matches[3] || 0, 10);
    return (hours * 3600) + (minutes * 60) + seconds;
}

// Converts total seconds to user-friendly text string
function formatDuration(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hrs > 0) {
        return `${hrs} hr ${mins} min`;
    }
    return `${mins} min`;
}

app.get('/api/playlist', async (req, res) => {
    const playlistUrl = req.query.url;
    const playlistId = extractPlaylistId(playlistUrl);

    if (!playlistId) {
        return res.status(400).json({ error: 'Invalid Playlist URL format.' });
    }

    try {
        // 1. Fetch Playlist Title details
        const playlistInfo = await youtube.playlists.list({
            part: 'snippet',
            id: playlistId
        });
        const title = playlistInfo.data.items[0]?.snippet?.title || "Imported YouTube Playlist";

        // 2. Fetch all item titles inside the playlist (handles pagination up to several items)
        let videos = [];
        let videoIds = [];
        let nextPageToken = null;

        do {
            const itemsRes = await youtube.playlistItems.list({
                part: 'snippet,contentDetails',
                playlistId: playlistId,
                maxResults: 50,
                pageToken: nextPageToken
            });

            itemsRes.data.items.forEach(item => {
                if(item.snippet.title !== "Private video" && item.snippet.title !== "Deleted video") {
                    videos.push(item.snippet.title);
                    videoIds.push(item.contentDetails.videoId);
                }
            });
            nextPageToken = itemsRes.data.nextPageToken;
        } while (nextPageToken);

        // 3. Fetch specific durations for aggregated videos (Batches of 50 chunks max allowed by YouTube API)
        let totalSeconds = 0;
        for (let i = 0; i < videoIds.length; i += 50) {
            const batch = videoIds.slice(i, i + 50).join(',');
            const videoDetails = await youtube.videos.list({
                part: 'contentDetails',
                id: batch
            });
            videoDetails.data.items.forEach(v => {
                totalSeconds += parseISODuration(v.contentDetails.duration);
            });
        }

        // Return compiled asset payload directly to client-side tracker
        res.json({
            title,
            videos,
            totalDuration: formatDuration(totalSeconds)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed retrieving playlist fields.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Study Tracker server running on port ${PORT}`));
