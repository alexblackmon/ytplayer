// Helper functions to convert between MM:SS format and seconds
function timeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 1) {
    return parseInt(parts[0]);
  }
  return 0;
}

function secondsToTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Define your playlist here - now using MM:SS format like YouTube
const playlist = [
  { videoId: "w4WiXKGCJhg", startTime: "0:00", endTime: "22:41" },
  { videoId: "QrR_gm6RqCo", startTime: "0:00", endTime: "16:40" },
  { videoId: "fOAIrUZbOwo", startTime: "0:00", endTime: "21:48" },
  { videoId: "I067BonnW48", startTime: "0:00", endTime: "19:13" },
  { videoId: "BEoGvTlJMyY", startTime: "0:00", endTime: "25:42" },
  { videoId: "j82L3pLjb_0", startTime: "0:00", endTime: "17:54" },
  { videoId: "_t-nRXwAL1k", startTime: "0:00", endTime: "12:25" },
  { videoId: "-91vymvIH0c", startTime: "0:00", endTime: "23:17" },
  { videoId: "jmh3iruf4RA", startTime: "0:00", endTime: "17:25" },
  { videoId: "FvVnP8G6ITs", startTime: "0:00", endTime: "28:40" },
  { videoId: "N1w-hDiJ4dM", startTime: "0:00", endTime: "19:15" },
  { videoId: "ouuPSxE1hK4", startTime: "0:00", endTime: "33:13" },
  { videoId: "ferZnZ0_rSM", startTime: "0:00", endTime: "15:15" },
  { videoId: "zhVgbZdMdb0", startTime: "0:00", endTime: "10:22" },
  { videoId: "oLgZo6Qi3Uo", startTime: "0:00", endTime: "14:33" }
  // Add more clips as needed
];

let player;
let currentClip = 0;
let endTimeout = null;
let isPaused = false;
let isStarted = false;
let progressInterval = null;
let currentClipStartSeconds = 0;
let currentClipEndSeconds = 0;
let videoTitles = {}; // Cache for video titles
let titleFetchQueue = []; // Queue for fetching titles

// Function to fetch video titles using oEmbed API (no API key required)
async function fetchVideoTitles() {
  console.log('Fetching video titles...');
  
  // Initialize with default titles
  playlist.forEach((clip, index) => {
    videoTitles[clip.videoId] = `Video ${index + 1}`;
  });
  
  updatePlaylistModal();
  updatePlaylistInfo();
  
  // Fetch titles for all videos using oEmbed API
  for (let i = 0; i < playlist.length; i++) {
    const clip = playlist[i];
    await fetchVideoTitle(clip.videoId, i);
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Function to fetch individual video title
async function fetchVideoTitle(videoId, index) {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.title) {
        videoTitles[videoId] = data.title;
        console.log(`Fetched title for ${videoId}: ${data.title}`);
        updatePlaylistModal();
        updatePlaylistInfo();
      }
    }
  } catch (error) {
    console.log(`Could not fetch title for ${videoId}:`, error.message);
  }
}

// Function to update video title when a video loads (backup method)
function updateVideoTitle(videoId, title) {
  if (title && title !== '') {
    videoTitles[videoId] = title;
    updatePlaylistModal();
    updatePlaylistInfo();
  }
}

// Called by the YouTube IFrame API when ready
function onYouTubeIframeAPIReady() {
  console.log('YouTube IFrame API ready');
  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
    playerVars: {
      'playsinline': 1,
      'rel': 0,
      'showinfo': 0,
      'controls': 0,
      'modestbranding': 1,
      'autoplay': 0 // Don't autoplay initially
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError
    }
  });
  
  // Fetch video titles after API is ready
  fetchVideoTitles();
}

function onPlayerReady() {
  console.log('Player ready');
  // Don't auto-start, wait for user interaction
}

function startPlaylist() {
  if (!isStarted) {
    isStarted = true;
    document.getElementById('start-overlay').style.display = 'none';
    playClip(currentClip);
  }
}

function onPlayerError(event) {
  console.error('YouTube player error:', event.data);
  const errorMessages = {
    2: 'Invalid video ID',
    5: 'HTML5 player error',
    100: 'Video not found',
    101: 'Video not embeddable',
    150: 'Video not embeddable'
  };
  const errorMsg = errorMessages[event.data] || 'Unknown error';
  console.error('Error details:', errorMsg);
  
  // Try to load the next video if there's an error
  setTimeout(() => {
    if (currentClip < playlist.length - 1) {
      console.log('Trying next video due to error');
      nextClip();
    }
  }, 2000);
}

function playClip(index) {
  const clip = playlist[index];
  if (!clip) return;
  
  console.log('Loading clip:', index, clip);
  
  currentClipStartSeconds = timeToSeconds(clip.startTime);
  currentClipEndSeconds = timeToSeconds(clip.endTime);
  
  console.log('Time range:', clip.startTime, 'to', clip.endTime, '(', currentClipStartSeconds, 'to', currentClipEndSeconds, 'seconds)');
  
  player.loadVideoById({
    videoId: clip.videoId,
    startSeconds: currentClipStartSeconds,
    endSeconds: currentClipEndSeconds
  });
  
  // Start playing immediately after loading
  setTimeout(() => {
    if (player && player.playVideo) {
      player.playVideo();
    }
  }, 1000);
  
  // Fallback: forcibly stop at endSeconds in case YT API doesn't
  if (endTimeout) clearTimeout(endTimeout);
  const duration = (currentClipEndSeconds - currentClipStartSeconds) * 1000;
  endTimeout = setTimeout(() => {
    if (!isPaused) {
      nextClip();
    }
  }, duration);
  
  updateControls(index);
  updatePlaylistModal();
  updatePlaylistInfo();
  startProgressTracking();
  
  // Try to get video title from player as backup (only works for current video)
  setTimeout(() => {
    if (player && player.getVideoData) {
      const videoData = player.getVideoData();
      if (videoData && videoData.title) {
        updateVideoTitle(clip.videoId, videoData.title);
      }
    }
  }, 2000);
}

