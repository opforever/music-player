import React, { useState, useRef, useEffect } from 'react';

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const audioRef = useRef(null);

  // Load tracks from Pastebin
  useEffect(() => {
    const fetchMusicList = async () => {
      try {
        // Using a CORS proxy to bypass browser restrictions
        const corsProxy = 'https://api.allorigins.win/get?url=';
        const pastebinUrl = encodeURIComponent('https://pastebin.pl/view/raw/1026d78b');
        
        const response = await fetch(corsProxy + pastebinUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const text = data.contents;
        
        // Check if we got valid content
        if (!text || text.includes('404') || text.includes('Not Found')) {
          throw new Error('Music list not found at source');
        }
        
        const lines = text.split('\n').filter(line => line.trim().startsWith('https://'));
        
        if (lines.length === 0) {
          throw new Error('No valid music links found in the file');
        }
        
        // Process the links into track objects
        const newTracks = lines.map((line, index) => {
          // Extract URL and title from the line
          const urlMatch = line.match(/(https:\/\/audio\.jukehost\.co\.uk\/[^\s]+)/);
          const titleMatch = line.match(/\(([\s\S]*)\)/); // Capture everything between outermost parentheses
          
          return {
            id: index,
            url: urlMatch ? urlMatch[1] : line.trim(),
            title: titleMatch?.[1]?.trim() || 'Unknown Title'
          };
        });
        
        setTracks(newTracks);
        setIsLoading(false);
        
        if (newTracks.length > 0) {
          setSelectedTrack(newTracks[0]);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(`Failed to load music list. ${retryCount < 3 ? 'Retrying...' : 'Please check connection or source URL'}`);
        setIsLoading(false);
        
        // Attempt to retry 3 times with exponential backoff
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            fetchMusicList();
          }, Math.pow(2, retryCount) * 1000);
        }
      }
    };

    fetchMusicList();
  }, []);

  // Play/pause toggle
  const togglePlayPause = () => {
    if (!selectedTrack) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle track selection
  const handleTrackSelect = (track) => {
    setSelectedTrack(track);
    setIsPlaying(true);
  };

  // Load selected track into audio element
  useEffect(() => {
    if (!selectedTrack || !audioRef.current) return;
    
    audioRef.current.src = selectedTrack.url;
    audioRef.current.volume = volume;
    
    // Load the track and set duration
    audioRef.current.onloadedmetadata = () => {
      setDuration(audioRef.current.duration);
    };
    
    if (isPlaying) {
      audioRef.current.play();
    }
  }, [selectedTrack]);

  // Update current time when playing
  useEffect(() => {
    if (!audioRef.current) return;
    
    const interval = setInterval(() => {
      if (isPlaying && audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Format time display
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // Handle seek bar change
  const handleSeekBarChange = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Skip backward
  const skipBackward = () => {
    if (audioRef.current && currentTime >= 10) {
      const newTime = Math.max(0, currentTime - 10);
      setCurrentTime(newTime);
      audioRef.current.currentTime = newTime;
    }
  };

  // Skip forward
  const skipForward = () => {
    if (audioRef.current && currentTime + 10 < duration) {
      const newTime = currentTime + 10;
      setCurrentTime(newTime);
      audioRef.current.currentTime = newTime;
    }
  };

  // Handle next track
  const nextTrack = () => {
    if (tracks.length === 0 || !selectedTrack) return;
    
    const currentIndex = tracks.findIndex(track => track.id === selectedTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    handleTrackSelect(tracks[nextIndex]);
  };

  // Handle previous track
  const prevTrack = () => {
    if (tracks.length === 0 || !selectedTrack) return;
    
    const currentIndex = tracks.findIndex(track => track.id === selectedTrack.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    handleTrackSelect(tracks[prevIndex]);
  };

  // Handle audio ended event
  useEffect(() => {
    const handleAudioEnd = () => {
      nextTrack();
    };

    if (audioRef.current) {
      audioRef.current.addEventListener('ended', handleAudioEnd);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleAudioEnd);
      }
    };
  }, [tracks, selectedTrack]);

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <audio ref={audioRef} />

      {/* Hero Section */}
      <header className="py-16 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Harmony Music Player
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
          A beautiful music player with tracks from a shared playlist
        </p>
        
        {isLoading && (
          <div className="flex justify-center">
            <div className="px-6 py-3 bg-gray-800/50 backdrop-blur-sm rounded-full text-white font-medium text-lg flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading music list...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 text-red-400 text-sm text-center p-4 bg-red-900/20 rounded-lg max-w-md mx-auto">
            <p>{error}</p>
            <p className="mt-2 text-xs text-red-300">
              {error.includes('CORS') && (
                <>Check browser console for CORS errors - consider self-hosting music list for production</>
              )}
            </p>
          </div>
        )}
      </header>

      {/* Track List */}
      <main className="px-4 sm:px-6 lg:px-8 pb-24">
        {isLoading ? null : tracks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => handleTrackSelect(track)}
                className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 cursor-pointer transition-all duration-300 ${
                  selectedTrack?.id === track.id 
                    ? 'ring-2 ring-purple-500 transform scale-105' 
                    : 'hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    {selectedTrack?.id === track.id && isPlaying ? (
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center animate-pulse">
                        <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="6" y="4" width="4" height="16" rx="2" fill="currentColor" />
                          <rect x="14" y="4" width="4" height="16" rx="2" fill="currentColor" />
                        </svg>
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gray-700 flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 10V14M12 10V14M6 10V14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isLoading && (
            <div className="text-center py-16">
              <svg className="mx-auto h-16 w-16 text-gray-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 19V6.2C9 5.0799 9 4.51986 9.21799 4.09202C9.40973 3.71569 9.71569 3.40973 10.092 3.21799C10.5199 3 11.0799 3 12.2 3H14.8C15.9201 3 16.4802 3 16.908 3.21799C17.2843 3.40973 17.5903 3.71569 17.782 4.09202C18 4.51986 18 5.0799 18 6.2V19M5 19V6.2C5 5.0799 5 4.51986 5.21799 4.09202C5.40973 3.71569 5.71569 3.40973 6.09202 3.21799C6.51986 3 7.0799 3 8.2 3H8.8C9.9201 3 10.4802 3 10.908 3.21799C11.2843 3.40973 11.5903 3.71569 11.782 4.09202C12 4.51986 12 5.0799 12 6.2V19M12 19V12M5 19H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-400">No tracks available</h3>
              <p className="mt-1 text-gray-500">Try refreshing the page or contact the music list administrator</p>
            </div>
          )
        )}
      </main>

      {/* Player Controls */}
      {selectedTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-md border-t border-gray-700 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Track Info */}
            <div className="flex items-center mb-4 md:mb-0 w-full md:w-auto">
              <div className="mr-4">
                <div className="h-16 w-16 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center">
                  <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 10V14M12 10V14M6 10V14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedTrack.title}</p>
              </div>
            </div>

            {/* Player Controls */}
            <div className="w-full md:w-auto">
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-4 mb-2">
                  <button
                    onClick={prevTrack}
                    className="text-gray-400 hover:text-white focus:outline-none focus:text-white transition-colors duration-200"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 7L11 12L19 17V7ZM5 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full p-3 text-white hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 transition-all duration-200"
                  >
                    {isPlaying ? (
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 4L19 12L5 20V4Z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={nextTrack}
                    className="text-gray-400 hover:text-white focus:outline-none focus:text-white transition-colors duration-200"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 7L13 12L5 17V7ZM19 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full flex items-center space-x-2">
                  <span className="text-xs text-gray-400">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeekBarChange}
                    className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <span className="text-xs text-gray-400">{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center mt-4 md:mt-0">
              <button
                onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                className="text-gray-400 hover:text-white mr-2"
              >
                {volume > 0 ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 5L6 9H2V15H6L11 19V5ZM23 9L17 15M17 9L23 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 5L6 9H2V15H6L11 19V5ZM23 9L17 15M17 9L23 15M17 9L23 15M17 15L23 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Skip Buttons */}
      {selectedTrack && (
        <div className="fixed bottom-20 right-4 flex flex-col space-y-2">
          <button
            onClick={skipBackward}
            className="bg-gray-800/80 backdrop-blur-sm p-2 rounded-full text-white hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 transition-all duration-200"
            title="Skip Backward 10s"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 4V20M11 12L19 4M19 20L11 12M5 4V20M5 12L13 4M5 12L13 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={skipForward}
            className="bg-gray-800/80 backdrop-blur-sm p-2 rounded-full text-white hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 transition-all duration-200"
            title="Skip Forward 10s"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 4V20M5 12L13 4M5 12L13 20M19 4V20M19 12L11 4M19 12L11 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