function startProgressTracking() {
  // Clear any existing interval
  if (progressInterval) {
    clearInterval(progressInterval);
  }
  
  // Update progress every 100ms
  progressInterval = setInterval(() => {
    if (player && player.getCurrentTime) {
      const currentTime = player.getCurrentTime();
      const clipDuration = currentClipEndSeconds - currentClipStartSeconds;
      const clipProgress = currentTime - currentClipStartSeconds;
      
      if (clipProgress >= 0 && clipDuration > 0) {
        const progressPercent = (clipProgress / clipDuration) * 100;
        document.getElementById('progress-fill').style.width = Math.min(progressPercent, 100) + '%';
        
        const currentTimeFormatted = secondsToTime(Math.floor(currentTime));
        const totalTimeFormatted = secondsToTime(currentClipEndSeconds);
        document.getElementById('progress-time').textContent = `${currentTimeFormatted} / ${totalTimeFormatted}`;
      }
    }
  }, 100);
}

function stopProgressTracking() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function seekToPosition(event) {
  if (!player || !player.seekTo) return;
  
  const progressBar = document.getElementById('progress-bar');
  const rect = progressBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const progressPercent = (clickX / rect.width) * 100;
  
  const clipDuration = currentClipEndSeconds - currentClipStartSeconds;
  const seekSeconds = currentClipStartSeconds + (clipDuration * progressPercent / 100);
  
  player.seekTo(seekSeconds);
}

function onPlayerStateChange(event) {
  console.log('Player state changed:', event.data);
  if (event.data === YT.PlayerState.ENDED && !isPaused) {
    nextClip();
  } else if (event.data === YT.PlayerState.PAUSED) {
    stopProgressTracking();
  } else if (event.data === YT.PlayerState.PLAYING) {
    startProgressTracking();
  }
}

function nextClip() {
  stopProgressTracking();
  if (currentClip < playlist.length - 1) {
    currentClip++;
    playClip(currentClip);
  } else {
    // Optionally loop: currentClip = 0; playClip(currentClip);
    document.getElementById('playlist-info').textContent = 'Playlist finished!';
  }
}

function prevClip() {
  stopProgressTracking();
  if (currentClip > 0) {
    currentClip--;
    playClip(currentClip);
  }
}

function togglePlayPause() {
  if (isPaused) {
    player.playVideo();
    isPaused = false;
    document.getElementById('play-pause-btn').textContent = '⏸ Pause';
  } else {
    player.pauseVideo();
    isPaused = true;
    document.getElementById('play-pause-btn').textContent = '▶ Play';
  }
}

function updateControls(index) {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === playlist.length - 1;
}

function updatePlaylistInfo() {
  const playlistInfo = document.getElementById('playlist-info');
  const clip = playlist[currentClip];
  if (clip) {
    const title = videoTitles[clip.videoId] || `Clip ${currentClip + 1}`;
    playlistInfo.textContent = `${title} (${currentClip + 1}/${playlist.length})`;
  }
}

function showPlaylist() {
  const modal = document.getElementById('playlist-modal');
  const itemsContainer = document.getElementById('playlist-items');
  
  itemsContainer.innerHTML = '';
  playlist.forEach((clip, index) => {
    const item = document.createElement('div');
    item.className = `playlist-item ${index === currentClip ? 'active' : ''}`;
    const title = videoTitles[clip.videoId] || `Clip ${index + 1}`;
    item.innerHTML = `
      <strong>${title}</strong><br>
      <small>Video ID: ${clip.videoId}</small><br>
      <small>Time: ${clip.startTime} - ${clip.endTime}</small>
    `;
    item.onclick = () => {
      currentClip = index;
      playClip(currentClip);
      hidePlaylist();
    };
    itemsContainer.appendChild(item);
  });
  
  modal.style.display = 'block';
}

function hidePlaylist() {
  document.getElementById('playlist-modal').style.display = 'none';
}

function updatePlaylistModal() {
  // Update active state in playlist modal if it's open
  const modal = document.getElementById('playlist-modal');
  if (modal.style.display === 'block') {
    showPlaylist(); // Refresh the modal
  }
}

// Expose functions to the window for button onclick
window.prevClip = prevClip;
window.nextClip = nextClip;
window.togglePlayPause = togglePlayPause;
window.showPlaylist = showPlaylist;
window.hidePlaylist = hidePlaylist;
window.startPlaylist = startPlaylist;

// Add progress bar click event
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('progress-bar').addEventListener('click', seekToPosition);
});

// Close modal when clicking outside
document.addEventListener('click', function(event) {
  const modal = document.getElementById('playlist-modal');
  const modalContent = document.querySelector('.playlist-content');
  
  if (event.target === modal) {
    hidePlaylist();
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
  switch(event.key) {
    case ' ':
      event.preventDefault();
      togglePlayPause();
      break;
    case 'ArrowLeft':
      prevClip();
      break;
    case 'ArrowRight':
      nextClip();
      break;
    case 'Escape':
      hidePlaylist();
      break;
  }
}); 